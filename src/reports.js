import { normalizeLocale } from './i18n.js';

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

export function generateReport({ events, tasks, selectedProjectIds, startDate, endDate, mode, locale = 'pt-BR' }) {
  const normalizedLocale = normalizeLocale(locale);
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
    return segments.sort((first, second) => first.sortTime - second.sortTime || first.taskTitle.localeCompare(second.taskTitle, normalizedLocale));
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
    (first, second) => first.sortTime - second.sortTime || first.taskTitle.localeCompare(second.taskTitle, normalizedLocale)
  );
}

export function formatHours(hours, locale = 'pt-BR') {
  const totalMinutes = Math.round(hours * 60);
  const wholeHours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (!minutes) return `${wholeHours} h`;
  if (!wholeHours) return `${minutes} min`;
  return `${wholeHours} h ${minutes} min`;
}

function formatHoursLong(hours, locale = 'pt-BR') {
  const normalizedLocale = normalizeLocale(locale);
  const totalMinutes = Math.round(hours * 60);
  const wholeHours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const hoursLabel = normalizedLocale === 'en'
    ? `${wholeHours} ${wholeHours === 1 ? 'hour' : 'hours'}`
    : `${wholeHours} ${wholeHours === 1 ? 'hora' : 'horas'}`;
  const minutesLabel = normalizedLocale === 'en'
    ? `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`
    : `${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`;

  if (!minutes) return hoursLabel;
  if (!wholeHours) return minutesLabel;
  return `${hoursLabel} ${normalizedLocale === 'en' ? 'and' : 'e'} ${minutesLabel}`;
}

function formatReportDate(value, locale = 'pt-BR') {
  const date = localStartOfDay(value);
  return new Intl.DateTimeFormat(normalizeLocale(locale)).format(date);
}

function drawInlineText(doc, segments, x, y, fontSize) {
  let cursor = x;
  doc.setFontSize(fontSize);

  for (const segment of segments) {
    doc.setFont('helvetica', segment.bold ? 'bold' : 'normal');
    doc.text(segment.text, cursor, y);
    cursor += doc.getTextWidth(segment.text);
  }
}

export async function reportPdf({ rows, mode, startDate, endDate, locale = 'pt-BR' }) {
  const normalizedLocale = normalizeLocale(locale);
  const english = normalizedLocale === 'en';
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable')
  ]);
  const doc = new jsPDF({ format: 'a4', orientation: 'portrait', unit: 'mm' });
  const ink = [22, 35, 30];
  const muted = [89, 103, 95];
  const line = [223, 229, 225];
  const surfaceSubtle = [251, 252, 251];
  const margin = 18;
  const totalHours = rows.reduce((total, row) => total + row.hours, 0);
  const headings = mode === 'detailed'
    ? (english ? ['Task', 'Date', 'Start', 'End', 'Hours'] : ['Tarefa', 'Data', 'Início', 'Fim', 'Horas'])
    : (english ? ['Task', 'Total hours'] : ['Tarefa', 'Total de horas']);
  const body = rows.map((row) =>
    mode === 'detailed'
      ? [row.taskTitle, formatReportDate(row.date, normalizedLocale), row.start, row.end, formatHours(row.hours, normalizedLocale)]
      : [row.taskTitle, formatHours(row.hours, normalizedLocale)]
  );
  const subtitle = mode === 'detailed'
    ? (english ? 'Detailed data' : 'Dados Detalhados')
    : (english ? 'Consolidated data' : 'Dados Consolidados');
  const reportTitle = english ? 'Hours Report' : 'Relatório de Horas';

  doc.setProperties({
    title: reportTitle,
    subject: `${subtitle} ${english ? 'from' : 'de'} ${formatReportDate(startDate, normalizedLocale)} ${english ? 'to' : 'a'} ${formatReportDate(endDate, normalizedLocale)}`,
    author: 'Rics Time-blocking',
    creator: 'Rics Time-blocking'
  });
  doc.setTextColor(...ink);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(reportTitle, margin, 21);

  drawInlineText(
    doc,
    [
      { text: english ? 'Period from ' : 'Período de ' },
      { text: formatReportDate(startDate, normalizedLocale), bold: true },
      { text: english ? ' to ' : ' a ' },
      { text: formatReportDate(endDate, normalizedLocale), bold: true }
    ],
    margin,
    33,
    13
  );
  drawInlineText(
    doc,
    [
      { text: english ? 'Total hours: ' : 'Total de horas: ' },
      { text: formatHoursLong(totalHours, normalizedLocale), bold: true }
    ],
    margin,
    42,
    13
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(subtitle, margin, 56);

  autoTable(doc, {
    startY: 62,
    margin: { top: 18, right: margin, bottom: 22, left: margin },
    head: [headings],
    body,
    theme: 'plain',
    showHead: 'everyPage',
    rowPageBreak: 'avoid',
    styles: {
      font: 'helvetica',
      fontSize: 10,
      textColor: muted,
      cellPadding: { top: 3.2, right: 3, bottom: 3.2, left: 3 },
      lineColor: line,
      lineWidth: { bottom: 0.2 }
    },
    headStyles: {
      fillColor: surfaceSubtle,
      textColor: muted,
      fontSize: 9,
      fontStyle: 'bold',
      cellPadding: { top: 3, right: 3, bottom: 3, left: 3 },
      lineColor: line,
      lineWidth: { bottom: 0.3 }
    },
    columnStyles: mode === 'detailed'
      ? {
          0: { cellWidth: 73, fontStyle: 'bold', textColor: ink },
          1: { cellWidth: 26 },
          2: { cellWidth: 20 },
          3: { cellWidth: 20 },
          4: { cellWidth: 32 }
        }
      : {
          0: { cellWidth: 140, fontStyle: 'bold', textColor: ink },
          1: { cellWidth: 34 }
        }
  });

  const pageCount = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(...line);
    doc.setLineWidth(0.2);
    doc.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14);
    doc.setTextColor(...muted);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(
      english ? `Page ${page} of ${pageCount}` : `Página ${page} de ${pageCount}`,
      pageWidth - margin,
      pageHeight - 9,
      { align: 'right' }
    );
  }

  return doc.output('blob');
}

function csvEscape(value) {
  const string = String(value ?? '');
  return /[;"\r\n]/.test(string) ? `"${string.replaceAll('"', '""')}"` : string;
}

function csvHours(hours, locale) {
  return Number(hours.toFixed(2)).toLocaleString(normalizeLocale(locale), {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
}

export function reportCsv({ rows, mode, locale = 'pt-BR' }) {
  const english = normalizeLocale(locale) === 'en';
  const headers = mode === 'detailed'
    ? (english ? ['Task', 'Date', 'Start', 'End', 'Hours'] : ['Tarefa', 'Data', 'Início', 'Fim', 'Horas'])
    : (english ? ['Task', 'Total hours'] : ['Tarefa', 'Total de horas']);
  const values = rows.map((row) =>
    mode === 'detailed'
      ? [row.taskTitle, row.date, row.start, row.end, csvHours(row.hours, locale)]
      : [row.taskTitle, csvHours(row.hours, locale)]
  );

  return `\uFEFF${[headers, ...values].map((row) => row.map(csvEscape).join(';')).join('\r\n')}\r\n`;
}
