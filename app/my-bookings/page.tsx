import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/permissions";
import { getCurrentTenant, getTenantLogoUrl } from "@/lib/tenant/current";
import { toTenantLocalIso } from "@/lib/tenant/timezone";
import { sortMyBookings, upcomingBookings, type MyBooking } from "@/lib/bookings/my-bookings";
import { AppHeader } from "@/app/components/app-header";

export const dynamic = "force-dynamic";

/** F6-R7: signed-in user's upcoming bookings, conflicts first. */
export default async function MinaBokningarPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.roles.length === 0) redirect("/");

  const tenant = await getCurrentTenant();
  if (!tenant) return null;

  const isAdmin = currentUser.roles.includes("admin");
  const logoUrl = await getTenantLogoUrl(tenant.id);

  const [tenantRow, roomsRes, bookingsRes] = await Promise.all([
    supabase.from("tenants").select("timezone").eq("id", tenant.id).single(),
    supabase.from("rooms").select("id, title").eq("tenant_id", tenant.id),
    supabase
      .from("bookings")
      .select("id, room_id, title, starts_at, ends_at, conflict_occasion_id")
      .eq("tenant_id", tenant.id)
      .eq("status", "confirmed")
      .eq("booked_by", user.id),
  ]);

  const timezone = tenantRow.data?.timezone ?? "Europe/Stockholm";
  const roomTitleById = new Map((roomsRes.data ?? []).map((r) => [r.id, r.title]));
  const nowLocalIso = toTenantLocalIso(new Date().toISOString(), timezone);

  const all: MyBooking[] = (bookingsRes.data ?? []).map((b) => ({
    id: b.id,
    title: b.title,
    roomTitle: roomTitleById.get(b.room_id) ?? "",
    startsAt: toTenantLocalIso(b.starts_at, timezone),
    endsAt: toTenantLocalIso(b.ends_at, timezone),
    hasConflict: Boolean(b.conflict_occasion_id),
  }));

  const bookings = sortMyBookings(upcomingBookings(all, nowLocalIso));

  return (
    <div className="min-h-screen bg-gray-warm">
      <AppHeader logoUrl={logoUrl} userEmail={user.email} isAdmin={isAdmin} />
      <main className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="font-display text-xl font-extrabold uppercase tracking-[0.1em] text-purple-dark">
            Mina bokningar
          </h1>
          <Link href="/" className="text-sm font-semibold text-purple-dark hover:underline">
            ← Till kalendern
          </Link>
        </div>

        {bookings.length === 0 ? (
          <p className="text-sm text-gray-600">Du har inga kommande bokningar.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {bookings.map((b) => (
              <li
                key={b.id}
                className={`rounded-lg border px-4 py-3 ${
                  b.hasConflict ? "border-red-300 bg-red-50" : "border-gray-warm bg-white"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-purple-dark">{b.title}</span>
                  {b.hasConflict && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                      Krockar
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600">
                  {b.startsAt.slice(0, 10)} {b.startsAt.slice(11, 16)}–{b.endsAt.slice(11, 16)} · {b.roomTitle}
                </p>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
