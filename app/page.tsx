import { Logo } from "@/app/components/logo";
import { MonthCalendar } from "./components/calendar/MonthCalendar";
import { getCurrentTenant, getTenantLogoUrl } from "@/lib/tenant/current";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/permissions";
import { toTenantLocalIso } from "@/lib/tenant/timezone";
import { DashboardClient } from "./dashboard-client";
import { ActivityLog, type ActivityLogRow } from "./activity-log";
import { WaitingScreen } from "./waiting-screen";
import { ensureAccessRequest } from "./(protected)/actions";
import { bookerDisplayName } from "./components/calendar/types";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ room?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return await PublicSchedule();
  }

  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.roles.length === 0) {
    await ensureAccessRequest();
    return <WaitingScreen user={user} />;
  }

  const { room: selectedRoomId } = await searchParams;
  const tenant = await getCurrentTenant();
  if (!tenant) return null;

  const isAdmin = currentUser.roles.includes("admin");

  const [tenantRow, roomsRes, categoriesRes, bookingsRes, logRes, importedRes] =
    await Promise.all([
      supabase.from("tenants").select("timezone, course_room_id").eq("id", tenant.id).single(),
      supabase
        .from("rooms")
        .select("id, title")
        .eq("tenant_id", tenant.id)
        .eq("active", true)
        .order("sort_order"),
      supabase
        .from("categories")
        .select("id, name")
        .eq("tenant_id", tenant.id)
        .eq("active", true)
        .order("sort_order"),
      supabase
        .from("bookings")
        .select(
          "id, room_id, category_id, title, starts_at, ends_at, booked_by, status, conflict_occasion_id"
        )
        .eq("tenant_id", tenant.id)
        .eq("status", "confirmed"),
      supabase
        .from("activity_log")
        .select("id, type, before, after, created_at, actor_id, booking_id")
        .eq("tenant_id", tenant.id)
        .order("created_at", { ascending: false })
        .limit(20),
      // F5: imported courses (read-only), joined with their occasions.
      supabase
        .from("imported_occasions")
        .select("id, starts_at, ends_at, imported_courses(name, removed_at)")
        .eq("tenant_id", tenant.id),
    ]);

  const timezone = tenantRow.data?.timezone ?? "Europe/Stockholm";
  const hasCourseRoom = Boolean(tenantRow.data?.course_room_id);
  const rooms = roomsRes.data ?? [];
  const categories = categoriesRes.data ?? [];

  const now = new Date();

  // F4-R7: resolve booker display names for signed-in members. booked_by is
  // NULL for former members' bookings (F4-R9), which render as "Tidigare medlem".
  const bookerIds = Array.from(
    new Set(
      (bookingsRes.data ?? [])
        .map((b) => b.booked_by)
        .filter((id): id is string => Boolean(id))
    )
  );
  const bookerNames = new Map<string, string>();
  if (bookerIds.length > 0) {
    const { data: bookers } = await supabase.rpc("get_user_display_names", {
      p_user_ids: bookerIds,
    });
    if (Array.isArray(bookers)) {
      for (const u of bookers as { id: string; name: string }[]) {
        bookerNames.set(u.id, u.name);
      }
    }
  }

  const bookings = (bookingsRes.data ?? []).map((b) => ({
    id: b.id,
    roomId: b.room_id,
    categoryId: b.category_id,
    title: b.title,
    startsAt: toTenantLocalIso(b.starts_at, timezone),
    endsAt: toTenantLocalIso(b.ends_at, timezone),
    canModify: isAdmin || (b.booked_by === user.id && new Date(b.starts_at) > now),
    hasConflict: Boolean(b.conflict_occasion_id),
    bookerName: bookerDisplayName(b.booked_by, bookerNames),
  }));

  // F5-R6: imported occasions render read-only on the calendar.
  const importedOccasions = (importedRes.data ?? [])
    .filter((occ) => {
      const course = occ.imported_courses as unknown as
        | { name: string; removed_at: string | null }
        | null;
      return course && !course.removed_at;
    })
    .map((occ) => {
      const course = occ.imported_courses as unknown as { name: string };
      // F5-R5: no course room configured → occasions still show, labeled.
      const name = hasCourseRoom ? course.name : `${course.name} (Lokal ej vald)`;
      return {
        id: occ.id,
        name,
        startsAt: toTenantLocalIso(occ.starts_at, timezone),
        endsAt: toTenantLocalIso(occ.ends_at, timezone),
      };
    });

  // Resolve actor display names + room titles for the log, best-effort.
  const actorIds = Array.from(
    new Set((logRes.data ?? []).map((e) => e.actor_id).filter((id): id is string => Boolean(id)))
  );
  const actorNames = new Map<string, string>();
  if (actorIds.length > 0) {
    const { data: users } = await supabase.rpc("get_user_display_names", {
      p_user_ids: actorIds,
    });
    if (Array.isArray(users)) {
      for (const u of users as { id: string; name: string }[]) {
        actorNames.set(u.id, u.name);
      }
    }
  }

  const roomTitleById = new Map(rooms.map((r) => [r.id, r.title]));

  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const activityEntries: ActivityLogRow[] = (logRes.data ?? []).map((e) => {
    const before = e.before as { title?: string; roomId?: string; startsAt?: string } | null;
    const after = e.after as { title?: string; roomId?: string; startsAt?: string } | null;
    const relevantStart = after?.startsAt ?? before?.startsAt;
    const soon = relevantStart
      ? new Date(relevantStart) > now && new Date(relevantStart) < sevenDaysFromNow
      : false;

    return {
      id: e.id,
      type: e.type as ActivityLogRow["type"],
      actorName: (e.actor_id && actorNames.get(e.actor_id)) || "Någon",
      before: before
        ? { title: before.title, roomTitle: before.roomId ? roomTitleById.get(before.roomId) : undefined, startsAt: before.startsAt }
        : null,
      after: after
        ? { title: after.title, roomTitle: after.roomId ? roomTitleById.get(after.roomId) : undefined, startsAt: after.startsAt }
        : null,
      createdAt: e.created_at,
      soon,
    };
  });

  return (
    <div>
      <DashboardClient
        rooms={rooms}
        categories={categories}
        bookings={bookings}
        importedOccasions={importedOccasions}
        selectedRoomId={selectedRoomId ?? null}
      />
      <ActivityLog entries={activityEntries} />
    </div>
  );
}

async function PublicSchedule() {
  const tenant = await getCurrentTenant();
  const logoUrl = tenant ? await getTenantLogoUrl(tenant.id) : null;

  return (
    <main className="flex min-h-screen flex-col bg-gray-warm">
      <header className="hero-gradient text-white">
        <div className="mx-auto max-w-5xl px-4 pt-6 pb-10 sm:pb-14">
          <Logo variant="horizontal" className="h-10 w-auto" logoUrl={logoUrl} />
          <h1 className="mt-8 font-display text-3xl font-extrabold uppercase tracking-[0.2em] sm:text-5xl">
            Schema
          </h1>
          <p className="mt-3 max-w-xl text-white/85">
            Kurser, socialdans och event i klubbens lokal.
          </p>
        </div>
      </header>
      <div className="mx-auto mt-6 w-full max-w-5xl flex-1 px-4 pb-12">
        <MonthCalendar />
      </div>
    </main>
  );
}
