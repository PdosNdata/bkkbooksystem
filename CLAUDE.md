# CLAUDE.md - AI Assistant Guide for bkkbooksystem

## Project Overview

**bkkbooksystem** is a full-stack education textbook ordering and management system for a Thai school (โรงเรียนบ้านค้อดอนแคน). It manages textbook budgets, orders, inventory, and reporting across multiple education levels (kindergarten, primary, secondary).

This is a monorepo with two independent applications: `backend/` and `frontend/`.

## Tech Stack

| Layer     | Technology                                    |
|-----------|-----------------------------------------------|
| Runtime   | Bun (primary), Node.js compatible             |
| Backend   | Elysia (TypeScript) on port 3000              |
| Frontend  | React 18 + Vite 6 (JSX)                      |
| Database  | Supabase (hosted PostgreSQL)                  |
| Styling   | Tailwind CSS 3 with custom theme              |
| Auth      | JWT tokens stored in localStorage             |
| Language  | Thai UI text throughout; code in English      |

## Directory Structure

```
bkkbooksystem/
├── backend/
│   └── src/
│       ├── index.ts              # Entry point (port 3000)
│       ├── app.ts                # Elysia app, registers route plugins
│       ├── controllers/          # Request handlers (Express-style)
│       ├── routes/               # Elysia route definitions with validation
│       ├── services/             # Business logic + Supabase queries
│       ├── db/
│       │   └── supabase.ts       # Supabase client (uses env vars)
│       └── types/                # TypeScript type definitions
├── frontend/
│   ├── index.html
│   ├── vite.config.js            # Vite config with @ alias to src/
│   ├── tailwind.config.js        # Custom colors + Sarabun font
│   └── src/
│       ├── main.jsx              # React entry + AuthProvider
│       ├── App.jsx               # Route definitions
│       ├── index.css             # Tailwind directives + component classes
│       ├── components/           # Grouped by feature (dashboard/, landing/, sidebar/)
│       ├── pages/                # Grouped by role (public/, dashboard/, admin/)
│       ├── layouts/              # PublicLayout, DashboardLayout
│       ├── context/
│       │   └── AuthContext.jsx   # Auth state, login/logout, useAuth() hook
│       ├── services/
│       │   └── api.js            # Axios instance with JWT interceptors
│       ├── config/
│       │   └── menuConfig.js     # Role-based sidebar navigation
│       └── utils/
└── README.md
```

## Development Commands

### Frontend (from `frontend/`)

```bash
bun install          # Install dependencies
bun run dev          # Start Vite dev server (default: http://localhost:5173)
bun run build        # Production build to dist/
bun run preview      # Preview production build
```

### Backend (from `backend/`)

```bash
bun install          # Install dependencies
bun run src/index.ts # Start Elysia server on http://localhost:3000
```

There are no test scripts, linting commands, or CI/CD pipelines configured.

## Environment Variables

### Backend (required, not committed)

| Variable              | Description                      |
|-----------------------|----------------------------------|
| `SUPABASE_URL`        | Supabase project URL             |
| `SUPABASE_SERVICE_KEY` | Supabase service role key       |

### Frontend (`.env` in `frontend/`)

| Variable                  | Description                  |
|---------------------------|------------------------------|
| `VITE_SUPABASE_URL`      | Supabase project URL         |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key       |
| `VITE_API_URL`            | Backend API URL (default: `http://localhost:5000/api`) |

## Architecture & Patterns

### Backend Architecture

- **Framework**: Elysia with plugin-based route registration
- **Pattern**: Routes -> Controllers -> Services -> Supabase client
- **Validation**: Elysia `t` (TypeBox) schema validation on request bodies
- **Data flow**: Routes define endpoints and validation schemas, services execute Supabase queries directly

### Frontend Architecture

