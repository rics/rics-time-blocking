import Dexie from 'dexie';

const DATABASE_NAME = 'ricsTimeBlocking';
const LEGACY_DATABASE_NAME = 'blocoCalendar';
const DATABASE_NAME_MIGRATION_KEY = 'migration.databaseName.ricsTimeBlocking';

function defineSchema(database) {
  database.version(1).stores({
    tasks: '++id,&title,createdAt',
    events: '++id,taskId,title,start,end,calendarId,createdAt',
    settings: '&key'
  });

  database.version(2).stores({
    tasks: '++id,title,createdAt,source,&externalKey',
    events: '++id,taskId,title,start,end,calendarId,createdAt',
    settings: '&key',
    integrations: '&id'
  });

  database.version(3).stores({
    tasks: '++id,title,createdAt,source,&externalKey,projectId',
    events: '++id,taskId,title,start,end,calendarId,createdAt,projectId',
    settings: '&key',
    integrations: '&id',
    projects: '++id,&name,createdAt'
  });

  return database;
}

export const db = defineSchema(new Dexie(DATABASE_NAME));

async function deleteLegacyDatabase() {
  if (await Dexie.exists(LEGACY_DATABASE_NAME)) {
    const deletion = Dexie.delete(LEGACY_DATABASE_NAME).catch(() => undefined);
    await Promise.race([
      deletion,
      new Promise((resolve) => setTimeout(resolve, 750))
    ]);
  }
}

export async function prepareDatabase() {
  await db.open();
  const completedMigration = await db.settings.get(DATABASE_NAME_MIGRATION_KEY);

  if (completedMigration) {
    await deleteLegacyDatabase();
    return { migrated: false };
  }

  if (!(await Dexie.exists(LEGACY_DATABASE_NAME))) {
    await db.settings.put({
      key: DATABASE_NAME_MIGRATION_KEY,
      value: { completedAt: new Date().toISOString(), source: 'fresh' }
    });
    return { migrated: false };
  }

  const targetHasData = await Promise.all([
    db.tasks.count(),
    db.events.count(),
    db.projects.count(),
    db.integrations.count()
  ]);
  if (targetHasData.some(Boolean)) {
    throw new Error(
      'Não foi possível migrar o banco antigo porque o novo banco já contém dados.'
    );
  }

  const legacyDb = defineSchema(new Dexie(LEGACY_DATABASE_NAME));
  await legacyDb.open();

  try {
    const [tasks, events, settings, integrations, projects] = await Promise.all([
      legacyDb.tasks.toArray(),
      legacyDb.events.toArray(),
      legacyDb.settings.toArray(),
      legacyDb.integrations.toArray(),
      legacyDb.projects.toArray()
    ]);

    await db.transaction(
      'rw',
      db.tasks,
      db.events,
      db.settings,
      db.integrations,
      db.projects,
      async () => {
        await db.tasks.bulkPut(tasks);
        await db.events.bulkPut(events);
        await db.settings.bulkPut(settings);
        await db.integrations.bulkPut(integrations);
        await db.projects.bulkPut(projects);
        await db.settings.put({
          key: DATABASE_NAME_MIGRATION_KEY,
          value: {
            completedAt: new Date().toISOString(),
            source: LEGACY_DATABASE_NAME
          }
        });
      }
    );
  } finally {
    legacyDb.close();
  }

  await deleteLegacyDatabase();
  return { migrated: true };
}

export async function resetDatabase() {
  await db.transaction(
    'rw',
    db.tasks,
    db.events,
    db.settings,
    db.integrations,
    db.projects,
    async () => {
      await Promise.all([
        db.tasks.clear(),
        db.events.clear(),
        db.settings.clear(),
        db.integrations.clear(),
        db.projects.clear()
      ]);
      await db.settings.put({
        key: DATABASE_NAME_MIGRATION_KEY,
        value: { completedAt: new Date().toISOString(), source: 'reset' }
      });
    }
  );
  await deleteLegacyDatabase();
}

