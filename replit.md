# HRFlow — HR Management Platform

A comprehensive HR Management web application with role-based access control (Admin/Employee), time tracking, announcements, request workflows, and analytics dashboards.

## Run & Operate

- `pnpm --filter @workspace/hr-app run dev` — run the frontend (root `/`)
- `pnpm --filter @workspace/api-server run dev` — run the API server (`/api`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string, `SESSION_SECRET` — JWT signing secret

## Demo Accounts

| Role     | Email                  | Password      |
|----------|------------------------|---------------|
| Admin    | admin@hrflow.com       | admin123      |
| Employee | marcus@hrflow.com      | employee123   |
| Employee | priya@hrflow.com       | employee123   |
| Employee | james@hrflow.com       | employee123   |

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Tailwind CSS, shadcn/ui, Recharts, Framer Motion
- API: Express 5 + JWT auth (bcryptjs + jsonwebtoken)
- DB: PostgreSQL + Drizzle ORM
- i18n: react-i18next (EN + DE)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)

## Where things live

- `artifacts/hr-app/src/` — React frontend
  - `src/lib/auth.tsx` — AuthContext, AuthGuard, JWT token management
  - `src/pages/` — Dashboard, Announcements, Requests, Clock, Login, Register
  - `src/i18n.ts` + `src/locales/` — EN/DE translations
  - `src/index.css` — baby blue/navy theme tokens (WCAG AAA contrast)
- `artifacts/api-server/src/routes/` — Express route handlers
  - `auth.ts`, `users.ts`, `announcements.ts`, `requests.ts`, `timeEntries.ts`, `analytics.ts`
- `artifacts/api-server/src/middlewares/auth.ts` — JWT middleware + role guards
- `lib/db/src/schema/` — Drizzle table definitions (users, announcements, requests, timeEntries)
- `lib/api-spec/openapi.yaml` — single source of truth for all API contracts

## Architecture Decisions

- JWT stored in localStorage under `hr_token`; injected via `setAuthTokenGetter` from `@workspace/api-client-react`
- Role-based routing: `useAuth()` hook reads current user role and conditionally renders Admin vs Employee views
- Time entry status computed server-side by replaying clock_in/pause_start/pause_end/clock_out events
- Analytics routes do per-employee DB queries; acceptable for small teams, cache if needed at scale
- i18n language synced from `user.language` profile field on login

## User Preferences

- Color scheme: baby blue + navy blue, WCAG AAA contrast
- No emojis in UI
- EN/DE language switching support
