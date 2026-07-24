# AGENTS.md

## Product

Rics Time-blocking is a local-first time-blocking calendar. The MVP must work without an
account, backend, analytics, or network connection after its first load.

## Non-negotiable behavior

- Tasks have only a title in the MVP.
- A task remains in the task list after being scheduled and can be scheduled
  any number of times.
- Deleting a task deletes only its future calendar events. Events whose start
  time has already passed remain as history.
- Persist tasks, events, preferences, and migrations in IndexedDB through
  Dexie. Do not introduce localStorage as a second source of truth.
- Disable TOAST UI usage statistics.
- Backup files must remain portable and versioned.
- Keep monthly, weekly, daily, two-week, and three-week views working.
- Narrow-weekend and hide-weekend modes must apply to every compatible view.
- The sidebar is one quarter of the desktop viewport by default, collapsible,
  and available as an overlay on small screens.

## Architecture boundaries

- `src/db.js`: schema, migrations, and persistence functions only.
- `src/calendar.js`: TOAST UI instance, view configuration, and event mapping.
- `src/backup.js`: backup validation, export, import, and file handling.
- `src/main.js`: application orchestration and DOM event wiring.
- `src/style.css`: Tailwind layers, product tokens, and TOAST UI overrides.

UI modules may call persistence functions, but persistence modules must not
reach into the DOM. Keep TOAST UI objects out of IndexedDB; store plain,
serializable values and ISO date strings.

## Data rules

- Treat database schema changes as migrations. Never silently delete a store or
  field.
- `taskId` is the durable relation between a task and its scheduled events.
  Title matching exists only as a compatibility fallback for old backups.
- Database event IDs are auto-incremented numbers. Convert them to strings only
  at the TOAST UI boundary.
- Import supports two explicit modes: `merge` and `replace`.
- Validate backup shape before opening a write transaction.

## UI and accessibility

- Product language is Brazilian Portuguese.
- Use the single emerald accent and cool neutral palette already defined in
  `src/style.css`.
- Keep keyboard focus visible. Every icon-only button needs an accessible name
  and tooltip.
- Motion is limited to state feedback and must respect
  `prefers-reduced-motion`.
- Use `100dvh`, not `100vh`, for the application shell.
- Do not add decorative dashboards, gradients, or marketing-page sections.

## Commands

```bash
npm install
npm run dev
npm run build
npm run preview
```

Before handing off a change, run `npm run build`. For UI changes, also inspect
the desktop and mobile layouts in a browser.

## Evolution path

Likely next increments are projects/calendars, task duration defaults, labels,
recurrence, search, richer event editing, and optional sync. Extend the current
stores or add versioned stores instead of replacing the local-first core.