- **Routing**: React Router v6 with layout routes (`PublicLayout`, `DashboardLayout`)
- **Auth**: `AuthContext` provides `useAuth()` hook; `ProtectedRoute` component guards routes
- **API layer**: Centralized Axios instance (`services/api.js`) with JWT token injection and 401 auto-redirect
- **State**: React Context for auth; local `useState` for component state
- **Components**: Feature-grouped (e.g., `components/dashboard/`, `components/landing/`)
- **Pages**: Role-grouped (e.g., `pages/public/`, `pages/admin/`, `pages/dashboard/`)

### Authentication Flow

1. User logs in via `/login` -> `AuthContext.login()` calls `POST /auth/login`
2. JWT token + user object stored in `localStorage`
3. Axios request interceptor attaches `Authorization: Bearer <token>` header
4. 401 responses clear storage and redirect to `/login`
5. `ProtectedRoute` checks `useAuth()` user state before rendering

### Role-Based Access Control

Four roles with different menu access: `admin`, `teacher`, `staff`, `warehouse`. Menu configuration is in `frontend/src/config/menuConfig.js`.

## Domain Model

### Education Levels & Grades

| Level          | Grade Codes           | Thai Label           |
|----------------|-----------------------|----------------------|
| `kindergarten` | `kg2`, `kg3`          | อนุบาล 2-3          |
| `primary`      | `p1`-`p6`             | ประถมศึกษาปีที่ 1-6  |
| `secondary`    | `m1`-`m3`             | มัธยมศึกษาปีที่ 1-3  |

### Budget Schema

```typescript
{
  year: number
  level: 'kindergarten' | 'primary' | 'secondary'
  grade: Grade  // kg2, kg3, p1-p6, m1-m3
  amount: number
}
```

## API Endpoints

### Budgets (`/budgets`)

| Method | Path          | Description                          |
|--------|---------------|--------------------------------------|
| GET    | `/budgets`    | List all budgets (optional `?year=`) |
| POST   | `/budgets`    | Create budget (validated body)       |
| PUT    | `/budgets/:id`| Partial update budget                |

## Coding Conventions

### General

- **Language**: Code identifiers in English, UI strings in Thai
- **Naming**: camelCase for variables/functions, PascalCase for React components, kebab-case for URL paths
- **Files**: PascalCase for React component files (e.g., `BudgetPage.jsx`), camelCase for services/utils (e.g., `budget.service.ts`)

### Backend

- TypeScript with strict mode
- Elysia route plugins exported per resource (e.g., `budgetRoutes`)
- Type definitions in dedicated `types/` directory
- Supabase client instantiated once in `db/supabase.ts`
- Services are pure async functions, not classes

### Frontend

- React functional components with hooks (no class components)
- JSX file extension (`.jsx`), not TypeScript
- Tailwind utility classes for styling; custom component classes defined in `@layer components` in `index.css`
- Import alias `@` maps to `frontend/src/`
- Axios-based API service layer in `services/`
- Thai-language error messages in catch blocks

### Tailwind Custom Classes

Defined in `frontend/src/index.css` under `@layer components`:

- `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.btn-warning`, `.btn-outline`
- `.input-field` for form inputs
- `.card` for card containers
- `.table` for data tables (with styled `th`/`td`)
- `.badge`, `.badge-pending`, `.badge-approved`, `.badge-received`, `.badge-distributed`

### Color Palette

- **Primary**: Blue (`#2563eb` / blue-600)
- **Secondary**: Green (`#16a34a` / green-600)
- **Danger**: Red (`#dc2626` / red-600)
- **Warning**: Yellow (`#eab308` / yellow-500)

### Font

- **Sarabun** (Thai font family) configured globally via Tailwind and CSS

## Important Notes

- The backend and frontend are separate applications with independent `package.json` files; install dependencies in each directory separately
- The frontend directly uses the Supabase client in some places alongside the Axios-based API layer; be aware of both data access patterns
- The `deleteBudget` service function exists but throws "not implemented" - it has no corresponding route
- Some admin pages (e.g., `OrderPage`, `ReportPage`, `UserPage`) exist as files but may not be fully wired in routing
- No test framework is configured; there are no existing tests
- No ESLint or Prettier configuration exists
- The `package-old.json` at root is a legacy artifact
