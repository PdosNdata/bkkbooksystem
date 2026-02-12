# BKK Book System - AI Assistant Guidelines

## Project Overview

**BKK Book System** (ระบบสั่งหนังสือเรียน) is a textbook ordering and budget management system for Ban Khor Don Kaen School (โรงเรียนบ้านค้อดอนแคน). The application is primarily in **Thai language**.

**Status:** Early MVP — budget management is partially implemented; order, report, and user management pages are placeholder stubs.

### Key Features
- Budget management for textbooks by academic year, grade level, and education level
- Order tracking and management
- Role-based access control (admin, teacher, staff, warehouse)
- Dashboard with analytics and reporting
- PDF export functionality

## Tech Stack

### Backend (`/backend`)
- **Runtime**: Bun
- **Framework**: Elysia (Bun-first web framework)
- **Database**: Supabase (PostgreSQL)
- **Language**: TypeScript
- **Port**: 3000

### Frontend (`/frontend`)
- **Framework**: React 18
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router DOM v6
- **HTTP Client**: Axios
- **Charts**: Chart.js + react-chartjs-2
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **PDF Export**: jsPDF + html2canvas
- **Database Client**: @supabase/supabase-js

## Project Structure

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
└── CLAUDE.md
```

## Development Commands

### Backend
```bash
cd backend
bun install          # Install dependencies
bun run src/index.ts # Start development server
```

### Frontend
```bash
cd frontend
bun install    # Install dependencies (or npm install)
bun run dev    # Start Vite dev server
bun run build  # Build for production
bun run preview # Preview production build
```

## Architecture Patterns

### Backend Architecture
**Pattern:** Route → Service → Supabase

1. **Routes** (`routes/*.route.ts`): Define endpoints with request validation using Elysia's type system
2. **Services** (`services/*.service.ts`): Business logic and database operations
3. **Types** (`types/*.ts`): TypeScript interfaces and type definitions
4. **DB** (`db/supabase.ts`): Supabase client initialization

Note: There's a legacy `controllers/` folder with Express-style handlers that is not actively used.

### Frontend Architecture
**Pattern:** Context + Layout-based routing

1. **Context-based state management** via `AuthContext` using `useAuth()` hook
2. **Role-based routing** with protected routes
3. **Layout components** (`DashboardLayout`, `PublicLayout`) for consistent page structure
4. **Service layer** for API interactions
5. Role-based sidebar navigation configured in `config/menuConfig.js`

**Roles:** `admin`, `teacher`, `staff`, `warehouse`

## Key Conventions

### TypeScript/JavaScript
- Use ES modules (`import`/`export`)
- Backend uses TypeScript strict mode
- Frontend uses JSX with `.jsx` extension

### Naming
- Components: PascalCase (`StatCard.jsx`, `DonutChart.jsx`)
- Services/utils: camelCase (`budget.service.ts`, `budget.api.js`)
- Pages: PascalCase with `Page` suffix (`BudgetPage.jsx`)
- Routes: kebab-case URLs (`/admin/dashboard`)

### Styling
- Use Tailwind CSS utility classes
- Custom component classes defined in `index.css` under `@layer components`
- Primary color: Blue (`blue-600` / `#2563eb`)
- Secondary color: Green (`green-600` / `#16a34a`)
- Danger color: Red (`red-600` / `#dc2626`)
- Warning color: Yellow (`yellow-500` / `#eab308`)
- Font: Sarabun (Thai-optimized Google Font)

### Pre-defined CSS Classes
```css
.btn-primary    /* Blue primary button */
.btn-secondary  /* Green secondary button */
.btn-danger     /* Red danger button */
.btn-warning    /* Yellow warning button */
.btn-outline    /* Outlined button */
.input-field    /* Standard input styling */
.card           /* White card with shadow */
.table          /* Styled table with blue header */
.badge          /* Small status badge */
.badge-pending  /* Status badge for pending */
.badge-approved /* Status badge for approved */
.badge-received /* Status badge for received */
.badge-distributed /* Status badge for distributed */
```

### Path Aliases
- Frontend uses `@/` alias pointing to `src/` (configured in vite.config.js)
  - Example: `import AdminSidebar from '@/components/sidebar/AdminSidebar'`

### API Communication
- Frontend API base URL: `VITE_API_URL` env var (default: `http://localhost:5000/api`)
- JWT tokens stored in localStorage
- Axios interceptors handle auth headers and 401 responses
- Note: Backend runs on port 3000, but frontend Axios base URL points to port 5000 — be aware of this discrepancy

