"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/permissions";
import { getCurrentTenant } from "@/lib/tenant/current";
import {
  validateBooking,
  canModifyBooking,
  type ExistingBooking,
  type ImportedOccasion,
} from "@/lib/bookings/validation";

export type ActionResult = { ok: true } | { ok: false; error: string };

async function loadExistingBookings(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string
): Promise<ExistingBooking[]> {
  const { data } = await supabase
    .from("bookings")
    .select("id, room_id, starts_at, ends_at, title, status")
    .eq("tenant_id", tenantId)
    .eq("status", "confirmed");

  return (data ?? []).map((b) => ({
    id: b.id,
    roomId: b.room_id,
    startsAt: b.starts_at,
    endsAt: b.ends_at,
    title: b.title,
    status: b.status as "confirmed" | "cancelled",
  }));
}

/** F5-R2: imported occasions all occupy the tenant's course room. */
async function loadImportedOccasions(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string,
  courseRoomId: string | null
): Promise<ImportedOccasion[]> {
  if (!courseRoomId) return [];
  const { data } = await supabase
    .from("imported_occasions")
    .select("starts_at, ends_at, imported_courses!inner(removed_at)")
    .eq("tenant_id", tenantId)
    .is("imported_courses.removed_at", null);

  return (data ?? []).map((occ) => ({
    roomId: courseRoomId,
    startsAt: occ.starts_at,
    endsAt: occ.ends_at,
  }));
}

async function logActivity(
  supabase: Awaited<ReturnType<typeof createClient>>,
  params: {
    tenantId: string;
    bookingId: string;
    actorId: string;
    type: "created" | "moved" | "edited" | "cancelled";
    before: Record<string, unknown> | null;
    after: Record<string, unknown> | null;
  }
) {
  await supabase.from("activity_log").insert({
    tenant_id: params.tenantId,
    booking_id: params.bookingId,
    actor_id: params.actorId,
    type: params.type,
    before: params.before,
    after: params.after,
  });
}

/** F4-R1: create a booking. Always booked_by = current user. */
export async function createBooking(input: {
  roomId: string;
  categoryId: string;
  title: string;
  startsAt: string;
  endsAt: string;
}): Promise<ActionResult> {
  const user = await getCurrentUser();
  const tenant = await getCurrentTenant();
  if (!user || !tenant) return { ok: false, error: "Inte inloggad" };
  if (!user.permissions.includes("bookings.create")) {
    return { ok: false, error: "Ingen behörighet" };
  }

  const supabase = await createClient();

  const { data: tenantRow } = await supabase
    .from("tenants")
    .select("max_days_ahead, course_room_id")
    .eq("id", tenant.id)
    .single();
  const maxDaysAhead = tenantRow?.max_days_ahead ?? 90;

  const existing = await loadExistingBookings(supabase, tenant.id);
  const importedOccasions = await loadImportedOccasions(
    supabase,
    tenant.id,
    tenantRow?.course_room_id ?? null
  );

  const result = validateBooking(input, {
    maxDaysAhead,
    existingBookings: existing,
    importedOccasions,
  });
  if (!result.ok) return result;

  const { data: inserted, error } = await supabase
    .from("bookings")
    .insert({
      tenant_id: tenant.id,
      room_id: input.roomId,
      category_id: input.categoryId,
      title: input.title,
      starts_at: input.startsAt,
      ends_at: input.endsAt,
      booked_by: user.id,
    })
    .select("id")
    .single();

  if (error || !inserted) {
    return { ok: false, error: error?.message ?? "Tiden krockar med en annan bokning" };
  }

  await logActivity(supabase, {
    tenantId: tenant.id,
    bookingId: inserted.id,
    actorId: user.id,
    type: "created",
    before: null,
    after: { title: input.title, roomId: input.roomId, startsAt: input.startsAt },
  });

  revalidatePath("/dashboard");
  return { ok: true };
}

