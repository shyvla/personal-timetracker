# Personal Time Tracker

WHere is your time going? Occasionally, I like to audit my life by obsessively tracking what I spend every minute doing.

The personal time tracker is a local-first desktop app for logging continuous time blocks throughout your day. Each day has its own timesheet of entries — a start/end time, a free-text description of what you were doing, and any number of colored tags. Everything is stored locally in SQLite; nothing leaves your machine.

Built with Electron, React, and TypeScript.

## Features

- **Time entries** — Continuous time blocks per day. The first block of a day sets its own start; every later block chains automatically from the previous block's end, so you only pick an end time. Editing a block re-chains the ones after it (preserving their durations) and won't let entries spill past midnight.
- **Time preferences** — Choose an increment of **15 / 20 / 30 minutes** (dropdown pickers on that grid) or **Custom** (minute-precision entry), and a **12-hour (AM/PM)** or **24-hour (military)** display. The whole sheet re-formats live.
- **Doing column** — Click any cell to edit a description. Text wraps and the row grows to fit. Saves automatically as you type, on Enter, on blur, and on close.
- **Tags** — Type to create a new tag or multi-select existing ones from a dropdown. Tags render as colored chips (in selection order) that wrap within the cell. Each new tag gets a random color; recolor any tag from its `⋮` menu with a color wheel or hex entry. Label text auto-switches between black and white for readable contrast.
- **Calendar** — Jump to any past day to view or fill in its timesheet. Future dates are disabled.
- **Export** — Export the current day or all days to **JSON** or **CSV** via a native save dialog.

## Tech stack

- **[Electron](https://www.electronjs.org/)** + **[electron-vite](https://electron-vite.org/)** — desktop shell and build tooling
- **[React](https://react.dev/) 19** + **TypeScript** — renderer UI
- **[better-sqlite3](https://github.com/WiseLibraries/better-sqlite3)** — synchronous SQLite in the main process
- Secure IPC via `contextBridge` (context isolation on, `nodeIntegration` off)

## Architecture

The renderer never touches the database directly. All data access goes through a small, typed IPC surface:

```
renderer (React)  ──window.api──▶  preload (contextBridge)  ──ipcRenderer──▶  main (better-sqlite3)
```

- **`src/main/`** — Electron main process: window lifecycle (`index.ts`), the SQLite layer and all queries (`db.ts`), IPC handlers (`ipc.ts`), and export serialization (`export.ts`). The database is opened lazily so a missing native binary can't crash startup.
- **`src/preload/`** — Exposes a typed `window.api` object; no Node APIs leak into the renderer.
- **`src/renderer/`** — React app. Components under `components/`, pure helpers (time/date/color/popover) under `lib/`.
- **`src/shared/`** — Types shared across all three layers (`Preferences`, `Entry`, `Tag`, export options, etc.).

### Data storage

A single SQLite file lives in Electron's per-user data directory:

- **macOS:** `~/Library/Application Support/personal-timetracker/timetracker.db`

Tables: `preferences`, `tags`, `entries`, and `entry_tags` (the ordered many-to-many join between entries and tags).

## Prerequisites

- **Node.js 22+** and npm
- **Xcode Command Line Tools** (macOS) — required to compile the native `better-sqlite3` module

## Setup

```bash
npm install
npm run rebuild   # compile better-sqlite3 against Electron's ABI
```

> **Note on `npm run rebuild`:** `better-sqlite3` is a native module and must be built for Electron's Node ABI (not your system Node). If it fails with `gyp: No Xcode or CLT version detected!` even though you have a working compiler, your Command Line Tools are likely installed without a package receipt. Reinstall them and retry:
>
> ```bash
> sudo rm -rf /Library/Developer/CommandLineTools
> sudo xcode-select --install   # complete the GUI installer that appears
> npm run rebuild
> ```

## Running

```bash
npm run dev
```

> If you add or change code in `src/main/` or `src/preload/`, fully restart `npm run dev` — the preload script and IPC handlers are only attached when the window/main process starts, so hot-reload of the renderer alone won't pick them up.

## Building

```bash
npm run build     # type-check + bundle main, preload, and renderer into out/
npm run preview   # preview the production build
```

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start the app in development with hot reload |
| `npm run build` | Type-check and bundle for production |
| `npm run preview` | Run the production build locally |
| `npm run rebuild` | Rebuild `better-sqlite3` for Electron's ABI |
| `npm run typecheck` | Type-check the main/preload and renderer projects |

## Project structure

```
src/
├── main/          # Electron main process
│   ├── index.ts   # window + app lifecycle
│   ├── db.ts      # SQLite schema, queries
│   ├── ipc.ts     # IPC handlers
│   └── export.ts  # JSON/CSV serialization
├── preload/       # contextBridge API exposed as window.api
├── renderer/      # React app
│   └── src/
│       ├── components/
│       ├── lib/   # time, date, color, popover helpers
│       └── styles/
└── shared/        # types shared across layers
```

