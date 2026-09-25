# Gåsasteget booking

Next.js 15 (App Router) + Supabase (auth/DB/RLS) + Tailwind v4 multi-tenant dance club booking app. See `SPEC.md` for the full spec and `CLAUDE.md` for contributor/agent guidance.

## Local development

Requires Docker (for local Supabase) and pnpm 10.

```bash
pnpm install
pnpm db:start        # starts local Supabase (Postgres, Auth, Studio) via Docker
pnpm db:reset         # applies supabase/migrations/*.sql then supabase/seed.sql
```

`pnpm db:start` prints your local API URL, anon key and service role key. Copy them into `.env.local` (not committed):

```bash
cp .env.example .env.local
# fill in NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY
# from `pnpm db:start` (or `pnpm dlx supabase status`) output
```

Then:

```bash
pnpm dev              # http://localhost:4000
```

Local Supabase Studio: http://localhost:54323.

### Seeded local data

`supabase/seed.sql` (dev only) creates two tenants, one room each, and three auth users, all with password `devpassword123`:

| Email | Tenant | Role |
|---|---|---|
| `buggfille@gmail.com` | Gåsasteget (`gasasteget`) | super-admin + tenant admin |
| `admin@example.com` | Gåsasteget (`gasasteget`) | tenant admin |
| `booker@example.com` | Gåsasteget (`gasasteget`) | booker |

Tenants: **Gåsasteget** (`gasasteget`) and **Nackswinget** (`nsw`), each with a "Stora salen" room set as course room.

### Tenant resolution locally

Since there's no real `Host`-based routing on localhost, pass `?tenant=<slug>` (e.g. `http://localhost:4000/?tenant=nsw`) or set `DEFAULT_TENANT` in `.env.local` (defaults to `gasasteget` in `.env.example`).

### Other commands

- `pnpm db:stop` — stop local Supabase containers
- `pnpm db:types` — regenerate `lib/supabase/database.types.ts` from the local schema
- `pnpm lint` / `pnpm typecheck` / `pnpm test:ci` / `pnpm build` — same checks as CI
