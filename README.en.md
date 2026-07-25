# Rics Time-blocking

[Official site](https://rics.github.io/rics-time-blocking/#en) · [Complete manual](https://rics.github.io/rics-time-blocking/docs.html#en) · [Versão em português](README.md)

**Rics Time-blocking** is a time-blocking calendar for turning tasks into reserved time on your schedule. Create a task list, then drag each task onto the calendar to decide when you intend to work on it.

Your data stays in your own browser. No account is required, and tasks, blocks, and preferences remain available between sessions. Once loaded, the app can also be installed and used offline.

## What you can do

- Create a simple task list and schedule the same task as many times as you need.
- Drag tasks onto the calendar and adjust block duration.
- Move or resize blocks directly on the calendar.
- Switch between month, week, day, two-week, and three-week views.
- Hide or narrow weekends.
- Search tasks and collapse the sidebar when you need more space.
- Create color-coded projects and associate each task with one project.
- Import open cards from Fizzy or Trello if you choose to connect those tools.
- Export and import JSON backups to move your data between browsers or devices.
- Switch the entire interface, calendar, and reports between Portuguese and English.

When you delete a task, its future blocks are removed. Blocks that have already started are kept as history.

## How it works

1. Add a task in the sidebar.
2. Drag it to the desired time on the calendar. A 30-minute block is created.
3. Drag the block or one of its edges to move it or adjust its duration.
4. The task remains in the list, ready to be scheduled again whenever you need it.

In the top bar, use PT/EN to switch languages and the gear button to open Settings. Under **System backup**, you can export a copy or import data in merge or replace mode.

## Prerequisites

- [Node.js](https://nodejs.org/) 18 or later (the LTS version is recommended).
- npm, which is included with Node.js.
- Git, only if you are cloning this repository.

## Quick start

In Windows PowerShell, clone the repository and enter the project folder:

```powershell
git clone https://github.com/rics/rics-time-blocking.git
cd rics-time-blocking
```

Install the dependencies and start the local server:

```powershell
npm install
npm run dev
```

The terminal will display an address similar to `http://localhost:5173`. Open it in your browser to use Rics Time-blocking.

To create a production build and test it locally:

```powershell
npm run build
npm run preview
```

## Your data

Tasks, projects, events, and preferences are stored locally in your browser's IndexedDB. Backups are portable JSON files. Credentials used for Fizzy and Trello integrations stay only in the browser and are not included in backups.

---

This is a personal project by [Ricardo Silva](https://ricsilva.com).
