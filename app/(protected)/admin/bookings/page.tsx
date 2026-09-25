import { requireRole } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTenant } from "@/lib/tenant/current";
import { AdminBookingsTable } from "./admin-bookings-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Bokningar - Gasasteget",
};

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ room?: string; user?: string; conflict?: string }>;
}) {
  await requireRole("admin");
  const tenant = await getCurrentTenant();
  if (!tenant) return null;

  const { room, user: userFilter, conflict } = await searchParams;

  const supabase = await createClient();

  const [roomsRes, membersRes] = await Promise.all([
    supabase.from("rooms").select("id, title").eq("tenant_id", tenant.id).order("sort_order"),
    supabase.rpc("get_tenant_members", { p_tenant_id: tenant.id }),
  ]);

  let query = supabase
    .from("bookings")
    .select("id, room_id, category_id, title, starts_at, ends_at, booked_by, status, conflict_occasion_id")
    .eq("tenant_id", tenant.id)
    .eq("status", "confirmed")
    .order("starts_at", { ascending: true });

  if (room) query = query.eq("room_id", room);
  if (userFilter) query = query.eq("booked_by", userFilter);
  if (conflict === "1") query = query.not("conflict_occasion_id", "is", null);

  const { data: bookings } = await query;

  const rooms = roomsRes.data ?? [];
  const members = membersRes.data ?? [];
  const roomTitleById = new Map(rooms.map((r) => [r.id, r.title]));
  const memberNameById = new Map(
    (members as { user_id: string; name: string }[]).map((m) => [m.user_id, m.name])
  );

  const rows = (bookings ?? []).map((b) => ({
    id: b.id,
    title: b.title,
    roomTitle: roomTitleById.get(b.room_id) ?? "—",
    ownerName: b.booked_by ? memberNameById.get(b.booked_by) ?? "Tidigare medlem" : "Tidigare medlem",
    startsAt: b.starts_at,
    endsAt: b.ends_at,
    hasConflict: Boolean(b.conflict_occasion_id),
    categoryId: b.category_id,
  }));

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Alla bokningar</h1>
      <p className="mt-2 text-gray-600">F7-R4: filtrera och hantera alla klubbens bokningar.</p>

      <form className="mt-4 flex flex-wrap gap-2" method="get">
        <select name="room" defaultValue={room ?? ""} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
          <option value="">Alla lokaler</option>
          {rooms.map((r) => (
            <option key={r.id} value={r.id}>
              {r.title}
            </option>
          ))}
        </select>
        <select name="user" defaultValue={userFilter ?? ""} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
          <option value="">Alla användare</option>
          {(members as { user_id: string; name: string }[]).map((m) => (
            <option key={m.user_id} value={m.user_id}>
              {m.name}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" name="conflict" value="1" defaultChecked={conflict === "1"} />
          Endast krockande
        </label>
        <button type="submit" className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white">
          Filtrera
        </button>
      </form>

      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6">
        <AdminBookingsTable rows={rows} rooms={rooms} />
      </div>
    </div>
  );
}
