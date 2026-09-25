# Dance Club Booking — System Spec

> Source of truth for what the system does. Agents implement features from this file; code and spec must agree — when they don't, change one deliberately.
> Feature status: `Implemented` · `Partial` · `Planned`. Requirements that change existing behaviour are marked **(change)**.
> Remaining decisions are tagged `Q-n` in [§ Open questions](#open-questions), each with a proposed default that agents may use until decided.

## 1. Purpose

A multi-tenant booking system for dance clubs. Each club (tenant) has its own rooms, members and schedule on its own domain. It replaces the clunky booking in dans.se: **courses stay in dans.se and are imported**; everything else (members' practice, private lessons, parties, club activities) is booked here.

First tenant: Gåsasteget (Lunds Dansklubb).

Non-goals (v1): course sign-up/payments (stay in dans.se), payments/rental invoicing, external (non-member) rental, self-serve club sign-up.

## 2. Glossary

| Term | Meaning |
|---|---|
| Tenant | A club. Has a slug, name, custom domain(s), branding, settings. |
| Room (= venue, lokal) | A bookable space of a tenant, with a title (e.g. "Stora salen", "Lilla salen"). "Venue" and "room" mean the same thing; the spec and code use **room**, the UI says **lokal**. Every booking and imported course belongs to exactly one room. |
| Booking | A reservation of one room for a time interval, with a title and category. |
| Imported course | A course/event read from the tenant's dans.se feed, expanded into occasions. Read-only here. |
| Occasion | One dated session of an imported course. |
| Course room | The room imported courses land in unless an admin reassigns them. |
| Room assignment | An admin's override mapping an imported course to another room. |
| Activity log | Public feed of changes to bookings (moved, cancelled, created). |
| Membership | A user's role in a tenant (`admin` or `booker`). |
| Super-admin | Platform operator (Filip). Seeded by email in the database; manages all tenants. |
| Theme | A tenant's colour palette and logo, applied to the whole UI on its domain. |

## 3. Actors & roles

Roles are **per tenant**: one user can be booker in club A and admin in club B.

| Actor | Scope | Can |
|---|---|---|
| Visitor | tenant | View the tenant's public schedule, including booking titles and booker names. |
| Pending user | tenant | Signed in, awaiting approval (auto-queued). Sees only the waiting page (and the public schedule). |
| Booker | tenant | Create single bookings; move/edit/cancel **own** future bookings. |
| Admin | tenant | Everything a booker can, on **all** bookings; handle access requests; manage members, rooms, tenant settings; assign rooms to imported courses. |
| Super-admin | global | Create/edit/deactivate tenants, domains, settings and themes; appoint tenant admins; act as admin in any tenant. |

Permissions stay data-driven (`roles`, `permissions`, `role_permissions`), but role assignment becomes `memberships(user_id, tenant_id, role_id)` **(change)** from `user_roles`.

---

## F0. Tenancy — `Planned`

**Requirements**
- F0-R1 Every tenant-owned row (rooms, bookings, memberships, access requests, room assignments, activity log) has `tenant_id`. RLS restricts all reads/writes to rows of the tenant the user acts in; no cross-tenant leakage.
- F0-R2 The current tenant is resolved per request from the `Host` header via `tenant_domains(domain → tenant_id)`.
- F0-R3 Fallback when the host is not a registered domain (localhost, `*.vercel.app` previews): `?tenant=<slug>` query param (stored in a cookie for the session), else env `DEFAULT_TENANT`. `?tenant=` is ignored on registered custom domains.
- F0-R4 Unknown host with no fallback → 404 page "Klubben hittades inte".
- F0-R5 Tenant settings are defined in F9 (general, dans.se, rooms, theme).
- F0-R6 Branding: the UI uses the tenant's logo and colours; Gåsasteget's current theme becomes its tenant settings **(change)**.
- F0-R7 Tenants are created by the super-admin (F9); there is no self-serve sign-up.
- F0-R8 Auth (Supabase) is shared across tenants: one account per person; OAuth redirect URLs must include each tenant domain.

**Acceptance criteria**
- Given tenants A (`boka.a.se`) and B (`boka.b.se`), when a visitor opens `boka.a.se`, then only A's rooms, bookings and branding are shown.
- Given a user who is admin in A and has no membership in B, when they open B's `/admin`, then access is denied.
- Given a crafted request inserting a booking with B's `tenant_id` while acting in A, then RLS rejects it.
- Given `localhost:4000/?tenant=gasasteget`, then Gåsasteget is resolved; given `DEFAULT_TENANT=gasasteget` and no param, then Gåsasteget too.

## F1. Public schedule — `Partial`

**Goal:** Anyone can see what's happening in the club's rooms.

**Requirements**
- F1-R1 `/` shows a month calendar (Mon–Sun, Swedish labels), current month by default, prev/next navigation. `Implemented`
- F1-R2 Shows imported course occasions and bookings together; each shows `HH:MM title`, and bookings also show booker name and room. **(change)**
- F1-R3 Filter by room (all rooms by default). `Planned`
- F1-R4 Today is highlighted. `Implemented`
- F1-R5 Visually distinguish imported activities vs booking categories (colour/legend).
- F1-R6 Selecting a day shows a day view with all its items in full (mobile-friendly, since month cells truncate). `Planned`
- F1-R7 Times are shown in the tenant's timezone.
- F1-R8 The activity log (F8) is shown on `/` next to/below the calendar. `Planned`

**Acceptance criteria**
- Given room "Stora salen" has a booking "Träning – Anna" 18:00–20:00 on 14 April, when a visitor opens April, then 14 April shows "18:00 Träning – Anna".
- Given the room filter is set to "Lilla salen", then bookings in other rooms are hidden; imported courses show only if assigned to Lilla salen.

## F2. Sign-in — `Partial`

**Goal:** Anyone can sign in with an account they already have; no passwords to manage.

**Requirements**
- F2-R1 Sign-in methods: **email magic link / one-time code**, Google, Facebook, Microsoft (Outlook/Azure, personal + work accounts). All via Supabase Auth. **(change)** replaces email+password.
- F2-R2 One page `/login` offers all methods; there is no separate sign-up (`/register` redirects to `/login`). First sign-in creates the account. **(change)**
- F2-R3 Accounts are global (one person, one account across tenants). Signing in with a provider whose verified email matches an existing account links to that account (Supabase identity linking). Q-25
- F2-R4 After sign-in the user returns to the tenant domain and page they started from. **(change, F0)**
- F2-R5 Unauthenticated access to app routes (`/dashboard`, `/admin`, booking pages) redirects to `/login?next=<path>`; signed-in users on `/login` go to `/dashboard`.
- F2-R6 Sign-out available everywhere when signed in, including the waiting page.

**Acceptance criteria**
- Given a new person enters their email, then they receive a link/code; using it signs them in and creates their account.
- Given a user signs in with Google on `boka.b.se`, then they end up on `boka.b.se` (not another tenant's domain).
- Given a person first used Google and later the magic link with the same email, then it's the same account.
- Given `/register`, then the user is redirected to `/login`.

## F3. Approval queue — `Partial`

**Goal:** Only people the club knows can book. Signing in is open; access is granted per tenant by that tenant's admins.

**Requirements**
- F3-R1 When a signed-in user has no membership in the current tenant and no request there, a **pending request is created automatically** with name and email from the auth provider (magic-link users are asked for their name once). **(change)** replaces the mandatory form.
- F3-R2 A pending user sees only the waiting page `/waiting` on app routes: "Din förfrågan väntar på godkännande hos <klubb>", their submitted details, sign-out. They may optionally add community role ∈ {Funktionär, Tävlingsdansare, Annat (+ text)} and a short message to the admin. Q-14
- F3-R3 At most one open (pending) request per user per tenant; requests are per tenant (approval in club A gives nothing in club B).
- F3-R4 Admin queue at `/admin`: pending requests of the tenant, oldest first, showing name, email, sign-in method, community role, message, requested-at. Actions: **Godkänn** (→ `booker` membership), **Neka** (→ denied, optional reason). Both store reviewer and time.
- F3-R5 On a new request, email every admin of the tenant (one email each, with a link to `/admin`). `Planned`
- F3-R6 On approve/deny, email the requester (denial includes the reason if given). `Planned`
- F3-R7 Denied users see the denial on `/waiting` and may request again (creates a new pending request); the admin sees earlier denials for that user.
- F3-R8 Approved users are taken from `/waiting` to `/dashboard` on their next page load.
- F3-R9 The public schedule `/` stays public for everyone, including pending users.

**Data model (change)**
```
access_requests(id, tenant_id, user_id, name, email, provider, community_role NULL,
                message NULL, status pending|approved|denied, deny_reason NULL,
                reviewed_by NULL, reviewed_at NULL, created_at)
  UNIQUE (tenant_id, user_id) WHERE status = 'pending'
```

**Acceptance criteria**
- Given a new user signs in with Facebook on Gåsasteget's domain, then a pending request exists for Gåsasteget with their Facebook name and email, and they land on `/waiting`.
- Given a pending user opens `/dashboard`, then they are redirected to `/waiting`.
- Given a pending user signs in again, then no second request is created.
- Given an admin of Gåsasteget approves, then the user is booker in Gåsasteget only, gets an approval email, and their next load goes to `/dashboard`.
- Given an admin denies with reason "Okänd", then the user sees the denial and reason on `/waiting` and can request again.
- Given a new request, then each admin of that tenant (and nobody else) receives one email.
- Given a non-admin calls the approve action, then nothing changes.

## F4. Bookings — `Planned`

**Goal:** Members book a room for practice, lessons or club activities (e.g. parties) without double-booking. Scope v1: **single bookings only** (no recurring).

**Requirements**
- F4-R1 A booker creates a booking: room, date, start, end, title, category ∈ {Träning, Privatlektion, Föreningsaktivitet}. Q-15
- F4-R2 No overlaps in the same room with other confirmed bookings **or** occasions of imported courses assigned to that room. Touching intervals (end = next start) are allowed.
- F4-R3 A booking may start at most `max_days_ahead` days from today (tenant setting, Q-16), and not in the past.
- F4-R4 **Move:** the booker (own bookings, until start) or an admin (any booking, any time) can change room, date, start and end. The same rules as creation apply (F4-R2, F4-R3). Title/category can also be edited.
- F4-R5 **Cancel:** same permissions as move. Sets status `cancelled` (kept for history), frees the slot, and hides it from the schedule.
- F4-R6 Every create, move and cancel writes an activity log entry (F8) in the same transaction.
- F4-R7 The booker's name shown publicly is their display name (Q-21).
- F4-R8 Imported courses cannot be created, moved or cancelled here (F5-R6).

**Data model**
```
-- rooms: see F9
bookings(id, tenant_id, room_id, booked_by, title, category,
         starts_at timestamptz, ends_at timestamptz,
         status confirmed|cancelled, created_at, updated_at)
  CHECK (ends_at > starts_at)
  EXCLUDE USING gist (room_id WITH =, tstzrange(starts_at, ends_at, '[)') WITH &&)
    WHERE (status = 'confirmed')
```
Overlap with imported occasions is checked in application code against the synced occasions (F5); the exclusion constraint covers booking-vs-booking.

**Acceptance criteria**
- Given a confirmed 18:00–20:00 booking in Stora salen, when someone books 19:00–21:00 there, then it's rejected with "Tiden krockar med <title>"; 20:00–22:00 succeeds; 19:00–21:00 in Lilla salen succeeds.
- Given an imported course occasion 18:30–19:45 assigned to Stora salen, then a booking 19:00–20:00 in Stora salen is rejected; the same booking in Lilla salen succeeds.
- Given `max_days_ahead=56`, then a booking 57 days ahead is rejected.
- Given booker A, then A cannot move or cancel B's booking; an admin can.
- Given a booking started 10 minutes ago, then its booker cannot move or cancel it; an admin can.
- Given A moves their booking from Tue 18–20 to Wed 19–21, then the schedule shows it on Wednesday only and the activity log shows "Anna flyttade 'Träning' från tis 14/4 18:00 till ons 15/4 19:00".
- Given a move would create an overlap, then it's rejected and the booking and log stay unchanged.

## F5. dans.se import — `Partial`

**Goal:** Regular courses stay managed in dans.se and are imported automatically. They are read-only here.

**Source (dans.se public JSON API)**
- List: `GET https://dans.se/api/public/events/?org=<org>` → `{ search: {...}, events: [Event] }` (max 250 rows by default).
- Single: `GET https://dans.se/api/public/event/?org=<org>&key=<eventKey>` → `{ event: Event }`.
- Assumption: the public endpoint returns `schedule.occasions` for Gåsasteget. An optional per-tenant API password (`&pw=<secret>`) is supported for clubs where it doesn't; authenticated responses also include `statistics`/`hiddenStaff` (personal data — never stored or shown).
- Used fields of `Event`: `id`, `key`, `name`, `source` (dans.se URL), `place` (free text, e.g. "Gasquesalen", "Rotundan"), `category.name`, `instructorsName`, `registration.url`, `schedule { dayAndTimeInfo, start, end, numberOfPlannedOccasions, numberOfScheduledOccasions, occasions[] }`.
- `schedule.occasions[]`: `{ startDateTime: "YYYY-MM-DD HH:MM:SS", endDateTime, startDayOfWeek, length (seconds) }`, local time in the tenant's timezone. **This is the source of truth for occasion dates.**
- Fallback when `occasions` is missing or empty (no password, or not yet scheduled): derive weekly on `start.dayOfWeek` from `start.date` to `end.date`, `start.time`–`end.time`, capped at `numberOfPlannedOccasions`, and flag the course as "approximate" in the admin view.

**Requirements**
- F5-R1 Per tenant with `dans_se_org` set, a sync fetches the event list at least every 15 min (and on demand by an admin), upserts courses by dans.se `id`, and replaces their occasions. Courses gone from the feed are marked removed and hidden. **(change)** from today's HTML-scraping of `/api/json/...` with a hard-coded org.
- F5-R2 Each imported course occupies the **tenant's course room** by default. A tenant admin can reassign any course to another active room (room assignment); the override survives re-syncs.
- F5-R3 Admin view "Kurser från dans.se": all imported courses with name, schedule text, `place`, and a room selector (preset to the course room); overridden courses are marked.
- F5-R4 When an admin reassigns a course, offer to apply the same room to other courses with the same `place` text. Q-23
- F5-R5 If the tenant has no course room set and a course has no override, the course shows on the schedule marked "Rum ej tilldelat" and blocks no room.
- F5-R6 Imported courses and occasions cannot be created, edited, moved or cancelled in this system; the UI links to `source` on dans.se instead.
- F5-R7 If the sync fails, the last synced data stays in use; admins see "Senaste synk misslyckades <time>" in the admin view.
- F5-R8 Parsing is covered by fixture tests with recorded API responses.

**Data model**
```
imported_courses(id, tenant_id, dans_se_id, dans_se_key, name, category, place,
                 instructors, source_url, schedule jsonb,
                 room_id NULL → rooms,  -- override; NULL = tenant's course room
                 removed_at NULL, synced_at)
  UNIQUE (tenant_id, dans_se_id)
imported_occasions(id, tenant_id, course_id, starts_at, ends_at)
```

**Acceptance criteria**
- Given a fixture event (nsw 289160) with 7 entries in `schedule.occasions`, then exactly those 7 occasions are imported (2026-08-24 … 2026-10-05, 19:45–21:00, Europe/Stockholm).
- Given a fixture event without `occasions` (start 2026-08-24 19:45, end 2026-10-05 21:00, dayOfWeek 1, 7 planned), then 7 Monday occasions are derived and the course is flagged approximate.
- Given the API response contains `statistics`/`hiddenStaff`, then none of it is persisted.
- Given course room = Stora salen and a newly imported course, then bookings overlapping its occasions in Stora salen are rejected and in Lilla salen succeed.
- Given an admin reassigns the course to Lilla salen, then the next sync keeps Lilla salen, and overlaps are now rejected in Lilla salen instead.
- Given a booker opens an imported course, then no edit/move/cancel controls are shown, only a link to dans.se.
- Given the dans.se API returns 500 during sync, then the schedule keeps showing the previously synced courses.

## F6. Member app layout — `Planned`

**Goal:** Once signed in to a club, members land directly in the calendar and can book from there.

**Requirements**
- F6-R1 Approved members (booker/admin) land on `/dashboard` **(change)**, which is the calendar view (replaces the current profile-only page).
- F6-R2 Layout: header (tenant logo, user menu with sign-out, Admin link for admins) · **left sidebar with the tenant's rooms** · **main area: calendar**.
- F6-R3 Sidebar "Lokaler" lists the tenant's active rooms (in `sort_order`), plus "Alla lokaler" (default). Selecting a room filters the calendar to that room's bookings and the imported courses assigned to it. The selection is reflected in the URL (`?room=<id>`) so it survives reloads and can be shared.
- F6-R4 Calendar: month view as on the public schedule (F1), plus week view with time axis. Q-26 Items show time, title, and for bookings the booker's name; own bookings are highlighted.
- F6-R5 A primary button **"+ Lägg till aktivitet"** (always visible: in the header on desktop, floating action button on mobile) opens the booking form (F4-R1), prefilled with the selected room and, if a day/time slot was clicked, that date/time.
- F6-R6 Clicking a booking opens its details; the booker (own, before start) or an admin sees **Flytta** and **Ställ in** (F4-R4/R5). Imported courses show details and a link to dans.se only.
- F6-R7 "Mina bokningar": list of the user's upcoming bookings, reachable from the user menu or sidebar.
- F6-R8 The activity log (F8) is visible in the member view too (below the calendar or as a sidebar section).
- F6-R9 Mobile (<768px): the sidebar collapses into a room selector (dropdown/drawer) above the calendar; no horizontal scroll at 360px.

**Acceptance criteria**
- Given an approved member signs in, then they see the room sidebar and this month's calendar.
- Given they click "Lilla salen" in the sidebar, then the URL has `?room=<lilla>` and only Lilla salen items are shown; reloading keeps the filter.
- Given "Lilla salen" is selected and they click "+ Lägg till aktivitet", then the form opens with room = Lilla salen.
- Given they click an empty day (e.g. 14 April) in the calendar, then the form opens with date = 14 April.
- Given a 360px-wide screen, then the room selector is shown above the calendar and the add button floats bottom-right.

## F7. Tenant administration — `Planned`

- F7-R1 Members: list members with role; grant/revoke `booker`/`admin`; remove membership. An admin cannot remove the tenant's last admin.
- F7-R2 Rooms: see F9-R4.
- F7-R3 Tenant settings and theme: see F9 (tenant admins edit their own tenant).
- F7-R5 Room assignment for imported courses (F5-R3).
- F7-R4 All bookings: list/filter by room/date/user; edit/cancel any.

**Acceptance criteria**
- Given tenant A has one admin, when that admin tries to demote themselves, then it's rejected.
- Given room X is deactivated, then it's hidden from the booking form and new bookings in X are rejected.

## F8. Activity log — `Planned`

**Goal:** Everyone can see when bookings change, so moved or cancelled activities aren't missed.

**Requirements**
- F8-R1 Log entry types: `created`, `moved` (room and/or time changed), `cancelled`, `edited` (title/category only). Each stores who, when, the booking, and before/after values.
- F8-R2 `/` shows "Senaste ändringar": the latest 20 entries of the tenant, newest first, in plain Swedish (e.g. "Anna flyttade 'Fest' från fre 10/4 19:00 Stora salen till lör 11/4 19:00 Lilla salen", "Erik ställde in 'Träning' tis 14/4 18:00").
- F8-R3 Entries for bookings that happen within the next 7 days are visually highlighted.
- F8-R4 Public, like bookings (same visibility as F1).
- F8-R5 Entries are append-only (no edit/delete via the app; RLS allows insert only through the booking actions).
- F8-R6 Changes to imported courses (from sync) are not logged in v1. Q-24

**Data model**
```
activity_log(id, tenant_id, booking_id, actor_id, type created|moved|edited|cancelled,
             before jsonb, after jsonb, created_at)
```

**Acceptance criteria**
- Given a booking is moved, then exactly one `moved` entry exists with the old and new room/time, and it appears first under "Senaste ändringar".
- Given a move is rejected for overlap, then no log entry is written.
- Given 25 entries, then `/` shows the 20 newest.

## F9. Super-admin & tenant settings — `Planned`

**Goal:** The platform owner can onboard clubs, and each club can configure its import, rooms and look.

**Super-admin**
- F9-R1 Super-admins are listed in `platform_admins(email)`, seeded by migration with `buggfille@gmail.com`. A user whose verified email is in that table is super-admin; no UI to grant it.
- F9-R2 `/superadmin` (super-admins only): list tenants (name, domains, #members, #pending requests, last dans.se sync); create tenant (name, slug, first domain); edit/deactivate tenant; manage domains; appoint/remove tenant admins by email (if the person hasn't signed in yet, the admin membership is created on their first sign-in).
- F9-R3 A super-admin can open any tenant and acts as its admin there (bypassing the approval queue). Every super-admin change is written to an audit log.

**Tenant settings** (`/admin/settings`, editable by tenant admins and super-admins)
- F9-R4 **Lokaler (rooms):** create/rename/reorder/deactivate rooms (title, description, active); choose the **course room**. Deactivated rooms can't be booked; existing bookings stay.
- F9-R5 **General:** name, logo upload (PNG/SVG), timezone (default `Europe/Stockholm`), max days ahead for bookings (default 56).
- F9-R6 **dans.se import:** dans.se link or org slug (e.g. `https://dans.se/gasasteget/` or `gasasteget`; the org slug is extracted), optional API password (server-only secret, never sent to the browser), "Synka nu" button, last sync status. Saving validates by fetching the feed and showing the number of events found.
- F9-R7 **Theme:** colour pickers with hex input for: primary, primary text (on primary), secondary, accent, background, surface (cards), text, muted text; plus header gradient start/end. Live preview of header, calendar, buttons and a booking chip while editing. "Återställ standard" resets to the platform default.
- F9-R8 Theme contrast check: warn (not block) when text/background pairs fall below WCAG AA 4.5:1 (e.g. text on background, primary text on primary).
- F9-R9 The theme is applied as CSS variables on the tenant's pages (server-rendered, no flash of default colours); all components use the variables, not hard-coded colours. **(change)** from today's fixed Gåsasteget palette in `globals.css`, which becomes Gåsasteget's seeded theme.

**Data model**
```
platform_admins(email PK)
tenants(id, slug UNIQUE, name, active, timezone, max_days_ahead, logo_url,
        dans_se_org NULL, course_room_id NULL,
        theme jsonb, created_at)
tenant_secrets(tenant_id PK, dans_se_password)   -- no client access (RLS: none)
tenant_domains(domain PK, tenant_id)
rooms(id, tenant_id, title, description, active, sort_order)
audit_log(id, actor_id, tenant_id NULL, action, details jsonb, created_at)
```
`theme` = `{ primary, onPrimary, secondary, accent, background, surface, text, mutedText, headerFrom, headerTo }` (hex).

**Acceptance criteria**
- Given Filip's email is seeded in `platform_admins` and he signs in, then `/superadmin` is available; for any other user it returns 403/redirect.
- Given the super-admin creates tenant "Nackswinget" (`nsw`) with domain `boka.nackswinget.se` and admin `x@y.se`, then when x@y.se first signs in on that domain they are admin there without going through the queue.
- Given a tenant admin enters `https://dans.se/nsw/`, then `nsw` is stored and the page shows "5 evenemang hittades".
- Given a tenant admin sets primary to `#0B6E4F` and saves, then buttons and the header on that tenant's domain use it on next load, and other tenants are unaffected.
- Given text `#777777` on background `#FFFFFF`, then a contrast warning is shown.
- Given a tenant admin of A, then they cannot open A's `/superadmin` or B's settings.

---

## Non-functional

- UI language: Swedish. URL paths are English (`/login`, `/register`, `/waiting`, `/dashboard`, `/admin`). **(change)** from `/logga-in`, `/registrera`; old paths redirect to the new ones. Look & feel: tenant branding; Gåsasteget uses the gasasteget.se palette, Inter/Montserrat, and its logo.
- Mobile-first: works at 360px wide, no horizontal scroll.
- Stack: Next.js 15 App Router, Supabase (auth, Postgres, RLS), Tailwind v4, Vercel (custom domains per tenant).
- Authorization is enforced twice: in server actions (permission helpers) **and** by RLS. Tenant scoping is enforced by RLS, never only in the UI.
- DB changes go in versioned SQL migrations (replacing the single `seed.sql`). Q-19
- Every feature ships with vitest tests for its acceptance criteria; RLS rules get SQL/integration tests.
- Times are stored as `timestamptz` and shown in the tenant's timezone.
- Email: transactional provider (Q-20); emails are in Swedish and show the tenant's name.

## Suggested build order

1. F0 tenancy + migrations (memberships, tenant resolution, RLS) — everything else depends on it.
2. F9-R1/R2 super-admin + seed, F9-R4 rooms; F2 magic link + F3 auto-queue and `/waiting` (the entry point for every user),
3. F6 member layout (sidebar + calendar + add button) + F4 single bookings (create/move/cancel) + F8 activity log + F1-R2/R8 schedule integration.
4. F5 dans.se sync + room assignment.
5. F9-R5–R9 settings & theme editor, F3-R5/R6 emails, F7 remaining admin.

Later (out of v1 scope): recurring bookings/series.

## Open questions

Each has a proposed default in *italics*; agents may use it until decided.

- Q-14 Should the access-request role options be configurable per tenant? *No, fixed list for v1.*
- Q-15 Are categories fixed or configurable per tenant? *Fixed list for v1.*
- Q-16 Default `max_days_ahead`? *56 days (8 weeks).*
- Q-19 Migration tool. *Supabase CLI migrations (`supabase/migrations/`).*
- Q-20 Email provider. *Resend via Supabase Edge Function or a server action.*
- Q-22 Clubs whose public feed lacks `occasions`: require the API password, or accept derived dates? *Accept derived dates, flagged approximate.*
- Q-23 Should `place` → room mappings be saved as rules that auto-assign future imports? *Yes: store `place_room_rules(tenant_id, place, room_id)`; the admin can override per course.*
- Q-24 Log dans.se changes (new/removed courses) in the activity log? *No in v1.*
- Q-21 Display name source for public booker name. *Name from the approved access request, editable in profile.*
- Q-26 Calendar views for members: month only, or month + week? *Month + week; week is the default on desktop because bookings are time-based.*
- Q-25 Automatic account linking across providers by email — accept the risk of an unverified-email provider? *Link only when the provider reports a verified email (Supabase default); otherwise separate accounts.*
