import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/permissions";
import { getCurrentTenant } from "@/lib/tenant/current";
import { DashboardClient } from "./dashboard-client";
import { ActivityLog, type ActivityLogRow } from "./activity-log";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Dashboard - Gasasteget",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ room?: string }>;
}) {
  const { room: selectedRoomId } = await searchParams;
  const user = await getCurrentUser();
  const tenant = await getCurrentTenant();

  if (!user || !tenant) {
    return null;
  }

  const supabase = await createClient();
  const isAdmin = user.roles.includes("admin");

  const [roomsRes, categoriesRes, bookingsRes, logRes] = await Promise.all([
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
      .select("id, room_id, category_id, title, starts_at, ends_at, booked_by, status")
      .eq("tenant_id", tenant.id)
      .eq("status", "confirmed"),
    supabase
      .from("activity_log")
      .select("id, type, before, after, created_at, actor_id, booking_id")
      .eq("tenant_id", tenant.id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const rooms = roomsRes.data ?? [];
  const categories = categoriesRes.data ?? [];

  const now = new Date();
  const bookings = (bookingsRes.data ?? []).map((b) => ({
    id: b.id,
    roomId: b.room_id,
    categoryId: b.category_id,
    title: b.title,
    startsAt: b.starts_at,
    endsAt: b.ends_at,
    canModify: isAdmin || (b.booked_by === user.id && new Date(b.starts_at) > now),
  }));

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
        selectedRoomId={selectedRoomId ?? null}
      />
      <ActivityLog entries={activityEntries} />
    </div>
  );
}
