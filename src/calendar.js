import Calendar from '@toast-ui/calendar';
import { addDays } from './date-utils.js';

const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const CALENDAR_ID = 'work';
const SOURCE_ICONS = {
  fizzy: '/fizzy.png',
  trello: '/trello.svg'
};

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value.toDate === 'function') return value.toDate();
  return new Date(value);
}

function toIso(value) {
  return toDate(value).toISOString();
}

function escapeHtml(value) {
  const element = document.createElement('div');
  element.textContent = value;
  return element.innerHTML;
}

function toCalendarEvent(event) {
  return {
    id: String(event.id),
    calendarId: event.calendarId || CALENDAR_ID,
    title: event.title,
    start: event.start,
    end: event.end,
    backgroundColor: event.backgroundColor,
    borderColor: event.borderColor,
    color: event.color,
    isAllday: Boolean(event.isAllDay),
    category: event.category || (event.isAllDay ? 'allday' : 'time'),
    raw: {
      taskId: event.taskId,
      source: event.source
    }
  };
}

function calendarEventTitle(event) {
  const title = escapeHtml(event.title);
  const sourceIcon = SOURCE_ICONS[event.raw?.source];

  if (!sourceIcon) {
    return title;
  }

  return `
    <span class="bloco-event-title">
      <img src="${sourceIcon}" alt="" aria-hidden="true" />
      <span>${title}</span>
    </span>
  `;
}

