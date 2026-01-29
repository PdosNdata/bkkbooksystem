# CLAUDE.md — BKK Book System

## Project Overview

A full-stack web application for managing textbook surveys and orders for โรงเรียนบ้านค้อดอนแคน (Ban Khao Don Khan School, Thailand). Manages budget allocation, book ordering, and reporting across kindergarten through secondary school levels.

## Tech Stack

- **Frontend:** React 18 (JSX) + Vite 6 + Tailwind CSS 3 + React Router 6
- **Backend:** Bun runtime + Elysia framework (TypeScript)
- **Database/Auth:** Supabase (PostgreSQL + JWT auth)
- **Package manager:** npm

## Directory Structure

```
bkkbooksystem/
├── frontend/           # React SPA
│   └── src/
│       ├── pages/      # Route page components (public/, dashboard/, admin/)
│       ├── components/ # Reusable UI (charts, sidebar, topbar, landing)
│       ├── services/   # API calls (axios + supabase)
│       ├── context/    # AuthContext (React Context)
│       ├── layouts/    # AdminLayout, DashboardLayout, PublicLayout
│       ├── config/     # menuConfig.js (role-based menus)
│       ├── routes/     # ProtectedRoute.jsx
│       ├── utils/      # role.js
│       └── lib/        # supabase.js client
├── backend/            # Elysia API server
│   └── src/
│       ├── index.ts    # Entry point (port 3000)
│       ├── app.ts      # Elysia app setup
│       ├── routes/     # API route definitions
│       ├── controllers/# Request handlers
│       ├── services/   # Business logic + Supabase queries
│       ├── types/      # TypeScript interfaces
│       └── db/         # Supabase client config
```

## Commands

### Frontend (from `frontend/`)
```bash
npm run dev       # Vite dev server (localhost:5173)
npm run build     # Production build
npm run preview   # Preview production build
```

### Backend (from `backend/`)
```bash
bun install       # Install dependencies
bun run src/index.ts  # Start server (localhost:3000)
```

**No test framework is configured.**

## Code Conventions

- **Component files:** PascalCase (e.g., `AdminSidebar.jsx`, `DonutChart.jsx`)
- **Utility/service files:** camelCase (e.g., `budget.service.js`)
- **Variables/functions:** camelCase
- **Constants:** SCREAMING_SNAKE_CASE
- **UI text and comments:** Thai language (ภาษาไทย)
- **Frontend:** JSX (not TSX), ES modules
- **Backend:** TypeScript with Elysia's `t` schema validation

## Architecture Patterns

- **Frontend:** Pages → Components → Services (axios/supabase) → Context (auth state)
- **Backend:** Routes → Controllers → Services → DB (Supabase client)
- **Auth flow:** JWT in localStorage, axios interceptor attaches Bearer token, 401 → redirect to /login
- **Role system:** admin, teacher, staff, warehouse — menu config drives sidebar per role
- **Layouts:** PublicLayout (landing/login), DashboardLayout (teachers), AdminLayout (admin pages)
- **Path alias:** `@/` maps to `frontend/src/` (configured in vite.config.js)

## Database

Supabase PostgreSQL. Key table: `budgets` (id, year, level, grade, amount).

**Grade system:** kg2, kg3 (kindergarten), p1–p6 (primary), m1–m3 (secondary)

## API Endpoints (backend port 3000)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/budgets` | List budgets (optional `?year=` filter) |
| POST | `/budgets` | Create budget |
| PUT | `/budgets/:id` | Update budget |
| DELETE | `/budgets/:id` | Not implemented (throws error) |

## Environment Variables

**Frontend (.env):** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL`
**Backend:** `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`

## Key Libraries

- **Charts:** chart.js + react-chartjs-2
- **Export:** jspdf + html2canvas (PDF), react-csv (CSV)
- **Icons:** lucide-react
- **Animations:** framer-motion
- **Dates:** date-fns

## Known Incomplete Areas

- Budget delete endpoint not implemented
- Several pages are stubs: OrderPage, ReportPage, UserPage, StudentsPage
- No automated tests