function normalizeTitle(title) {
  return String(title ?? '').trim().replace(/\s+/g, ' ');
}

function normalizeColor(color) {
  const value = String(color ?? '').trim();
  if (!/^#[0-9a-f]{6}$/i.test(value)) {
    throw new Error('Escolha uma cor válida para o projeto.');
  }
  return value.toUpperCase();
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
    projectId: null,
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
      projectId: null,
      createdAt
    };
    task.id = await db.tasks.add(task);

    const record = {
      taskId: task.id,
      projectId: null,
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

export async function listProjects() {
  return db.projects.orderBy('createdAt').toArray();
}

export async function addProject(name, color) {
  const normalizedName = normalizeTitle(name);

  if (!normalizedName) {
    throw new Error('Digite um nome para o projeto.');
  }

  const duplicate = await db.projects
    .filter(
      (project) =>
        project.name.toLocaleLowerCase('pt-BR') === normalizedName.toLocaleLowerCase('pt-BR')
    )
    .first();

  if (duplicate) {
    throw new Error('Já existe um projeto com esse nome.');
  }

  const project = {
    name: normalizedName,
    color: normalizeColor(color),
    createdAt: new Date().toISOString()
  };
  project.id = await db.projects.add(project);
  return project;
}

export async function updateProject(id, { name, color }) {
  const projectId = Number(id);
  const current = await db.projects.get(projectId);
  if (!current) throw new Error('O projeto selecionado não existe mais.');

  const normalizedName = normalizeTitle(name);
  if (!normalizedName) throw new Error('Digite um nome para o projeto.');

  const duplicate = await db.projects
    .filter(
      (project) =>
        Number(project.id) !== projectId &&
        project.name.toLocaleLowerCase('pt-BR') === normalizedName.toLocaleLowerCase('pt-BR')
    )
    .first();

  if (duplicate) throw new Error('Já existe um projeto com esse nome.');

  await db.projects.update(projectId, {
    name: normalizedName,
    color: normalizeColor(color)
  });
  return db.projects.get(projectId);
}

export async function deleteProject(id) {
  const projectId = Number(id);

  return db.transaction('rw', db.projects, db.tasks, db.events, async () => {
    const project = await db.projects.get(projectId);
    if (!project) throw new Error('O projeto selecionado não existe mais.');

    const [tasks, events] = await Promise.all([
      db.tasks.filter((task) => Number(task.projectId) === projectId).toArray(),
      db.events.filter((event) => Number(event.projectId) === projectId).toArray()
    ]);

    await Promise.all([
      ...tasks.map((task) => db.tasks.update(task.id, { projectId: null })),
      ...events.map((event) => db.events.update(event.id, { projectId: null }))
    ]);
    await db.projects.delete(projectId);
    return { project, taskCount: tasks.length };
  });
}

export async function updateTaskProject(taskId, projectId) {
  const id = Number(taskId);
  const task = await db.tasks.get(id);
  if (!task) throw new Error('A tarefa selecionada não existe mais.');

  const normalizedProjectId = projectId == null || projectId === '' ? null : Number(projectId);
  if (normalizedProjectId != null) {
    const project = await db.projects.get(normalizedProjectId);
    if (!project) throw new Error('O projeto selecionado não existe mais.');
  }

  await db.tasks.update(id, { projectId: normalizedProjectId });
  await db.events
    .filter((event) => Number(event.taskId) === id)
    .modify({ projectId: normalizedProjectId });
  return db.tasks.get(id);
}

export async function addEvent(event) {
  const record = {
    taskId: Number(event.taskId),
    projectId: event.projectId == null ? null : Number(event.projectId),
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
  const [tasks, events, settings, projects] = await Promise.all([
    db.tasks.toArray(),
    db.events.toArray(),
    db.settings.toArray(),
    db.projects.toArray()
  ]);

  return { tasks, events, settings, projects };
}