### Authentication
- Supabase Auth for user management
- JWT-based authentication
- Token stored in `localStorage` as `token`
- User data stored in `localStorage` as `user`
- `useAuth()` hook provides `user`, `login`, `logout`, `loading`, `isAuthenticated`
- 401 responses redirect to `/login`

### User Roles
- `admin`: Full system access
- `teacher`: Class book management
- `staff`: Order management
- `warehouse`: Inventory management

### Database Schema (Supabase)
Key tables:
- `budgets`: Budget allocations (columns: id, year, level, grade, amount)

Grade levels:
- Kindergarten: `kg2`, `kg3`
- Primary: `p1` through `p6`
- Secondary: `m1` through `m3`

Education levels: `kindergarten`, `primary`, `secondary`

All DB access goes through Supabase JS client — no raw SQL.

## Environment Variables

### Backend
```
SUPABASE_URL=<supabase-project-url>
SUPABASE_SERVICE_KEY=<supabase-service-key>
```

### Frontend
```
VITE_SUPABASE_URL=<supabase-project-url>
VITE_SUPABASE_ANON_KEY=<supabase-anon-key>
VITE_API_URL=<backend-api-url>
```

## Language Considerations

The application UI is primarily in **Thai**. When working on this codebase:
- Keep user-facing text in Thai
- Use Thai comments when clarifying Thai-specific logic
- English is acceptable for code comments explaining technical concepts
- Variable and function names should remain in English
- Grade labels use Thai strings (defined in `backend/src/types/budget.ts` as `GRADE_LABEL`)

### Common Thai Terms
- งบประมาณ (ngop pra maan) = Budget
- หนังสือเรียน (nang sue rian) = Textbooks
- คำสั่งซื้อ (kham sang sue) = Order
- นักเรียน (nak rian) = Student
- ครู (khru) = Teacher
- ระดับชั้น (ra dap chan) = Grade level

## Common Tasks

### Adding a New API Endpoint (Backend)
1. Define types in `src/types/`
2. Create service function in `src/services/`
3. Add route in `src/routes/` using Elysia

### Adding a New Page (Frontend)
1. Create page component in `src/pages/`
2. Add route in `App.jsx`
3. Update `menuConfig.js` if adding to navigation
4. Create layout wrapper if needed

### Adding a New Component
1. Create in `src/components/` with appropriate subfolder
2. Use Tailwind classes or pre-defined component classes
3. Keep components focused and reusable

## Testing

No test framework is currently configured. When adding tests:
- Backend: Use Bun's built-in test runner (`bun test`)
- Frontend: Use Vitest (Vite-native, compatible with existing setup)

## Notes for AI Assistants

1. **Read before editing** — always read files before modifying them
2. **Always check existing patterns** before creating new code
3. **Maintain Thai language** for user-facing strings
4. **Use Tailwind utility classes** consistently
5. **Follow the established folder structure**
6. **Use the `@/` path alias** for frontend imports
7. **Validate inputs** using Elysia's type system (backend)
8. **Handle errors gracefully** with Thai error messages for users
9. **Keep components small** and focused on single responsibilities
10. **Use pre-built CSS classes** — prefer `.btn-primary`, `.card`, `.table` etc. over writing new Tailwind utilities for common patterns
11. **Placeholder pages exist** — `OrderPage`, `ReportPage`, `UserPage` are empty stubs awaiting implementation
12. **Supabase-only DB access** — never use raw SQL; always use the Supabase JS client
