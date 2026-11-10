# NoteFlow Studio — Packages, Libraries & System Requirements

This document lists all system prerequisites, runtime libraries, build tools, and testing packages required to run, test, and build **NoteFlow Studio**.

---

## 1. System Prerequisites

| Requirement | Minimum Version | Tested Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Node.js** | `>= 18.0.0` | `v24.22.1` | JavaScript runtime for Vite, Electron main process, and build scripts |
| **npm** | `>= 9.0.0` | `v11.19.1` | Package manager for installing dependencies |
| **OS** | macOS / Windows / Linux | macOS (Apple Silicon) | Native desktop window, filesystem Vault sync, and system idle detection |

---

## 2. Core Runtime Libraries (`dependencies`)

| Package | Version | Purpose in NoteFlow Studio |
| :--- | :--- | :--- |
| `react` | `^18.3.1` | Core UI component library and state management (`useState`, `useEffect`, `useMemo`, `useRef`) |
| `react-dom` | `^18.3.1` | DOM renderer for the NoteFlow Studio workspace interface |
| `lucide-react` | `^0.460.0` | Crisp vector icons for the Floating Top Dock, Sidebar, Notepad++ Editor, Timer, and Kanban |

---

## 3. Desktop Shell, Bundler & Styling (`devDependencies`)

| Package | Version | Purpose in NoteFlow Studio |
| :--- | :--- | :--- |
| `electron` | `^33.2.0` | Native desktop app shell, local filesystem Vault sync (`fs`/`path`), native folder picker (`dialog`), and OS-level idle detection (`powerMonitor`) |
| `vite` | `^5.4.11` | Lightning-fast frontend dev server with Hot Module Replacement (HMR) and production bundler |
| `@vitejs/plugin-react` | `^4.3.4` | React Fast Refresh and JSX/TSX compilation plugin for Vite |
| `typescript` | `^5.6.3` | Static type checking across all data models (`NoteItem`, `ProjectItem`, `FolderItem`, `WorkSessionLog`) |
| `tailwindcss` | `^3.4.15` | Utility-first CSS framework for Dark, Daylight, and Sepia themes |
| `postcss` | `^8.4.49` | CSS transformation pipeline used by Tailwind CSS |
| `autoprefixer` | `^10.4.20` | Automatic vendor prefixing for cross-platform CSS rules |
| `concurrently` | `^9.1.0` | Runs the Vite dev server and Electron desktop window simultaneously via `npm run dev` |
| `wait-on` | `^8.0.1` | Waits for `http://localhost:5173` to be ready before launching the Electron window |

---

## 4. TypeScript Definitions & Testing Libraries (`devDependencies`)

| Package | Version | Purpose in NoteFlow Studio |
| :--- | :--- | :--- |
| `@types/node` | `^22.0.0` | TypeScript definitions for Node.js APIs (`fs`, `path`, `os`) |
| `@types/react` | `^18.3.12` | TypeScript definitions for React 18 |
| `@types/react-dom` | `^18.3.1` | TypeScript definitions for ReactDOM 18 |
| `vitest` | `^2.1.9` | Fast unit and integration test runner |
| `jsdom` | `^31.0.0` | Simulated browser DOM environment for headless component tests |
| `@testing-library/react` | `^16.3.3` | React component rendering and interaction testing utilities |
| `@testing-library/jest-dom` | `^7.0.1` | Custom DOM assertions (`toBeInTheDocument()`, `toHaveValue()`, etc.) |
| `@testing-library/user-event` | `^14.6.8` | User interaction simulation for keyboard and mouse events |

---

## 5. Installation & Usage Commands

### Install All Dependencies from [`package.json`](./package.json)
```bash
npm install
```

### Install All Packages Explicitly from [`requirements.txt`](./requirements.txt)
```bash
npm install react@^18.3.1 react-dom@^18.3.1 lucide-react@^0.460.0
npm install -D electron@^33.2.0 vite@^5.4.11 @vitejs/plugin-react@^4.3.4 typescript@^5.6.3 tailwindcss@^3.4.15 postcss@^8.4.49 autoprefixer@^10.4.20 concurrently@^9.1.0 wait-on@^8.0.1 vitest@^2.1.9 jsdom@^31.0.0 @testing-library/react@^16.3.3 @testing-library/jest-dom@^7.0.1 @testing-library/user-event@^14.6.8 @types/node@^22.0.0 @types/react@^18.3.12 @types/react-dom@^18.3.1
```

### Run the Desktop Application in Development Mode
```bash
npm run dev
```

### Run the Automated Test Suite (16 Tests)
```bash
npm test
```

### Build Production Bundle
```bash
npm run build
```
