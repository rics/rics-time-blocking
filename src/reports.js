const UNASSIGNED_PROJECT = '__unassigned__';

function localStartOfDay(value) {
  const [year, month, day] = String(value).split('-').map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

function addDays(date, amount) {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
}

function toDateValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toTimeValue(date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function eventProjectId(event, taskById) {
  return event.projectId ?? taskById.get(Number(event.taskId))?.projectId ?? null;
}

function isProjectSelected(projectId, selectedProjectIds) {
  if (projectId == null) return selectedProjectIds.has(UNASSIGNED_PROJECT);
  return selectedProjectIds.has(String(projectId));
}

function splitEventIntoDays(event, rangeStart, rangeEnd, taskById) {
  const eventStart = new Date(event.start);
  const eventEnd = new Date(event.end);
  const start = new Date(Math.max(eventStart.getTime(), rangeStart.getTime()));
  const end = new Date(Math.min(eventEnd.getTime(), rangeEnd.getTime()));
  const segments = [];

  for (let cursor = start; cursor < end; ) {
    const nextDay = addDays(new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate()), 1);
    const segmentEnd = new Date(Math.min(nextDay.getTime(), end.getTime()));
    const hours = (segmentEnd.getTime() - cursor.getTime()) / 3_600_000;
    const task = taskById.get(Number(event.taskId));

    segments.push({
      taskKey: event.taskId != null ? `task:${event.taskId}` : `event:${event.id}`,
      taskTitle: task?.title || event.title,
      date: toDateValue(cursor),
      start: toTimeValue(cursor),
      end: toTimeValue(segmentEnd),
      hours,
      sortTime: cursor.getTime()
    });
    cursor = segmentEnd;
  }

  return segments;
}

export const REPORT_UNASSIGNED_PROJECT = UNASSIGNED_PROJECT;

export function generateReport({ events, tasks, selectedProjectIds, startDate, endDate, mode }) {
  const rangeStart = localStartOfDay(startDate);
  const rangeEnd = addDays(localStartOfDay(endDate), 1);
  const taskById = new Map(tasks.map((task) => [Number(task.id), task]));
  const selected = new Set(selectedProjectIds.map(String));
  const segments = events
    .filter((event) => {
      const start = new Date(event.start);
      const end = new Date(event.end);
      return (
        Number.isFinite(start.getTime()) &&
        Number.isFinite(end.getTime()) &&
        end > start &&
        start < rangeEnd &&
        end > rangeStart &&
        isProjectSelected(eventProjectId(event, taskById), selected)
      );
    })
    .flatMap((event) => splitEventIntoDays(event, rangeStart, rangeEnd, taskById));

  if (mode === 'detailed') {
    return segments.sort((first, second) => first.sortTime - second.sortTime || first.taskTitle.localeCompare(second.taskTitle, 'pt-BR'));
  }

  const grouped = new Map();
  for (const segment of segments) {
    const current = grouped.get(segment.taskKey);
    if (current) {
      current.hours += segment.hours;
      current.sortTime = Math.min(current.sortTime, segment.sortTime);
    } else {
      grouped.set(segment.taskKey, {
        taskKey: segment.taskKey,
        taskTitle: segment.taskTitle,
        hours: segment.hours,
        sortTime: segment.sortTime
      });
    }
  }

  return Array.from(grouped.values()).sort(
    (first, second) => first.sortTime - second.sortTime || first.taskTitle.localeCompare(second.taskTitle, 'pt-BR')
  );
}

export function formatHours(hours) {
  const totalMinutes = Math.round(hours * 60);
  const wholeHours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (!minutes) return `${wholeHours} h`;
  if (!wholeHours) return `${minutes} min`;
  return `${wholeHours} h ${minutes} min`;
}

function csvEscape(value) {
  const string = String(value ?? '');
  return /[;"\r\n]/.test(string) ? `"${string.replaceAll('"', '""')}"` : string;
}

function csvHours(hours) {
  return Number(hours.toFixed(2)).toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
}

export function reportCsv({ rows, mode }) {
  const headers = mode === 'detailed'
    ? ['Tarefa', 'Data', 'Início', 'Fim', 'Horas']
    : ['Tarefa', 'Total de horas'];
  const values = rows.map((row) =>
    mode === 'detailed'
      ? [row.taskTitle, row.date, row.start, row.end, csvHours(row.hours)]
      : [row.taskTitle, csvHours(row.hours)]
  );

  return `\uFEFF${[headers, ...values].map((row) => row.map(csvEscape).join(';')).join('\r\n')}\r\n`;
}
