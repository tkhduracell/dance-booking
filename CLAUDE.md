# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Gasasteget booking app: Next.js 15 (App Router, React 19, Turbopack) + Supabase auth/DB + Tailwind v4. UI text is Swedish. Routes are currently `/logga-in`, `/registrera`; SPEC.md moves them to English slugs (`/login`, `/register`, `/waiting`).

## Spec-driven workflow
`SPEC.md` is the source of truth. Implement features by ID (e.g. F4-R2); make the acceptance criteria the tests; update the feature's status in the spec in the same PR. If the code needs to diverge from the spec, change the spec first. Unresolved `Q-n` items have proposed defaults, which may be used.

## Commands (pnpm 10)
- `pnpm dev` — dev server on http://localhost:4000 (`pnpm start` too)
- `pnpm lint` / `pnpm typecheck` / `pnpm test:ci` / `pnpm build` — same order as CI (`.github/workflows/ci.yml`, Node 25)
- `pnpm test` — vitest watch; single file: `pnpm vitest run app/page.test.tsx`; single test: add `-t "<name>"`
- Tests: vitest + jsdom + Testing Library, `**/*.test.{ts,tsx}`, `@/` alias = repo root

## Env
See `.env.example`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. Without Supabase vars, middleware skips auth entirely (app still runs).

## Architecture
- `middleware.ts` → `lib/supabase/middleware.ts`: refreshes session; redirects unauthenticated users off `/dashboard`, `/admin` to `/logga-in`, and authenticated users off auth pages to `/dashboard`.
- Route groups: `app/(auth)` (login/signup/OAuth callback), `app/(protected)` (dashboard, admin). Server actions live in `actions.ts` next to routes.
- Supabase clients: `lib/supabase/{client,server,admin}.ts` — browser, server (cookies), service-role (bypasses RLS; server only).
- RBAC: schema in `supabase/seed.sql` (roles, permissions, role_permissions, user_roles, access_requests; run manually in Supabase SQL editor — no migrations tool). `lib/auth/permissions.ts` has `PERMISSIONS`, `getCurrentUser`, `requirePermission`/`requireRole` (redirect to `/dashboard` on deny). Server actions must guard themselves with these.
- Access flow: user signs up → submits access request → admin approves in `/admin` → assigned `booker` role.
- Calendar (start page `app/page.tsx`): `app/components/calendar/`. `dans-api.ts` is a server action scraping dans.se JSON `htmlBlock` via regex (revalidate 300s) into `CalendarBlock`s; `mock-data.ts` supplies other blocks.
