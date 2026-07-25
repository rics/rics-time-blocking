import { db, getAllData } from './db.js';

const BACKUP_FORMAT = 'rics-time-blocking-backup';
const LEGACY_BACKUP_FORMAT = 'bloco-backup';
const BACKUP_VERSION = 4;
const SUPPORTED_BACKUP_VERSIONS = new Set([1, 2, 3, BACKUP_VERSION]);

function isValidDate(value) {
  return typeof value === 'string' && Number.isFinite(new Date(value).getTime());
}

function validateBackup(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('O arquivo não contém um backup válido.');
  }

  if (
    ![BACKUP_FORMAT, LEGACY_BACKUP_FORMAT].includes(data.format) ||
    !SUPPORTED_BACKUP_VERSIONS.has(data.version)
  ) {
    throw new Error('Formato ou versão de backup não suportado.');
  }

  if (!Array.isArray(data.tasks) || !Array.isArray(data.events) || !Array.isArray(data.settings)) {
    throw new Error('O backup está incompleto.');
  }

  if (data.version >= 3 && !Array.isArray(data.projects)) {
    throw new Error('O backup está incompleto.');
  }

  const tasksAreValid = data.tasks.every(
    (task) =>
      Number.isInteger(Number(task.id)) &&
      typeof task.title === 'string' &&
      task.title.trim().length > 0 &&
      (!task.source ||
        (['fizzy', 'trello'].includes(task.source) &&
          typeof task.externalId === 'string' &&
          typeof task.externalKey === 'string' &&
          task.externalKey.startsWith(`${task.source}:`)))
  );

  const eventsAreValid = data.events.every(
    (event) =>
      Number.isInteger(Number(event.id)) &&
      typeof event.title === 'string' &&
      isValidDate(event.start) &&
      isValidDate(event.end)
  );

  const settingsAreValid = data.settings.every(
    (setting) => typeof setting?.key === 'string' && 'value' in setting
  );

  const projects = Array.isArray(data.projects) ? data.projects : [];
  const projectsAreValid = projects.every(
    (project) =>
      Number.isInteger(Number(project.id)) &&
      typeof project.name === 'string' &&
      project.name.trim().length > 0 &&
      /^#[0-9a-f]{6}$/i.test(project.color)
  );

  if (!tasksAreValid || !eventsAreValid || !settingsAreValid || !projectsAreValid) {
    throw new Error('O backup contém registros inválidos.');
  }

  return { ...data, projects };
}

export async function exportBackup() {
  const data = await getAllData();
  const payload = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    ...data
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json'
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const date = new Intl.DateTimeFormat('sv-SE').format(new Date());

  link.href = url;
  link.download = `rics-time-blocking-backup-${date}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function importBackup(file, mode = 'merge') {
  if (!['merge', 'replace'].includes(mode)) {
    throw new Error('Modo de importação inválido.');
  }

  let parsed;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    throw new Error('Não foi possível ler o arquivo JSON.');
  }

  const data = validateBackup(parsed);

  await db.transaction('rw', db.tasks, db.events, db.settings, db.projects, async () => {
    if (mode === 'replace') {
      await Promise.all([
        db.tasks.clear(),
        db.events.clear(),
        db.settings.clear(),
        db.projects.clear()
      ]);
    }

    await db.tasks.bulkPut(data.tasks);
    await db.events.bulkPut(data.events);
    await db.settings.bulkPut(data.settings);
    await db.projects.bulkPut(data.projects);
  });

  return {
    taskCount: data.tasks.length,
    eventCount: data.events.length,
    projectCount: data.projects.length,
    mode
  };
}
