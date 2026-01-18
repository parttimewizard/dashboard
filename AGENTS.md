# Agent Instructions for Dashboard Project

This repository contains a full-stack dashboard application with a React client and a Node.js/Express server.

## 1. Project Overview & Context
*   **Goal:** A centralized dashboard for a home server environment to monitor hosted apps, configurations, and infrastructure status.
*   **Status:** Substantially complete (Phase 9+), featuring advanced monitoring and visualization.
*   **Core Features:**
    *   **Service Monitoring:** HTTP ping, SNMP, Proxmox API, Glances API, TrueNAS API.
    *   **Organization:** Hierarchical Groups, Locations/Spatial Grouping, Multi-group assignment.
    *   **Visualization:** Logical view, Infrastructure topology graph, Service cards with resource usage (CPU/RAM/Disk).
    *   **Management:** CRUD for Services, Groups, Locations; Backup/Restore functionality.

## 2. Build, Lint, and Test Commands

### Client (`client/`)
*   **Install Dependencies:** `npm install`
*   **Start Development Server:** `npm run dev` (Runs Vite)
*   **Build for Production:** `npm run build`
*   **Lint Code:** `npm run lint` (Runs ESLint)
*   **Preview Production Build:** `npm run preview`
*   **Test:** *No test script configured.*

### Server (`server/`)
*   **Install Dependencies:** `npm install`
*   **Start Development Server:** `npm run dev` (Runs Nodemon)
*   **Start Production Server:** `npm start`
*   **Test:** *No test script configured.*

### Docker
*   **Build and Run:** `docker-compose up --build`

## 3. Code Style & Guidelines

### General
*   **Language:** Plain JavaScript (ES6+). **No TypeScript.**
*   **Indentation:** 2 spaces is preferred.
*   **File Naming:**
    *   React Components: `PascalCase.jsx` (e.g., `ServiceCard.jsx`)
    *   JS Files: `camelCase.js` (e.g., `proxmox.js`)

### Client (React)
*   **Framework:** React 19 with Vite.
*   **Imports:**
    *   React hooks from 'react'.
    *   Icons from 'lucide-react'.
    *   Absolute/relative paths for components.
*   **Components:**
    *   Use Functional Components with Hooks.
    *   Destructure props in the function signature.
    *   Keep logic (state, handlers) at the top, JSX at the bottom.
*   **State Management:**
    *   Use `useState` for local state.
    *   Use `useEffect` for side effects (data fetching).
    *   Use `useMemo` for expensive calculations (filtering).
*   **Styling:**
    *   Import CSS files directly (e.g., `import './App.css'`).
    *   Use standard CSS class names (kebab-case).
*   **API Interaction:**
    *   Use `fetch` within `async` functions.
    *   Handle errors with `try/catch`.
    *   Use the `getApiUrl()` helper to determine the backend URL.

### Server (Node.js/Express)
*   **Module System:** CommonJS (`require` / `module.exports`).
*   **Architecture:**
    *   `index.js`: Main entry point, route definitions, and server startup.
    *   `db.js`: Database connection (`pg` pool) and initialization.
    *   **Specialized Modules:**
        *   `proxmox.js`: Proxmox VE API integration.
        *   `glances.js`: Glances API integration (Docker/System).
        *   `truenas.js`: TrueNAS API integration.
        *   `pinger.js`: Background service health checking.
*   **Database (PostgreSQL):**
    *   Use `snake_case` for table names and columns.
    *   Write raw SQL queries using `pool.query`.
    *   Always use parameterized queries (`$1`, `$2`, etc.).
    *   Manage transactions (`BEGIN`, `COMMIT`, `ROLLBACK`) for multi-step operations.
*   **API Routes:**
    *   Use RESTful conventions (`GET`, `POST`, `PUT`, `DELETE`).
    *   Return JSON responses.
    *   Status codes: 200/201 (Success), 400 (Bad Request), 404 (Not Found), 500 (Server Error).
*   **Error Handling:**
    *   Wrap async route handlers in `try/catch`.
    *   Log errors to console (`console.error`).

### Project Specifics
*   **Environment Variables:**
    *   Client: `VITE_API_URL` (optional, defaults to localhost:5000 in dev).
    *   Server: `PORT` (default 5000), `DATABASE_URL`.
*   **Linting:**
    *   Client uses `eslint.config.js` with `react-hooks` and `react-refresh` plugins.
    *   Ensure no unused variables (except starting with `_` or `A-Z`).

## 4. Rules & Context
*   **Testing:** There is currently no automated testing infrastructure. When modifying code, verify changes manually by running the app.
*   **Safety:** Always check for `null` or `undefined` when accessing properties of objects, especially from API responses.
*   **Refactoring:** When modifying legacy code (e.g., legacy group IDs), maintain backward compatibility unless explicitly instructed to refactor.
*   **Documentation:** Refer to `GEMINI.md` for historical context, detailed architecture diagrams, and the original development plan.
