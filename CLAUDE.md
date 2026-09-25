# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Gasasteget booking app: Next.js 15 (App Router, React 19, Turbopack) + Supabase auth/DB + Tailwind v4. UI text is Swedish. Routes: `/login`, `/register` (redirects to `/login`), `/waiting`.

## Spec-driven workflow
`SPEC.md` is the source of truth. Implement features by ID (e.g. F4-R2); make the acceptance criteria the tests; update the feature's status in the spec in the same PR. If the code needs to diverge from the spec, change the spec first. Unresolved `Q-n` items have proposed defaults, which may be used.

## Commands (pnpm 10)
- `pnpm dev` — dev server on http://localhost:4000 (`pnpm start` too)
- `pnpm lint` / `pnpm typecheck` / `pnpm test:ci` / `pnpm build` — same order as CI (`.github/workflows/ci.yml`, Node 25)
- `pnpm test` — vitest watch; single file: `pnpm vitest run app/page.test.tsx`; single test: add `-t "<name>"`
- Tests: vitest + jsdom + Testing Library, `**/*.test.{ts,tsx}`, `@/` alias = repo root
- `pnpm db:start` / `pnpm db:stop` — local Supabase via Docker (Supabase CLI)
- `pnpm db:reset` — recreate the local DB, apply `supabase/migrations/*.sql`, then `supabase/seed.sql`
- `pnpm db:types` — regenerate `lib/supabase/database.types.ts` from the local DB

## Env
See `.env.example`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (from `supabase status` for local dev), `DEFAULT_TENANT` (F0-R3 fallback, e.g. `gasasteget`), `SMTP_ENC_KEY` (32-byte base64 AES-256-GCM key, encrypts tenant SMTP passwords, F9-R11). Without Supabase vars, middleware skips auth entirely (app still runs).

## Architecture
- `middleware.ts` → `lib/supabase/middleware.ts`: refreshes session; resolves the current tenant (F0, `lib/tenant/resolve.ts`) from `Host` → `tenant_domains`, else `?tenant=`, else a `tenant` cookie, else `DEFAULT_TENANT`; exposes it via `x-tenant-id`/`x-tenant-slug` response headers (read server-side with `lib/tenant/current.ts`'s `getCurrentTenant()`). Also redirects unauthenticated users off `/dashboard`, `/admin` to `/login`, and authenticated users off auth pages to `/dashboard`.
- Route groups: `app/(auth)` (login/signup/OAuth callback), `app/(protected)` (dashboard, admin). Server actions live in `actions.ts` next to routes.
- Supabase clients: `lib/supabase/{client,server,admin}.ts` — browser, server (cookies), service-role (bypasses RLS; server only).
- Multi-tenancy (F0): schema in `supabase/migrations/*.sql` (Supabase CLI migrations, applied via `pnpm db:reset`/on deploy — not manual SQL editor edits). Core tables: `tenants`, `tenant_domains`, `rooms`, `platform_admins`, plus data-driven `roles`/`permissions`/`role_permissions` and per-tenant `memberships(user_id, tenant_id, role_id)` (replaces the old global `user_roles`) and per-tenant `access_requests`. RLS enforces tenant scoping on every tenant-owned table. `lib/auth/permissions.ts` has `PERMISSIONS`, `getCurrentUser`/`hasPermission`/`hasRole` (tenant-scoped via `getCurrentTenant()`), `requirePermission`/`requireRole` (redirect to `/dashboard` on deny). Server actions must guard themselves with these.
- `supabase/seed.sql` is local dev-only seed data (not schema): platform admin, demo tenants Gåsasteget/Nackswinget with a room each, and local test auth users — see README "Local development".
- Access flow: user signs up → submits access request (per tenant) → admin approves in `/admin` → assigned `booker` membership in that tenant.
- Email (F2/F3/F9): `lib/email/mailer.ts` sends via each tenant's own SMTP (nodemailer, config on `tenants.smtp_*`); `lib/email/crypto.ts` does AES-256-GCM encrypt/decrypt of `smtp_password_enc` with `SMTP_ENC_KEY` (server-only, never returned to the client — use the `tenant_smtp_status` view, not `tenants`, for client-facing reads); `lib/email/templates.ts` has the Swedish email bodies. Magic-link sign-in (`app/(auth)/login/actions.ts`) uses `auth.admin.generateLink` + `sendTenantEmail` instead of Supabase's mailer. SMTP is configured per tenant at `/superadmin/[slug]` (super-admin only).
- Calendar (start page `app/page.tsx`): `app/components/calendar/`. `dans-api.ts` is a server action scraping dans.se JSON `htmlBlock` via regex (revalidate 300s) into `CalendarBlock`s; `mock-data.ts` supplies other blocks.
