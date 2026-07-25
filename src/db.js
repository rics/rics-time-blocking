import Dexie from 'dexie';
import { appError } from './app-error.js';

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
    throw appError('error.database.migrationConflict');
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
    throw appError('error.project.invalidColor');
  }
  return value.toUpperCase();
}

function validDate(value, errorCode) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw appError(errorCode);
  return date;
}

async function listEventsForTask(task) {
  const [linkedEvents, legacyEvents] = await Promise.all([
    db.events.where('taskId').equals(Number(task.id)).toArray(),
    db.events
      .where('title')
      .equals(task.title)
      .filter((event) => event.taskId == null)
      .toArray()
  ]);
  const eventsById = new Map(
    [...linkedEvents, ...legacyEvents].map((event) => [Number(event.id), event])
  );
  return Array.from(eventsById.values());
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
    throw appError('error.task.titleRequired');
  }

  const duplicate = await db.tasks
    .filter((task) => task.title.toLocaleLowerCase('pt-BR') === normalized.toLocaleLowerCase('pt-BR'))
    .first();

  if (duplicate) {
    throw appError('error.task.duplicate');
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
    throw appError('error.task.titleRequired');
  }

  if (
    !Number.isFinite(start.getTime()) ||
    !Number.isFinite(end.getTime()) ||
    end <= start
  ) {
    throw appError('error.block.invalidPeriod');
  }

  return db.transaction('rw', db.tasks, db.events, async () => {
    const duplicate = await db.tasks
      .filter(
        (task) => task.title.toLocaleLowerCase('pt-BR') === normalized.toLocaleLowerCase('pt-BR')
      )
      .first();

    if (duplicate) {
      throw appError('error.task.duplicate');
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
    const relatedEvents = await listEventsForTask(task);
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

export async function listEventsInRange(start, end) {
  const rangeStart = validDate(start, 'error.range.invalidStart');
  const rangeEnd = validDate(end, 'error.range.invalidEnd');
  if (rangeEnd <= rangeStart) throw appError('error.range.invalid');

  const startTime = rangeStart.getTime();
  const endTime = rangeEnd.getTime();
  const startIso = rangeStart.toISOString();
  const endIso = rangeEnd.toISOString();
  const [startsBeforeEnd, endsAfterStart] = await Promise.all([
    db.events.where('start').below(endIso).count(),
    db.events.where('end').above(startIso).count()
  ]);

  if (startsBeforeEnd <= endsAfterStart) {
    return db.events
      .where('start')
      .below(endIso)
      .filter((event) => new Date(event.end).getTime() > startTime)
      .toArray();
  }

  return db.events
    .where('end')
    .above(startIso)
    .filter((event) => new Date(event.start).getTime() < endTime)
    .toArray();
}

export async function getDatabaseStats() {
  const [taskCount, eventCount, oldestEvent, newestEvent] = await Promise.all([
    db.tasks.count(),
    db.events.count(),
    db.events.orderBy('start').first(),
    db.events.orderBy('end').last()
  ]);

  return {
    taskCount,
    eventCount,
    oldestEventStart: oldestEvent?.start ?? null,
    newestEventEnd: newestEvent?.end ?? null
  };
}

export async function countHistoricalEvents(cutoff) {
  const cutoffDate = validDate(cutoff, 'error.history.invalidCutoff');
  return db.events.where('end').below(cutoffDate.toISOString()).count();
}

export async function deleteHistoricalEvents(cutoff) {
  const cutoffDate = validDate(cutoff, 'error.history.invalidCutoff');
  const cutoffIso = cutoffDate.toISOString();

  return db.transaction('rw', db.events, async () => {
    const ids = await db.events.where('end').below(cutoffIso).primaryKeys();
    await db.events.bulkDelete(ids);
    return ids.length;
  });
}

export async function listProjects() {
  return db.projects.orderBy('createdAt').toArray();
}

export async function addProject(name, color) {
  const normalizedName = normalizeTitle(name);

  if (!normalizedName) {
    throw appError('error.project.nameRequired');
  }

  const duplicate = await db.projects
    .filter(
      (project) =>
        project.name.toLocaleLowerCase('pt-BR') === normalizedName.toLocaleLowerCase('pt-BR')
    )
    .first();

  if (duplicate) {
    throw appError('error.project.duplicate');
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
  if (!current) throw appError('error.project.missing');

  const normalizedName = normalizeTitle(name);
  if (!normalizedName) throw appError('error.project.nameRequired');

  const duplicate = await db.projects
    .filter(
      (project) =>
        Number(project.id) !== projectId &&
        project.name.toLocaleLowerCase('pt-BR') === normalizedName.toLocaleLowerCase('pt-BR')
    )
    .first();

  if (duplicate) throw appError('error.project.duplicate');

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
    if (!project) throw appError('error.project.missing');

    const [tasks, events] = await Promise.all([
      db.tasks.where('projectId').equals(projectId).toArray(),
      db.events.where('projectId').equals(projectId).toArray()
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
  if (!task) throw appError('error.task.missing');

  const normalizedProjectId = projectId == null || projectId === '' ? null : Number(projectId);
  if (normalizedProjectId != null) {
    const project = await db.projects.get(normalizedProjectId);
    if (!project) throw appError('error.project.missing');
  }

  await db.tasks.update(id, { projectId: normalizedProjectId });
  await db.events.where('taskId').equals(id).modify({ projectId: normalizedProjectId });
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
    throw appError('error.integration.incomplete');
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
    throw appError('error.sync.prepare');
  }

  const normalizedTasks = externalTasks.map((task) => {
    const title = normalizeTitle(task.title);
    const externalKey = String(task.externalKey ?? '').trim();

    if (!title || !externalKey) {
      throw appError('error.sync.invalidTask');
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
      throw appError('error.sync.duplicateTask');
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
            .where('taskId')
            .equals(Number(current.id))
            .filter(
              (event) =>
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
      const relatedEvents = await listEventsForTask(task);
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
