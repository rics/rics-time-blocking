import Dexie from 'dexie';

export const db = new Dexie('blocoCalendar');

db.version(1).stores({
  tasks: '++id,&title,createdAt',
  events: '++id,taskId,title,start,end,calendarId,createdAt',
  settings: '&key'
});

db.version(2).stores({
  tasks: '++id,title,createdAt,source,&externalKey',
  events: '++id,taskId,title,start,end,calendarId,createdAt',
  settings: '&key',
  integrations: '&id'
});

function normalizeTitle(title) {
  return String(title ?? '').trim().replace(/\s+/g, ' ');
}

function belongsToTask(event, task) {
  return (
    Number(event.taskId) === Number(task.id) ||
    (event.taskId == null && event.title === task.title)
  );
}

export async function listTasks() {
  return db.tasks.orderBy('createdAt').toArray();
}

export async function getTask(id) {
  return db.tasks.get(Number(id));
}

export async function addTask(title) {
  const normalized = normalizeTitle(title);

  if (!normalized) {
    throw new Error('Digite um título para a tarefa.');
  }

  const duplicate = await db.tasks
    .filter((task) => task.title.toLocaleLowerCase('pt-BR') === normalized.toLocaleLowerCase('pt-BR'))
    .first();

  if (duplicate) {
    throw new Error('Já existe uma tarefa com esse título.');
  }

  const task = {
    title: normalized,
    createdAt: new Date().toISOString()
  };

  task.id = await db.tasks.add(task);
  return task;
}

export async function addTaskWithEvent(title, event) {
  const normalized = normalizeTitle(title);
  const start = new Date(event.start);
  const end = new Date(event.end);

  if (!normalized) {
    throw new Error('Digite um título para a tarefa.');
  }

  if (
    !Number.isFinite(start.getTime()) ||
    !Number.isFinite(end.getTime()) ||
    end <= start
  ) {
    throw new Error('Não foi possível determinar um período válido para o bloco.');
  }

  return db.transaction('rw', db.tasks, db.events, async () => {
    const duplicate = await db.tasks
      .filter(
        (task) => task.title.toLocaleLowerCase('pt-BR') === normalized.toLocaleLowerCase('pt-BR')
      )
      .first();

    if (duplicate) {
      throw new Error('Já existe uma tarefa com esse título.');
    }

    const createdAt = new Date().toISOString();
    const task = {
      title: normalized,
      createdAt
    };
    task.id = await db.tasks.add(task);

    const record = {
      taskId: task.id,
      title: task.title,
      start: start.toISOString(),
      end: end.toISOString(),
      isAllDay: false,
      category: 'time',
      calendarId: event.calendarId || 'work',
      createdAt
    };
    record.id = await db.events.add(record);

    return { task, event: record };
  });
}

export async function countFutureEventsForTask(task) {
  const now = Date.now();
  return db.events
    .filter((event) => {
      return belongsToTask(event, task) && new Date(event.start).getTime() > now;
    })
    .count();
}

export async function deleteTaskAndFutureEvents(task) {
  const now = Date.now();

  return db.transaction('rw', db.tasks, db.events, async () => {
    const relatedEvents = await db.events
      .filter((event) => belongsToTask(event, task))
      .toArray();
    const futureEvents = relatedEvents.filter(
      (event) => new Date(event.start).getTime() > now
    );
    const historyEvents = relatedEvents.filter(
      (event) => new Date(event.start).getTime() <= now
    );

    await db.events.bulkDelete(futureEvents.map((event) => event.id));
    if (task.source) {
      await Promise.all(
        historyEvents.map((event) =>
          db.events.update(event.id, { source: task.source })
        )
      );
    }
    await db.tasks.delete(Number(task.id));

    return futureEvents;
  });
}

export async function listEvents() {
  return db.events.toArray();
}

export async function addEvent(event) {
  const record = {
    taskId: Number(event.taskId),
    title: normalizeTitle(event.title),
    start: new Date(event.start).toISOString(),
    end: new Date(event.end).toISOString(),
    isAllDay: false,
    category: 'time',
    calendarId: event.calendarId || 'work',
    createdAt: event.createdAt || new Date().toISOString()
  };

  if (event.source) record.source = String(event.source);

  record.id = await db.events.add(record);
  return record;
}

export async function updateEvent(id, changes) {
  const serializableChanges = {};

  if (changes.start) serializableChanges.start = new Date(changes.start).toISOString();
  if (changes.end) serializableChanges.end = new Date(changes.end).toISOString();
  if (typeof changes.isAllDay === 'boolean') {
    serializableChanges.isAllDay = false;
    serializableChanges.category = 'time';
  }

  await db.events.update(Number(id), serializableChanges);
  return db.events.get(Number(id));
}

