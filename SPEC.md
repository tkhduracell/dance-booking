# Dance Club Booking — System Spec

> Source of truth for what the system does. Agents implement features from this file; code and spec must agree — when they don't, change one deliberately.
> Feature status: `Implemented` · `Partial` · `Planned`. Requirements that change existing behaviour are marked **(change)**.
> Remaining decisions are tagged `Q-n` in [§ Open questions](#open-questions), each with a proposed default that agents may use until decided.

## 1. Purpose

A multi-tenant booking system for dance clubs. Each club (tenant) has its own rooms, members and schedule on its own domain. It replaces the clunky booking in dans.se: **courses stay in dans.se and are imported**; everything else (members' practice, private lessons, parties, club activities) is booked here.

First tenants: **Gåsasteget** (Lunds Dansklubb, `boka.gasasteget.se`) and **Nackswinget** (`nsw`, `boka.nackswinget.se`).

Non-goals (v1): course sign-up/payments (stay in dans.se), payments/rental invoicing, external (non-member) rental, self-serve club sign-up, recurring bookings, booking on behalf of someone else.

## 2. Glossary

| Term | Meaning |
|---|---|
| Tenant | A club. Has a slug, name, custom domain(s), branding, settings. |
| Room (= venue, lokal) | A bookable space of a tenant, with a title (e.g. "Stora salen", "Lilla salen"). "Venue" and "room" mean the same thing; the spec and code use **room**, the UI says **lokal**. Every booking and imported course belongs to exactly one room. |
| Booking | A reservation of one room for a time interval, with a title and category. Always in the booker's own name. |
| Category | A tenant-defined booking type with a name and colour (e.g. Träning, Privatlektion, Föreningsaktivitet). |
| Imported course | A course/event read from the tenant's dans.se API, with its occasions. Read-only here. |
| Occasion | One dated session of an imported course. |
| Course room | The single room all imported courses occupy. |
| Conflict flag | A marker on a booking that overlaps an imported occasion, set by the system when a sync or course-room change creates the overlap. |
| Activity log | Members-only feed of changes to bookings (created, moved, edited, cancelled). |
| Membership | A user's role in a tenant (`admin` or `booker`). |
| Former member | A user whose membership was removed or whose account was deleted; their bookings remain, shown as "Tidigare medlem". |
| Super-admin | Platform operator (Filip). Seeded by email in the database; manages all tenants. |
| Theme | A tenant's colour palette and logo, applied to the whole UI on its domain. |

## 3. Actors & roles

Roles are **per tenant**: one user can be booker in club A and admin in club B.

| Actor | Scope | Can |
|---|---|---|
| Visitor | tenant | View the public schedule: titles, times, rooms, categories. **No names, no activity log.** |
| Pending user | tenant | Signed in, awaiting approval (auto-queued). Sees only the waiting page (and the public schedule). |
| Booker | tenant | See names and the activity log; create bookings in their own name; move/edit/cancel **own** bookings until start; delete own account. |
| Admin | tenant | Everything a booker can, on **all** bookings (incl. former members'); handle access requests; manage members, rooms, categories, settings, theme, dans.se token, SMTP. Cannot book on behalf of others. |
| Super-admin | global | Create/edit/deactivate tenants, domains, settings and themes; appoint tenant admins; act as admin in any tenant. |

Permissions stay data-driven (`roles`, `permissions`, `role_permissions`), but role assignment becomes `memberships(user_id, tenant_id, role_id)` **(change)** from `user_roles`.

---

## F0. Tenancy — `Partial`

**Requirements**
- F0-R1 Every tenant-owned row (rooms, categories, bookings, memberships, access requests, imported courses/occasions, activity log) has `tenant_id`. RLS restricts all reads/writes to rows of the tenant the user acts in; no cross-tenant leakage.
- F0-R2 The current tenant is resolved per request from the `Host` header via `tenant_domains(domain → tenant_id)`.
- F0-R3 Fallback when the host is not a registered domain (localhost, `*.vercel.app` previews): `?tenant=<slug>` query param (stored in a cookie for the session), else env `DEFAULT_TENANT`. `?tenant=` is ignored on registered custom domains.
- F0-R4 Unknown host with no fallback → 404 page "Klubben hittades inte".
- F0-R5 Tenant settings are defined in F9.
- F0-R6 Branding: the UI uses the tenant's logo and colours; Gåsasteget's current theme becomes its tenant settings **(change)**.
- F0-R7 Tenants are created by the super-admin (F9); there is no self-serve sign-up.
- F0-R8 Auth (Supabase) is shared across tenants: one account per person. Each tenant domain must be added to Supabase Auth's redirect URL allow-list (manual step when adding a domain; see F9-R2).
- F0-R9 **Migration of existing data (change):** create tenant Gåsasteget; move existing `user_roles` into Gåsasteget memberships (same roles) and existing `access_requests` into Gåsasteget (pending stay pending). No user has to re-apply.

**Acceptance criteria**
- Given tenants A (`boka.a.se`) and B (`boka.b.se`), when a visitor opens `boka.a.se`, then only A's rooms, bookings and branding are shown.
- Given a user who is admin in A and has no membership in B, when they open B's `/admin`, then access is denied.
- Given a crafted request inserting a booking with B's `tenant_id` while acting in A, then RLS rejects it.
- Given `localhost:4000/?tenant=gasasteget`, then Gåsasteget is resolved; given `DEFAULT_TENANT=gasasteget` and no param, then Gåsasteget too.
- Given a user who was `booker` before the migration, then after it they are booker in Gåsasteget and land on `/dashboard`.

## F1. Public schedule — `Partial`

**Goal:** Anyone can see what's happening in the club's rooms.

**Requirements**
- F1-R1 `/` shows a month calendar (Mon–Sun, Swedish labels), current month by default, prev/next navigation. `Implemented`
- F1-R2 Shows imported course occasions and bookings together; each shows `HH:MM title`, room and category colour. **Booker names are not shown to visitors.** **(change)**
- F1-R3 Filter by room (all rooms by default). `Planned`
- F1-R4 Today is highlighted. `Implemented`
- F1-R5 Colour legend: imported courses + each tenant category.
- F1-R6 Selecting a day shows a day view with all its items in full (mobile-friendly, since month cells truncate). `Planned`
- F1-R7 Times are shown in the tenant's timezone.
- F1-R8 The activity log is **not** shown to visitors (F8-R4).

**Acceptance criteria**
- Given room "Stora salen" has Anna's booking "Träning" 18:00–20:00 on 14 April, when a visitor opens April, then 14 April shows "18:00 Träning" and "Anna" appears nowhere on the page.
- Given the room filter is set to "Lilla salen", then bookings in other rooms are hidden; imported courses show only if Lilla salen is the course room.

## F2. Sign-in — `Partial`

**Goal:** Anyone can sign in with an account they already have; no passwords to manage.

**Requirements**
- F2-R1 Sign-in methods: **email magic link / one-time code**, Google, Facebook, Microsoft (Outlook/Azure, personal + work accounts). All via Supabase Auth. **(change)** replaces email+password.
- F2-R2 One page `/login` offers all methods; there is no separate sign-up (`/register` redirects to `/login`). First sign-in creates the account. **(change)**
- F2-R3 **Magic-link emails are sent by the app through the tenant's own SMTP (F9-R10)**, not by Supabase's mailer: the server generates the link/code with the Supabase admin API (`auth.admin.generateLink`), renders a Swedish email with the tenant's name and branding, and sends it. Supabase's built-in email sending is not used.
- F2-R4 Accounts are global (one person, one account across tenants). Signing in with a provider whose verified email matches an existing account links to that account (Supabase identity linking). Q-25
- F2-R5 After sign-in the user returns to the tenant domain and page they started from. **(change, F0)**
- F2-R6 Unauthenticated access to app routes (`/dashboard`, `/admin`, booking pages) redirects to `/login?next=<path>`; signed-in users on `/login` go to `/dashboard`.
- F2-R7 Sign-out available everywhere when signed in, including the waiting page.
- F2-R8 `Done` A member can **delete their own account** (user menu → confirm). Effects: memberships and pending requests removed in all tenants; bookings (future and past) are kept and shown as "Tidigare medlem"; activity log entries keep their text with the actor shown as "Tidigare medlem" (via `ON DELETE SET NULL` on `booked_by`/`actor_id`); the auth user is deleted (`deleteOwnAccount` server action, "Ta bort konto" in the user menu with a `confirm()` dialog).

**Acceptance criteria**
- Given a new person enters their email on `boka.nackswinget.se`, then they receive an email sent via Nackswinget's SMTP with a link/code; using it signs them in and creates their account.
- Given a user signs in with Google on `boka.b.se`, then they end up on `boka.b.se` (not another tenant's domain).
- Given a person first used Google and later the magic link with the same email, then it's the same account.
- Given `/register`, then the user is redirected to `/login`.
- Given Anna deletes her account, then her future booking still blocks its slot, shows "Tidigare medlem" to members, and can only be changed by an admin.

## F3. Approval queue — `Partial`

**Goal:** Only people the club knows can book. Signing in is open; access is granted per tenant by that tenant's admins.

**Requirements**
- F3-R1 When a signed-in user has no membership in the current tenant and no request there, a **pending request is created automatically** with name and email from the auth provider (magic-link users are asked for their name once). **(change)** replaces the mandatory form.
- F3-R2 A pending user sees only the waiting page `/waiting` on app routes: "Din förfrågan väntar på godkännande hos <klubb>", their submitted details, sign-out. They may optionally add community role ∈ {Funktionär, Tävlingsdansare, Annat (+ text)} (fixed list for all tenants) and a short message to the admin.
- F3-R3 At most one open (pending) request per user per tenant; requests are per tenant (approval in club A gives nothing in club B).
- F3-R4 Admin queue at `/admin`: pending requests of the tenant, oldest first, showing name, email, sign-in method, community role, message, requested-at. Actions: **Godkänn** (→ `booker` membership), **Neka** (→ denied, optional reason). Both store reviewer and time.
- F3-R5 On a new request, email every admin of the tenant (one email each, with a link to `/admin`). `Done`
- F3-R6 On approve/deny, email the requester (denial includes the reason if given). `Done`
- F3-R7 Denied users see the denial on `/waiting` and may request again (creates a new pending request); the admin sees earlier denials for that user.
- F3-R8 Approved users are taken from `/waiting` to `/dashboard` on their next page load.
- F3-R9 The public schedule `/` stays public for everyone, including pending users.
- F3-R10 The display name shown on bookings is the name from the approved request; the member can edit it in their profile.

**Data model (change)**
```
access_requests(id, tenant_id, user_id, name, email, provider, community_role NULL,
                message NULL, status pending|approved|denied, deny_reason NULL,
                reviewed_by NULL, reviewed_at NULL, created_at)
  UNIQUE (tenant_id, user_id) WHERE status = 'pending'
profiles(user_id PK, display_name)
```

**Acceptance criteria**
- Given a new user signs in with Facebook on Gåsasteget's domain, then a pending request exists for Gåsasteget with their Facebook name and email, and they land on `/waiting`.
- Given a pending user opens `/dashboard`, then they are redirected to `/waiting`.
- Given a pending user signs in again, then no second request is created.
- Given an admin of Gåsasteget approves, then the user is booker in Gåsasteget only, gets an approval email, and their next load goes to `/dashboard`.
- Given an admin denies with reason "Okänd", then the user sees the denial and reason on `/waiting` and can request again.
- Given a new request, then each admin of that tenant (and nobody else) receives one email.
- Given a non-admin calls the approve action, then nothing changes.

## F4. Bookings — `Partial`

**Goal:** Members book a room for practice, lessons or club activities (e.g. parties) without double-booking. Scope v1: **single bookings only**, always in the booker's own name.

**Requirements**
- F4-R1 A booker creates a booking: room, start date+time, end date+time, title, category (from the tenant's categories, F9-R5). **No time grid and no min/max length**; bookings may span midnight. `booked_by` is always the current user — nobody (incl. admins) books on behalf of others.
- F4-R2 No overlaps in the same room with other confirmed bookings **or** imported occasions in the course room. Touching intervals (end = next start) are allowed.
- F4-R3 A booking may start at most `max_days_ahead` days from today (tenant setting, default 90), and not in the past.
- F4-R4 **Move:** the booker (own bookings, until start) or an admin (any booking, any time) can change room, start and end. The same rules as creation apply (F4-R2, F4-R3). Title/category can also be edited.
- F4-R5 **Cancel:** same permissions as move. Sets status `cancelled` (kept for history), frees the slot, and hides it from the schedule.
- F4-R6 `Done` Every create, move, edit and cancel writes an activity log entry (F8) in the same transaction. Implemented as Postgres RPCs (`create_booking_with_log`, `update_booking_with_log`, `cancel_booking_with_log`, SECURITY DEFINER, atomic function bodies) called from `createBooking`/`updateBooking`/`cancelBooking` instead of two separate client-side writes.
- F4-R7 Booker names are visible to signed-in members only (F1-R2); former members show as "Tidigare medlem".
- F4-R8 Imported courses cannot be created, moved or cancelled here (F5-R6).
- F4-R9 **Former members:** when a membership is removed (F7-R1) or an account deleted (F2-R8), their bookings stay confirmed and keep blocking; only admins can move/cancel them. `booked_by`/`activity_log.actor_id` are `ON DELETE SET NULL`; admin views (`/admin/bookings`) render a null owner as "Tidigare medlem". Not yet wired into the member-facing dashboard UI (F4-R7 name display).
- F4-R10 `Partial` **Conflict flags:** a booking gets a conflict flag when a dans.se sync (F5-R4) or a course-room change (F9-R4) makes an imported occasion overlap it. Flagged bookings stay confirmed and are highlighted to the booker and admins ("Krockar med kurs <name>"); the flag clears when the booking is moved/cancelled or the overlap disappears. Sync-triggered flagging done; F9-R4 course-room-change flagging done (`setCourseRoom` action, immediate flag + summary message, no separate preview-before-confirm step — simplification); admin-side highlighting done (`/admin/bookings`, `/admin/courses`).
- F4-R11 `Done` **Notifications:** the booker is emailed (via tenant SMTP) when someone else (an admin) moves, edits or cancels their booking, or when it gets a conflict flag. Their own changes send no email. Conflict-flag email (`conflictFlagEmail`) and move/edit/cancel-by-admin emails (`bookingChangedByAdminEmail`, `bookingCancelledByAdminEmail`) are both wired in.

**Data model**
```
-- rooms, categories: see F9
bookings(id, tenant_id, room_id, booked_by NULL → auth.users,  -- NULL after account deletion
         category_id, title, starts_at timestamptz, ends_at timestamptz,
         status confirmed|cancelled, conflict_occasion_id NULL,
         created_at, updated_at)
  CHECK (ends_at > starts_at)
  EXCLUDE USING gist (room_id WITH =, tstzrange(starts_at, ends_at, '[)') WITH &&)
    WHERE (status = 'confirmed')
```
Overlap with imported occasions is checked in application code (in the same transaction) against synced occasions; the exclusion constraint covers booking-vs-booking.

**Acceptance criteria**
- Given a confirmed 18:00–20:00 booking in Stora salen, when someone books 19:00–21:00 there, then it's rejected with "Tiden krockar med <title>"; 20:00–22:00 succeeds; 19:00–21:00 in Lilla salen succeeds.
- Given course room = Stora salen and an imported occasion 18:30–19:45, then a booking 19:00–20:00 in Stora salen is rejected; in Lilla salen it succeeds.
- Given a booking 23:00–02:00 or 18:07–18:22, then it's accepted (no grid, no limits).
- Given `max_days_ahead=90`, then a booking starting 91 days ahead is rejected.
- Given booker A, then A cannot move or cancel B's booking; an admin can. Neither can create a booking with `booked_by` ≠ themselves.
- Given a booking started 10 minutes ago, then its booker cannot move or cancel it; an admin can.
- Given A moves their booking from Tue 18–20 to Wed 19–21, then the schedule shows it on Wednesday only and the activity log shows "Anna flyttade 'Träning' från tis 14/4 18:00 till ons 15/4 19:00"; A gets no email.
- Given an admin cancels A's booking, then A gets an email.
- Given a move would create an overlap, then it's rejected and the booking and log stay unchanged.

## F5. dans.se import — `Partial`

**Goal:** Regular courses stay managed in dans.se and are imported automatically. They are read-only here.

**Source: dans.se public API** (OpenAPI: `https://dans.se/api/public/openapi.yml`)
- **Requires the tenant's dans.se API token** (`pw`, found in the club's dans.se organisation settings). A tenant without a token gets **no import**. **(change)** Gåsasteget currently has no token → its schedule shows no dans.se courses until the club provides one; the current HTML-scraping of `/api/json/?contentType=calendar` is removed.
- List: `GET https://dans.se/api/public/events/?org=<org>&pw=<token>` → `{ search: {...}, events: [Event] }` (max 250 rows by default; use `maxRows` if needed).
- Used fields of `Event`: `id`, `key`, `name`, `source` (dans.se URL), `place`, `category.name`, `instructorsName`, `registration.url`, `schedule { dayAndTimeInfo, start, end, occasions[] }`.
- `schedule.occasions[]`: `{ startDateTime: "YYYY-MM-DD HH:MM:SS", endDateTime, startDayOfWeek, length (seconds) }`, local time in the tenant's timezone. **Source of truth for occasion dates.**
- Authenticated responses also include `statistics`, `hiddenStaff`, etc. **Only course and occasion fields listed above are stored**; nothing else is persisted or shown.

**Requirements**
- F5-R1 `Done` For each tenant with org + token, a sync fetches the event list daily at 04:00 UTC (Vercel Hobby cron limit; on demand via "Synka nu"), upserts courses by dans.se `id`, and replaces their occasions. Courses gone from the feed are marked removed and hidden. Cron: `app/api/cron/dans-se-sync/route.ts` + `vercel.json` (`0 4 * * *`, `CRON_SECRET`); on-demand: `syncDansSeNow` server action.
- F5-R2 `Done` **All imported courses occupy the tenant's course room** (F9-R4). No per-course room assignment and no dans.se place mapping.
- F5-R3 `Done` Admin view "Importerade kurser" (`/admin/courses`): imported courses with name, schedule text, number of occasions, and count of bookings they conflict with. Built via `get_imported_courses_with_conflicts` RPC.
- F5-R4 `Done` **Conflicts:** when a sync adds/changes occasions that overlap existing confirmed bookings in the course room, those bookings keep their slot and get a conflict flag (F4-R10); the booker is emailed (F4-R11) and admins see the conflicts in the admin view (`/admin/courses`, `/admin/bookings`). The sync is never blocked by bookings.
- F5-R5 `Planned` If the tenant has no course room set, courses show on the schedule marked "Lokal ej vald" and block nothing. Not built this pass (no course room → no imported occasions shown at all, which is safe but not the exact UX).
- F5-R6 `Done` Imported courses and occasions cannot be created, edited, moved or cancelled in this system; the UI links to `source` on dans.se instead. Calendar renders them read-only (clicks on imported blocks are a no-op); "link to source" not yet in the UI.
- F5-R7 `Done` If the sync fails (network, 5xx, invalid token), the last synced data stays in use; admins see "Senaste synk misslyckades <time>: <reason>" on `/superadmin/[slug]` and on `/admin/settings`.
- F5-R8 `Done` dans.se changes are **not** written to the activity log.
- F5-R9 `Done` Parsing is covered by fixture tests with recorded API responses (with personal data stripped from fixtures): `lib/dans-se/client.test.ts`, `lib/dans-se/__fixtures__/events.json`.

**Data model**
```
imported_courses(id, tenant_id, dans_se_id, dans_se_key, name, category, place,
                 instructors, source_url, schedule_text, removed_at NULL, synced_at)
  UNIQUE (tenant_id, dans_se_id)
imported_occasions(id, tenant_id, course_id, starts_at, ends_at)
dans_se_sync_runs(id, tenant_id, started_at, finished_at, ok, error NULL, events_found)
```

**Acceptance criteria**
- Given a fixture event (nsw 289160) with 7 entries in `schedule.occasions`, then exactly those 7 occasions are imported (2026-08-24 … 2026-10-05, 19:45–21:00, Europe/Stockholm).
- Given the API response contains `statistics`/`hiddenStaff`, then none of it is persisted.
- Given a tenant without a token, then no sync runs and the schedule shows only bookings.
- Given course room = Stora salen and Anna's booking Mon 19:00–20:00, when a sync adds a course occasion Mon 19:45–21:00, then Anna's booking stays, gets a conflict flag, Anna gets an email, and the admin view lists the conflict.
- Given a booker opens an imported course, then no edit/move/cancel controls are shown, only a link to dans.se.
- Given the dans.se API returns 500 during sync, then the schedule keeps showing the previously synced courses.

## F6. Member app layout — `Partial`

**Goal:** Once signed in to a club, members land directly in the calendar and can book from there.

**Requirements**
- F6-R1 Approved members (booker/admin) land on `/dashboard` **(change)**, which is the calendar view (replaces the current profile-only page).
- F6-R2 Layout: header (tenant logo, user menu with profile/sign-out/delete account, Admin link for admins) · **left sidebar with the tenant's rooms** · **main area: calendar**.
- F6-R3 Sidebar "Lokaler" lists the tenant's active rooms (in `sort_order`), plus "Alla lokaler" (default). Selecting a room filters the calendar to that room's bookings (and imported courses if it's the course room). The selection is reflected in the URL (`?room=<id>`) so it survives reloads and can be shared.
- F6-R4 Calendar: **month and week** (week with time axis). Default: week on desktop, month on mobile. Items show time, title, category colour and the booker's name; own bookings and conflict-flagged bookings are highlighted.
- F6-R5 A primary button **"+ Lägg till aktivitet"** (always visible: in the header on desktop, floating action button on mobile) opens the booking form (F4-R1), prefilled with the selected room and, if a day/time slot was clicked, that date/time.
- F6-R6 Clicking a booking opens its details; the booker (own, before start) or an admin sees **Flytta** and **Ställ in** (F4-R4/R5). Imported courses show details and a link to dans.se only.
- F6-R7 "Mina bokningar": list of the user's upcoming bookings (conflicts first), reachable from the user menu or sidebar.
- F6-R8 The activity log (F8) is shown in the member view (below the calendar or as a sidebar section).
- F6-R9 Mobile (<768px): the sidebar collapses into a room selector (dropdown/drawer) above the calendar; no horizontal scroll at 360px.

**Acceptance criteria**
- Given an approved member signs in on desktop, then they see the room sidebar and this week's calendar; on a 360px screen, this month's calendar with the room selector above it and the add button floating bottom-right.
- Given they click "Lilla salen" in the sidebar, then the URL has `?room=<lilla>` and only Lilla salen items are shown; reloading keeps the filter.
- Given "Lilla salen" is selected and they click "+ Lägg till aktivitet", then the form opens with room = Lilla salen.
- Given they click an empty day (e.g. 14 April) in the calendar, then the form opens with date = 14 April.

## F7. Tenant administration — `Partial`

- F7-R1 `Done` Members (`/admin/members`): list members with role; grant/revoke `booker`/`admin`; remove membership. Removing shows how many future bookings the member has (returned in the action's message); they are kept (F4-R9). An admin cannot remove or demote the tenant's last admin (`admin_count_in_tenant` RPC guard).
- F7-R2 `Done` Rooms and course room: see F9-R4. Categories: see F9-R5.
- F7-R3 `Done` Tenant settings, theme, dans.se and SMTP: see F9 (`/admin/settings`).
- F7-R4 `Done` All bookings (`/admin/bookings`): list/filter by room/user/conflict (query params, server-side filtering — no date-range filter, simplification); move/cancel any (reuses `updateBooking`/`cancelBooking`).

**Acceptance criteria**
- Given tenant A has one admin, when that admin tries to demote themselves, then it's rejected.
- Given room X is deactivated, then it's hidden from the booking form and new bookings in X are rejected.
- Given an admin removes Erik who has 3 future bookings, then the confirmation says 3 bookings will be kept, and afterwards they show as "Tidigare medlem".

## F8. Activity log — `Partial`

**Goal:** Members can see when bookings change, so moved or cancelled activities aren't missed.

**Requirements**
- F8-R1 Log entry types: `created`, `moved` (room and/or time changed), `edited` (title/category only), `cancelled`. Each stores who, when, the booking, and before/after values.
- F8-R2 The member view shows "Senaste ändringar": the latest 20 entries of the tenant, newest first, in plain Swedish (e.g. "Anna flyttade 'Fest' från fre 10/4 19:00 Stora salen till lör 11/4 19:00 Lilla salen", "Erik ställde in 'Träning' tis 14/4 18:00").
- F8-R3 Entries for bookings that happen within the next 7 days are visually highlighted.
- F8-R4 **Members only**: visible to bookers and admins of the tenant; not shown to visitors or pending users. RLS enforces this.
- F8-R5 Entries are append-only (no edit/delete via the app; inserts only through the booking actions).
- F8-R6 dans.se sync changes are not logged (F5-R8).

**Data model**
```
activity_log(id, tenant_id, booking_id, actor_id NULL, type created|moved|edited|cancelled,
             before jsonb, after jsonb, created_at)
```

**Acceptance criteria**
- Given a booking is moved, then exactly one `moved` entry exists with the old and new room/time, and it appears first under "Senaste ändringar".
- Given a move is rejected for overlap, then no log entry is written.
- Given 25 entries, then the member view shows the 20 newest.
- Given a visitor or pending user, then no activity log is shown and a direct query returns no rows.

## F9. Super-admin & tenant settings — `Partial` (tenant settings mostly `Done`/`Partial`, super-admin unchanged this pass)

**Goal:** The platform owner can onboard clubs, and each club can configure its import, rooms, categories, email and look.

**Super-admin**
- F9-R1 Super-admins are listed in `platform_admins(email)`, seeded by migration with `buggfille@gmail.com`. A user whose verified email is in that table is super-admin; no UI to grant it.
- F9-R2 `/superadmin` (super-admins only): list tenants (name, domains, #members, #pending requests, last dans.se sync, SMTP status); create tenant (name, slug, first domain); edit/deactivate tenant; manage domains (UI reminds that the domain must be added in Vercel and in Supabase Auth redirect URLs); appoint/remove tenant admins by email (if the person hasn't signed in yet, the admin membership is created on their first sign-in).
- F9-R3 A super-admin can open any tenant and acts as its admin there (bypassing the approval queue). Every super-admin change is written to an audit log.
- F9-R12 **Go-live check:** a tenant can't be activated until its SMTP test (F9-R10) succeeds.

**Tenant settings** (`/admin/settings`, editable by tenant admins and super-admins)
- F9-R4 `Partial` **Lokaler (rooms):** create/rename/reorder/deactivate rooms (title, active — description editable via `updateRoom` but no dedicated UI field yet); choose the **course room**. Simplification: changing the course room immediately flags conflicting bookings and returns a summary message ("X bokningar flaggades") instead of a separate preview-before-confirm step (F4-R10). Deactivated rooms can't be booked; existing bookings stay.
- F9-R5 `Done` **Kategorier:** create/recolour/deactivate booking categories (name + colour) at `/admin/settings`. New tenants start with Träning, Privatlektion, Föreningsaktivitet (default colours, from existing seed). At least one active category is required (enforced server-side). Rename/reorder UI not built (simplification — colour/active toggle and create are).
- F9-R6 `Partial` **General** (`/admin/settings`): name, timezone (default `Europe/Stockholm`), max days ahead for bookings (default 90), `logo_url` as a plain text field. Logo upload (PNG/SVG) not built — skipped, plain URL field only.
- F9-R7 `Done` (unchanged) **dans.se import:** dans.se link or org slug and API token — still at `/superadmin/[slug]`; save/sync logic factored into `lib/tenant-settings/save.ts` and reused by `/admin/settings`.
- F9-R8 `Partial` **Theme** (`/admin/settings`): hex colour inputs for primary, primary text (on primary), secondary, accent, background, surface, text, muted text, header gradient start/end; saved to `tenants.theme` jsonb. Applied as server-rendered CSS variables in the root layout (`:root{--color-primary:...}` etc., no flash of default colours) — but existing components still use hard-coded Tailwind colours, not the new CSS vars, so themes are not yet visually applied (simplification, noted). No live preview, no "Återställ standard", no contrast warning (all skipped).
- F9-R10 **E-post (SMTP):** host, port, security (TLS/STARTTLS), username, password, from name, from address. **All tenant email (magic links, queue notifications, decisions, booking notifications) is sent through this server.** "Skicka testmejl" sends a test to the current admin and shows the result. Send failures are logged and shown to admins in settings. `Done` — implemented at `/superadmin/[slug]` (not yet `/admin/settings`; tenant-admin-facing route is future work).
- F9-R11 **Secrets** (dans.se token, SMTP password): stored encrypted at rest, server-only (never sent to the browser, no RLS read access), write-only in the UI (shown as "••• sparad", can be replaced or removed, never displayed again), never written to logs. Only tenant admins and super-admins can set them. `Done` for SMTP password (app-side AES-256-GCM, `SMTP_ENC_KEY`); dans.se token encryption unchanged/still plaintext.

**Data model**
```
platform_admins(email PK)
tenants(id, slug UNIQUE, name, active, timezone, max_days_ahead DEFAULT 90, logo_url,
        dans_se_org NULL, course_room_id NULL, theme jsonb,
        smtp_host, smtp_port, smtp_security, smtp_user, smtp_from_name, smtp_from_address,
        created_at)
tenant_secrets(tenant_id PK, dans_se_token_enc NULL, smtp_password_enc NULL)  -- no client access
tenant_domains(domain PK, tenant_id)
rooms(id, tenant_id, title, description, active, sort_order)
categories(id, tenant_id, name, color, active, sort_order)
email_log(id, tenant_id, to_address, template, ok, error NULL, created_at)  -- no bodies stored
audit_log(id, actor_id, tenant_id NULL, action, details jsonb, created_at)
```
`theme` = `{ primary, onPrimary, secondary, accent, background, surface, text, mutedText, headerFrom, headerTo }` (hex).

**Acceptance criteria**
- Given `buggfille@gmail.com` is seeded in `platform_admins` and signs in, then `/superadmin` is available; for any other user it's denied.
- Given the super-admin creates tenant "Nackswinget" (`nsw`) with domain `boka.nackswinget.se` and admin `x@y.se`, then when x@y.se first signs in on that domain they are admin there without going through the queue.
- Given a tenant without a successful SMTP test, then it can't be activated.
- Given an admin enters `https://dans.se/nsw/` and a valid token, then `nsw` is stored and the page shows "5 evenemang hittades"; with an invalid token it shows the dans.se error.
- Given a saved token, then the settings page never shows its value and it isn't present in any API response or log.
- Given a tenant admin sets primary to `#0B6E4F` and saves, then buttons and the header on that tenant's domain use it on next load, and other tenants are unaffected.
- Given text `#777777` on background `#FFFFFF`, then a contrast warning is shown.
- Given the course room changes from Stora to Lilla salen and 2 bookings in Lilla salen overlap course occasions, then the admin sees those 2 before confirming, and after confirming they are flagged.
- Given a tenant admin of A, then they cannot open `/superadmin` or B's settings.

---

## Non-functional

- UI language: Swedish. URL paths are English (`/login`, `/register`, `/waiting`, `/dashboard`, `/admin`, `/superadmin`). **(change)** from `/logga-in`, `/registrera`; old paths redirect to the new ones.
- Look & feel: tenant theme; Gåsasteget uses the gasasteget.se palette, Inter/Montserrat, and its logo.
- Mobile-first: works at 360px wide, no horizontal scroll.
- Stack: Next.js 15 App Router, Supabase (auth, Postgres, RLS), Tailwind v4, Vercel (custom domain per tenant).
- Authorization is enforced twice: in server actions (permission helpers) **and** by RLS. Tenant scoping is enforced by RLS, never only in the UI.
- Privacy: visitors never see member names or the activity log; only needed data from dans.se is stored; email bodies are not stored.
- Email: tenant SMTP only (F9-R10), via a Node SMTP client (e.g. nodemailer) from server code. Emails are in Swedish and show the tenant's name.
- Environments: **local Supabase** (Supabase CLI + Docker) for development and tests; one **staging** Supabase project for Vercel previews; **production** separate. Migrations in `supabase/migrations/` (Supabase CLI), replacing the single `seed.sql`; seed data (platform admin, demo tenant) in `supabase/seed.sql`.
- Every feature ships with vitest tests for its acceptance criteria; RLS rules get SQL/integration tests against local Supabase.
- Times are stored as `timestamptz` and shown in the tenant's timezone.

## Suggested build order

1. Environments (local Supabase, migrations) + F0 tenancy (memberships, tenant resolution, RLS, migration of existing data).
2. F9-R1/R2 super-admin + seed; F9-R10/R11 SMTP + secrets; F2 magic link via tenant SMTP; F3 auto-queue and `/waiting`.
3. F9-R4/R5 rooms + categories; F6 member layout; F4 bookings (create/move/cancel, notifications); F8 activity log; F1 schedule integration.
4. F5 dans.se sync (token) + conflicts; NSW as first tenant with import.
5. F9-R6–R8 general settings & theme editor; F3-R5/R6 queue emails; F7 remaining admin; F2-R8 account deletion.

## Open questions

Each has a proposed default in *italics*; agents may use it until decided.

- Q-25 Automatic account linking across providers by email — accept the risk of an unverified-email provider? *Link only when the provider reports a verified email (Supabase default); otherwise separate accounts.*
