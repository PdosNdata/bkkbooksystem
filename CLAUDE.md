# CLAUDE.md — AI Assistant Guide for BKK Book System

## Project Overview

BKK Book System (bkk-edbook) is a Thai-language educational book and budget management platform. It manages textbook ordering, budget allocation, and distribution tracking for a school system covering kindergarten through secondary levels.

**Status:** Early MVP — budget management is partially implemented; order, report, and user management pages are placeholder stubs.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 (JSX), Vite 6, Tailwind CSS 3 |
| Backend | Bun runtime, Elysia framework (TypeScript) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth + JWT in localStorage |
| Charts | Chart.js + react-chartjs-2 |
| PDF Export | jsPDF + html2canvas |
| Icons | Lucide React |
| Animations | Framer Motion |
| HTTP Client | Axios (frontend → backend) |

## Directory Structure

```
bkkbooksystem/
├── backend/
│   └── src/
│       ├── index.ts          # Entry point (port 3000)
│       ├── app.ts            # Elysia app init + CORS
│       ├── routes/           # Elysia route definitions
│       ├── services/         # Business logic (DB queries)
│       ├── controllers/      # Legacy Express handlers (unused)
│       ├── db/supabase.ts    # Supabase client
│       └── types/            # TypeScript type definitions
├── frontend/
│   └── src/
│       ├── App.jsx           # Root component + route config
│       ├── main.jsx          # React entry point
│       ├── index.css         # Tailwind base + component classes
│       ├── components/       # Reusable UI components
│       ├── pages/            # Page components (admin/, dashboard/, public/)
│       ├── layouts/          # DashboardLayout, PublicLayout
│       ├── context/          # AuthContext (auth state)
│       ├── config/           # menuConfig (role-based nav)
│       ├── services/         # API client + endpoint modules
│       ├── lib/supabase.js   # Supabase client
│       └── utils/            # Utility functions
```

## Architecture Patterns

**Backend:** Route → Service → Supabase
- Routes define endpoints with Elysia's built-in request validation
- Services contain all business logic and database calls
- Types are defined in `backend/src/types/`

**Frontend:** Context + Layout-based routing
- `AuthContext` provides auth state via `useAuth()` hook
- Layouts (`DashboardLayout`, `PublicLayout`) wrap route groups
- Role-based sidebar navigation configured in `config/menuConfig.js`
- No global state library — React Context only

**Roles:** `admin`, `teacher`, `staff`, `warehouse`

## Common Commands

```bash
# Frontend
cd frontend && npm run dev      # Start dev server (Vite)
cd frontend && npm run build    # Production build
cd frontend && npm run preview  # Preview production build

# Backend
cd backend && bun install       # Install dependencies
cd backend && bun run src/index.ts  # Start server (port 3000)
```

## Environment Variables

**Frontend** (`frontend/.env`):
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anonymous key

**Backend** (environment):
- `SUPABASE_URL` — Supabase project URL
- `SUPABASE_SERVICE_KEY` — Supabase service role key

## Key Conventions

### Code Style
- Frontend: JavaScript (JSX), functional components with hooks
- Backend: TypeScript with strict mode, ESNext target/module
- Path alias: `@/` maps to `frontend/src/` (Vite config)
- No semicolons are inconsistently used — match surrounding code

### Naming
- Components: PascalCase (`StatCard.jsx`, `DonutChart.jsx`)
- Services/utils: camelCase (`budget.service.ts`, `budget.api.js`)
- Pages: PascalCase with `Page` suffix (`BudgetPage.jsx`)
- Routes: kebab-case URLs (`/admin/dashboard`)

### Styling
- Use Tailwind utility classes as primary approach
- Pre-built component classes in `index.css`: `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.btn-warning`, `.btn-outline`, `.input-field`, `.card`, `.table`, `.badge`, `.badge-pending`, `.badge-approved`, `.badge-received`, `.badge-distributed`
- Custom theme colors: primary (blue #2563eb), secondary (green #16a34a), danger (red #dc2626), warning (yellow #eab308)
- Font: Sarabun (Thai-optimized)

### Language
- All user-facing text is in **Thai**
- Variable names, function names, and code comments in **English**
- Grade labels use Thai strings (defined in `backend/src/types/budget.ts` as `GRADE_LABEL`)

### Database
- Main table: `budgets` (columns: id, year, level, grade, amount)
- Levels: `kindergarten`, `primary`, `secondary`
- Grades: `kg2`, `kg3`, `p1`–`p6`, `m1`–`m3`
- All DB access goes through Supabase JS client — no raw SQL

### Authentication
- Supabase Auth for user management
- JWT stored in `localStorage` (key: `token`)
- User data stored in `localStorage` (key: `user`)
- Frontend Axios interceptor auto-attaches `Authorization: Bearer` header
- 401 responses redirect to `/login`

## Testing

No test framework is configured yet. When adding tests:
- Backend: Use Bun's built-in test runner (`bun test`)
- Frontend: Use Vitest (Vite-native, compatible with existing setup)

## Notes for AI Assistants

1. **Read before editing** — always read files before modifying them
2. **Thai UI text** — any user-facing strings must be in Thai
3. **Match existing patterns** — follow the Route → Service → DB pattern for backend; Context + hooks for frontend
4. **Placeholder pages exist** — `OrderPage`, `ReportPage`, `UserPage` are empty stubs awaiting implementation
5. **Port mismatch** — backend runs on port 3000, but frontend Axios base URL points to `http://localhost:5000/api` — be aware of this discrepancy
6. **No tests yet** — adding tests is welcome but not blocking
7. **Supabase-only DB access** — never use raw SQL; always use the Supabase JS client
8. **Use pre-built CSS classes** — prefer `.btn-primary`, `.card`, `.table` etc. over writing new Tailwind utilities for common patterns