function dateAtLocalMidnight(value) {
  const date = toDate(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addVisibleDays(date, amount, hideWeekends) {
  let result = new Date(date);
  let remaining = amount;

  while (remaining > 0) {
    result = addDays(result, 1);
    const isWeekend = result.getDay() === 0 || result.getDay() === 6;
    if (!hideWeekends || !isWeekend) remaining -= 1;
  }

  return result;
}

function closestElementIndex(elements, clientX, clientY) {
  let closestIndex = 0;
  let closestDistance = Number.POSITIVE_INFINITY;

  elements.forEach((element, index) => {
    const rect = element.getBoundingClientRect();
    const horizontalDistance =
      clientX < rect.left ? rect.left - clientX : clientX > rect.right ? clientX - rect.right : 0;
    const verticalDistance =
      clientY < rect.top ? rect.top - clientY : clientY > rect.bottom ? clientY - rect.bottom : 0;
    const distance = horizontalDistance + verticalDistance;

    if (distance < closestDistance) {
      closestDistance = distance;
      closestIndex = index;
    }
  });

  return closestIndex;
}

export function createCalendar(container, callbacks = {}) {
  const state = {
    view: 'week',
    narrowWeekend: false,
    hideWeekends: false,
    events: [],
    dayTotalsFrame: null
  };

  const calendar = new Calendar(container, {
    defaultView: 'week',
    usageStatistics: false,
    useFormPopup: false,
    useDetailPopup: false,
    gridSelection: {
      enableClick: false,
      enableDbClick: false
    },
    calendars: [
      {
        id: CALENDAR_ID,
        name: 'Trabalho',
        color: '#ffffff',
        backgroundColor: '#2d6a57',
        dragBackgroundColor: '#245847',
        borderColor: '#1e493c'
      }
    ],
    week: {
      startDayOfWeek: 1,
      dayNames: DAY_NAMES,
      hourStart: 6,
      hourEnd: 22,
      taskView: false,
      eventView: ['time'],
      showTimezoneCollapseButton: false
    },
    month: {
      startDayOfWeek: 1,
      dayNames: DAY_NAMES,
      visibleWeeksCount: 0
    },
    template: {
      time(event) {
        return calendarEventTitle(event);
      },
      timegridDisplayPrimaryTime({ time }) {
        const date = toDate(time);
        return `${String(date.getHours()).padStart(2, '0')}:00`;
      },
      timegridNowIndicatorLabel({ time }) {
        const date = toDate(time);
        return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
      },
      popupDelete() {
        return 'Excluir';
      },
      popupEdit() {
        return 'Editar';
      },
      popupDetailDate(event) {
        const start = toDate(event.start);
        const end = toDate(event.end);
        const dateLabel = new Intl.DateTimeFormat('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        }).format(start);

        const timeFormat = new Intl.DateTimeFormat('pt-BR', {
          hour: '2-digit',
          minute: '2-digit'
        });
        return `${dateLabel}, ${timeFormat.format(start)} - ${timeFormat.format(end)}`;
      },
      popupDetailState() {
        return 'Ocupado';
      }
    },
    theme: {
      common: {
        backgroundColor: '#ffffff',
        border: '1px solid #dfe5e1',
        dayName: {
          color: '#53625b'
        },
        holiday: {
          color: '#9a5546'
        },
        saturday: {
          color: '#66766e'
        },
        gridSelection: {
          backgroundColor: 'rgba(45, 106, 87, 0.12)',
          border: '1px solid #2d6a57'
        }
      },
      week: {
        dayName: {
          borderLeft: '1px solid #e7ece9',
          borderTop: '0',
          borderBottom: '1px solid #dfe5e1',
          backgroundColor: '#fbfcfb'
        },
        timeGrid: {
          borderRight: '1px solid #dfe5e1'
        },
        timeGridLeft: {
          borderRight: '1px solid #dfe5e1',
          backgroundColor: '#fbfcfb'
        },
        nowIndicatorLabel: {
          color: '#2d6a57'
        },
        nowIndicatorPast: {
          border: '1px dashed #7fa08d'
        },
        nowIndicatorBullet: {
          backgroundColor: '#2d6a57'
        },
        nowIndicatorToday: {
          border: '1px solid #2d6a57'
        },
        pastTime: {
          color: '#a7b0ab'
        },
        futureTime: {
          color: '#59675f'
        },
        weekend: {
          backgroundColor: 'rgba(45, 106, 87, 0.025)'
        },
        today: {
          color: '#163d32'
        }
      },
      month: {
        dayName: {
          borderLeft: '1px solid #e7ece9',
          backgroundColor: '#fbfcfb'
        },
        moreView: {
          border: '1px solid #dfe5e1',
          boxShadow: '0 18px 44px rgba(21, 42, 34, 0.14)',
          backgroundColor: '#ffffff'
        },
        weekend: {
          backgroundColor: '#fafbfa'
        },
        holidayExceptThisMonth: {
          color: '#bdc5c0'
        },
        dayExceptThisMonth: {
          color: '#bdc5c0'
        }
      }
    }
  });

  calendar.on('selectDateTime', (event) => {
    callbacks.onRequestCreate?.({
      start: toDate(event.start),
      end: toDate(event.end),
      isAllDay: Boolean(event.isAllday ?? event.isAllDay)
    });
  });

  calendar.on('beforeUpdateEvent', async ({ event, changes }) => {
    const normalized = {
      start: changes.start ? toIso(changes.start) : undefined,
      end: changes.end ? toIso(changes.end) : undefined,
      isAllDay:
        typeof changes.isAllday === 'boolean'
          ? changes.isAllday
          : typeof changes.isAllDay === 'boolean'
            ? changes.isAllDay
            : undefined
    };

    try {
      await callbacks.onUpdate?.(Number(event.id), normalized);
      calendar.updateEvent(event.id, event.calendarId, {
        ...changes,
        isAllday: normalized.isAllDay
      });
      const storedEvent = state.events.find((item) => Number(item.id) === Number(event.id));
      if (storedEvent) {
        if (normalized.start) storedEvent.start = normalized.start;
        if (normalized.end) storedEvent.end = normalized.end;
        if (typeof normalized.isAllDay === 'boolean') {
          storedEvent.isAllDay = normalized.isAllDay;
          storedEvent.category = normalized.isAllDay ? 'allday' : 'time';
        }
      }
      scheduleDayTotals();
      callbacks.onRangeChange?.();
    } catch (error) {
      callbacks.onError?.(error);
    }
  });

  calendar.on('beforeDeleteEvent', async (event) => {
    try {
      await callbacks.onDelete?.(Number(event.id));
      calendar.deleteEvent(event.id, event.calendarId);
      state.events = state.events.filter((item) => Number(item.id) !== Number(event.id));
      scheduleDayTotals();
    } catch (error) {
      callbacks.onError?.(error);
    }
  });

  calendar.on('clickEvent', ({ event }) => {
    callbacks.onRequestEventDetails?.({
      id: Number(event.id),
      taskId: Number(event.raw?.taskId),
      title: event.title,
      start: toDate(event.start),
      end: toDate(event.end)
    });
  });

  calendar.on('clickDayName', ({ date }) => {
    calendar.setDate(new Date(date));
    state.view = 'day';
    calendar.changeView('day');
    scheduleDayTotals();
    callbacks.onViewChange?.('day');
    callbacks.onRangeChange?.();
  });

  function setView(view) {
    state.view = view;
    const visibleWeeksCount = view === '2weeks' ? 2 : view === '3weeks' ? 3 : 0;
    const toastView =
      view === 'month' || view === '2weeks' || view === '3weeks' ? 'month' : view;

    calendar.setOptions({
      week: {
        narrowWeekend: state.narrowWeekend,
        workweek: state.hideWeekends
      },
      month: {
        visibleWeeksCount,
        narrowWeekend: state.narrowWeekend,
        workweek: state.hideWeekends
      }
    });
    calendar.changeView(toastView);
    calendar.render();
    scheduleDayTotals();
    callbacks.onRangeChange?.();
  }

  function setWeekendOptions({ narrowWeekend, hideWeekends }) {
    state.narrowWeekend = Boolean(narrowWeekend);
    state.hideWeekends = Boolean(hideWeekends);
    setView(state.view);
  }

  function move(direction) {
    if (direction < 0) calendar.prev();
    if (direction > 0) calendar.next();
    scheduleDayTotals();
    callbacks.onRangeChange?.();
  }

  function getRange() {
    return {
      start: toDate(calendar.getDateRangeStart()),
      end: toDate(calendar.getDateRangeEnd())
    };
  }

  function eventMinutesOnDate(event, date) {
    if (event.isAllDay || event.category === 'allday') return 0;

    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = addDays(dayStart, 1);
    const eventStart = new Date(event.start);
    const eventEnd = new Date(event.end);
    const overlapStart = Math.max(dayStart.getTime(), eventStart.getTime());
    const overlapEnd = Math.min(dayEnd.getTime(), eventEnd.getTime());

    return Math.max(0, (overlapEnd - overlapStart) / 60_000);
  }

  function formatHours(minutes) {
    const hours = minutes / 60;
    return `${new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(hours)} h`;
  }

  function renderDayTotals() {
    state.dayTotalsFrame = null;

    if (state.view !== 'week' && state.view !== 'day') return;

    const headers = Array.from(
      container.querySelectorAll('.toastui-calendar-day-name-item.toastui-calendar-week')
    );
    const rangeStart = dateAtLocalMidnight(calendar.getDateRangeStart());

    headers.forEach((header, index) => {
      const date =
        state.view === 'day'
          ? rangeStart
          : addVisibleDays(rangeStart, index, state.hideWeekends);
      const totalMinutes = state.events.reduce(
        (total, event) => total + eventMinutesOnDate(event, date),
        0
      );
      let total = header.querySelector('.bloco-day-total');

      if (!total) {
        total = document.createElement('span');
        total.className = 'bloco-day-total';
        header.append(total);
      }

      total.textContent = formatHours(totalMinutes);
    });
  }

  function scheduleDayTotals() {
    if (state.dayTotalsFrame != null) {
      window.cancelAnimationFrame(state.dayTotalsFrame);
    }
    state.dayTotalsFrame = window.requestAnimationFrame(renderDayTotals);
  }

  function getDropTarget(clientX, clientY, durationMinutes = 30) {
    const view = calendar.getViewName();
    const rangeStart = dateAtLocalMidnight(calendar.getDateRangeStart());

    if (view === 'month') {
      const cells = Array.from(
        container.querySelectorAll('.toastui-calendar-month-daygrid .toastui-calendar-daygrid-cell')
      );
      const cellIndex = cells.length ? closestElementIndex(cells, clientX, clientY) : 0;
      const date = addVisibleDays(rangeStart, cellIndex, state.hideWeekends);
      const cellRect = cells[cellIndex]?.getBoundingClientRect();
      date.setHours(9, 0, 0, 0);
      return {
        start: date,
        previewRect: cellRect
          ? {
              left: cellRect.left + 4,
              top: cellRect.top + 31,
              width: Math.max(24, cellRect.width - 8),
              height: 24
            }
          : null
      };
    }

    const columns = Array.from(
      container.querySelectorAll('[data-testid^="timegrid-column-"]')
    );
    const columnIndex = columns.length ? closestElementIndex(columns, clientX, clientY) : 0;
    const columnRect = columns[columnIndex]?.getBoundingClientRect();
    const date = addVisibleDays(rangeStart, view === 'day' ? 0 : columnIndex, state.hideWeekends);
    const gridRect = columns[0]?.getBoundingClientRect();
    const timePanelRect = container
      .querySelector('.toastui-calendar-panel.toastui-calendar-time')
      ?.getBoundingClientRect();
    const totalMinutes = 16 * 60;
    const latestStart = Math.max(0, totalMinutes - Math.max(15, durationMinutes));
    const isOverTimeGrid =
      gridRect &&
      timePanelRect &&
      clientY >= timePanelRect.top &&
      clientY <= timePanelRect.bottom;
    const relativeY = isOverTimeGrid
      ? Math.max(0, Math.min(gridRect.height, clientY - gridRect.top))
      : null;
    const minutes =
      relativeY == null
        ? (9 - 6) * 60
        : Math.min(
            latestStart,
            Math.max(0, Math.round(((relativeY / gridRect.height) * totalMinutes) / 15) * 15)
          );
    date.setHours(6, minutes, 0, 0);
    const previewTop = gridRect ? gridRect.top + (minutes / totalMinutes) * gridRect.height : 0;
    const previewHeight = gridRect
      ? Math.max(18, (Math.max(15, durationMinutes) / totalMinutes) * gridRect.height)
      : 0;
    const clippedTop = timePanelRect ? Math.max(previewTop, timePanelRect.top) : previewTop;
    const clippedBottom = timePanelRect
      ? Math.min(previewTop + previewHeight, timePanelRect.bottom)
      : previewTop + previewHeight;

    return {
      start: date,
      previewRect:
        columnRect && clippedBottom > clippedTop
          ? {
              left: columnRect.left + 3,
              top: clippedTop,
              width: Math.max(24, columnRect.width - 6),
              height: clippedBottom - clippedTop
            }
          : null
    };
  }

  return {
    instance: calendar,
    setView,
    setWeekendOptions,
    move,
    today() {
      calendar.today();
      scheduleDayTotals();
      callbacks.onRangeChange?.();
    },
    getRange,
    getDropTarget,
    clearSelection() {
      calendar.clearGridSelections();
    },
    async replaceEvents(events) {
      const timedEvents = events.filter(
        (event) => !event.isAllDay && event.category !== 'allday'
      );
      state.events = timedEvents.map((event) => ({ ...event }));
      calendar.clear();
      calendar.createEvents(timedEvents.map(toCalendarEvent));
      scheduleDayTotals();
    },
    addEvent(event) {
      if (event.isAllDay || event.category === 'allday') return;
      state.events.push({ ...event });
      calendar.createEvents([toCalendarEvent(event)]);
      scheduleDayTotals();
    },
    removeEvent(event) {
      state.events = state.events.filter((item) => Number(item.id) !== Number(event.id));
      calendar.deleteEvent(String(event.id), event.calendarId || CALENDAR_ID);
      scheduleDayTotals();
    },
    render() {
      calendar.render();
      scheduleDayTotals();
    },
    destroy() {
      if (state.dayTotalsFrame != null) {
        window.cancelAnimationFrame(state.dayTotalsFrame);
      }
      calendar.destroy();
    }
  };
}