export async function deleteEvent(id) {
  return db.events.delete(Number(id));
}

export async function getSetting(key, fallbackValue) {
  const setting = await db.settings.get(key);
  return setting ? setting.value : fallbackValue;
}

export async function setSetting(key, value) {
  return db.settings.put({ key, value });
}

export async function getIntegration(id) {
  return db.integrations.get(String(id));
}

export async function saveIntegration(integration) {
  if (!integration?.id || typeof integration.accessToken !== 'string') {
    throw new Error('A configuração da integração está incompleta.');
  }

  const record = {
    ...integration,
    id: String(integration.id),
    updatedAt: new Date().toISOString()
  };

  await db.integrations.put(record);
  return record;
}

export async function deleteIntegration(id) {
  return db.integrations.delete(String(id));
}

export async function syncExternalTasks(source, externalTasks) {
  const normalizedSource = String(source ?? '').trim();

  if (!normalizedSource || !Array.isArray(externalTasks)) {
    throw new Error('Não foi possível preparar as tarefas para sincronização.');
  }

  const normalizedTasks = externalTasks.map((task) => {
    const title = normalizeTitle(task.title);
    const externalKey = String(task.externalKey ?? '').trim();

    if (!title || !externalKey) {
      throw new Error('A integração retornou uma tarefa sem identificação ou título.');
    }

    return {
      title,
      externalKey,
      externalId: String(task.externalId ?? ''),
      sourceUrl: typeof task.sourceUrl === 'string' ? task.sourceUrl : '',
      sourceBoardName: normalizeTitle(task.sourceBoardName)
    };
  });

  const duplicateKeys = new Set();
  for (const task of normalizedTasks) {
    if (duplicateKeys.has(task.externalKey)) {
      throw new Error('A integração retornou a mesma tarefa mais de uma vez.');
    }
    duplicateKeys.add(task.externalKey);
  }

  return db.transaction('rw', db.tasks, db.events, async () => {
    const now = Date.now();
    const syncedAt = new Date().toISOString();
    const currentTasks = await db.tasks.where('source').equals(normalizedSource).toArray();
    const currentByKey = new Map(currentTasks.map((task) => [task.externalKey, task]));
    const seenKeys = new Set();
    const result = {
      added: 0,
      updated: 0,
      removed: 0,
      removedFutureEvents: 0
    };

    for (const externalTask of normalizedTasks) {
      seenKeys.add(externalTask.externalKey);
      const current = currentByKey.get(externalTask.externalKey);

      if (!current) {
        await db.tasks.add({
          ...externalTask,
          source: normalizedSource,
          createdAt: syncedAt,
          syncedAt
        });
        result.added += 1;
        continue;
      }

      const titleChanged = current.title !== externalTask.title;
      const metadataChanged =
        current.externalId !== externalTask.externalId ||
        current.sourceUrl !== externalTask.sourceUrl ||
        current.sourceBoardName !== externalTask.sourceBoardName;

      if (titleChanged || metadataChanged) {
        await db.tasks.update(current.id, {
          ...externalTask,
          syncedAt
        });

        if (titleChanged) {
          const futureEvents = await db.events
            .filter(
              (event) =>
                Number(event.taskId) === Number(current.id) &&
                new Date(event.start).getTime() > now
            )
            .toArray();

          await Promise.all(
            futureEvents.map((event) =>
              db.events.update(event.id, { title: externalTask.title })
            )
          );
        }

        result.updated += 1;
      } else {
        await db.tasks.update(current.id, { syncedAt });
      }
    }

    const removedTasks = currentTasks.filter((task) => !seenKeys.has(task.externalKey));

    for (const task of removedTasks) {
      const relatedEvents = await db.events
        .filter((event) => belongsToTask(event, task))
        .toArray();
      const futureEvents = relatedEvents.filter(
        (event) => new Date(event.start).getTime() > now
      );
      const historyEvents = relatedEvents.filter(
        (event) => new Date(event.start).getTime() <= now
      );

      await db.events.bulkDelete(futureEvents.map((event) => event.id));
      await Promise.all(
        historyEvents.map((event) =>
          db.events.update(event.id, { source: normalizedSource })
        )
      );
      await db.tasks.delete(task.id);
      result.removed += 1;
      result.removedFutureEvents += futureEvents.length;
    }

    return result;
  });
}

export async function getAllData() {
  const [tasks, events, settings] = await Promise.all([
    db.tasks.toArray(),
    db.events.toArray(),
    db.settings.toArray()
  ]);

  return { tasks, events, settings };
}