/** F4-R4: move/edit a booking. Booker (own, before start) or admin. */
export async function updateBooking(
  bookingId: string,
  input: {
    roomId: string;
    categoryId: string;
    title: string;
    startsAt: string;
    endsAt: string;
  }
): Promise<ActionResult> {
  const user = await getCurrentUser();
  const tenant = await getCurrentTenant();
  if (!user || !tenant) return { ok: false, error: "Inte inloggad" };

  const supabase = await createClient();

  const { data: existingBooking } = await supabase
    .from("bookings")
    .select("id, room_id, category_id, title, starts_at, ends_at, booked_by, status")
    .eq("id", bookingId)
    .eq("tenant_id", tenant.id)
    .single();

  if (!existingBooking) return { ok: false, error: "Bokningen hittades inte" };

  const isAdmin = user.roles.includes("admin");
  const isOwn = existingBooking.booked_by === user.id;

  if (!canModifyBooking({ isAdmin, isOwnBooking: isOwn, bookingStartsAt: existingBooking.starts_at })) {
    return { ok: false, error: "Du kan inte ändra denna bokning" };
  }

  const { data: tenantRow } = await supabase
    .from("tenants")
    .select("max_days_ahead, course_room_id")
    .eq("id", tenant.id)
    .single();
  const maxDaysAhead = tenantRow?.max_days_ahead ?? 90;

  const existing = await loadExistingBookings(supabase, tenant.id);
  const importedOccasions = await loadImportedOccasions(
    supabase,
    tenant.id,
    tenantRow?.course_room_id ?? null
  );

  const result = validateBooking(input, {
    maxDaysAhead,
    existingBookings: existing,
    importedOccasions,
    excludeBookingId: bookingId,
  });
  if (!result.ok) return result;

  const { error } = await supabase
    .from("bookings")
    .update({
      room_id: input.roomId,
      category_id: input.categoryId,
      title: input.title,
      starts_at: input.startsAt,
      ends_at: input.endsAt,
      updated_at: new Date().toISOString(),
      // F4-R10: moving a booking clears any conflict flag; a new one is
      // recomputed by the next sync if it still overlaps.
      conflict_occasion_id: null,
    })
    .eq("id", bookingId);

  if (error) return { ok: false, error: "Tiden krockar med en annan bokning" };

  const roomChanged = existingBooking.room_id !== input.roomId;
  const timeChanged =
    existingBooking.starts_at !== input.startsAt || existingBooking.ends_at !== input.endsAt;
  const type: "moved" | "edited" = roomChanged || timeChanged ? "moved" : "edited";

  await logActivity(supabase, {
    tenantId: tenant.id,
    bookingId,
    actorId: user.id,
    type,
    before: {
      title: existingBooking.title,
      roomId: existingBooking.room_id,
      startsAt: existingBooking.starts_at,
    },
    after: { title: input.title, roomId: input.roomId, startsAt: input.startsAt },
  });

  revalidatePath("/dashboard");
  return { ok: true };
}

/** F4-R5: cancel a booking. Booker (own, before start) or admin. */
export async function cancelBooking(bookingId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  const tenant = await getCurrentTenant();
  if (!user || !tenant) return { ok: false, error: "Inte inloggad" };

  const supabase = await createClient();

  const { data: existingBooking } = await supabase
    .from("bookings")
    .select("id, room_id, title, starts_at, ends_at, booked_by, status")
    .eq("id", bookingId)
    .eq("tenant_id", tenant.id)
    .single();

  if (!existingBooking) return { ok: false, error: "Bokningen hittades inte" };

  const isAdmin = user.roles.includes("admin");
  const isOwn = existingBooking.booked_by === user.id;

  if (!canModifyBooking({ isAdmin, isOwnBooking: isOwn, bookingStartsAt: existingBooking.starts_at })) {
    return { ok: false, error: "Du kan inte ställa in denna bokning" };
  }

  const { error } = await supabase
    .from("bookings")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", bookingId);

  if (error) return { ok: false, error: error.message };

  await logActivity(supabase, {
    tenantId: tenant.id,
    bookingId,
    actorId: user.id,
    type: "cancelled",
    before: {
      title: existingBooking.title,
      roomId: existingBooking.room_id,
      startsAt: existingBooking.starts_at,
    },
    after: null,
  });

  revalidatePath("/dashboard");
  return { ok: true };
}
