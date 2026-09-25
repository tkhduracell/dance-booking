"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/permissions";
import { getCurrentTenant } from "@/lib/tenant/current";
import { sendTenantEmail } from "@/lib/email/mailer";
import {
  bookingChangedByAdminEmail,
  bookingCancelledByAdminEmail,
} from "@/lib/email/templates";
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

/** F4-R11: notify the booking owner when someone else (an admin) changed
 * their booking. Best-effort — never blocks the mutation. */
async function notifyOwnerOfAdminChange(params: {
  tenantId: string;
  tenantName: string;
  ownerId: string | null;
  actorId: string;
  title: string;
  kind: "changed" | "cancelled";
  oldWhen?: string;
  newWhen?: string;
  when?: string;
}) {
  if (!params.ownerId || params.ownerId === params.actorId) return;
  try {
    const admin = createAdminClient();
    const { data: authUser } = await admin.auth.admin.getUserById(params.ownerId);
    const email = authUser?.user?.email;
    if (!email) return;

    const { subject, html, text } =
      params.kind === "changed"
        ? bookingChangedByAdminEmail(
            params.tenantName,
            params.title,
            params.oldWhen ?? "",
            params.newWhen ?? ""
          )
        : bookingCancelledByAdminEmail(params.tenantName, params.title, params.when ?? "");

    await sendTenantEmail(params.tenantId, { to: email, subject, html, text });
  } catch {
    // Send failures must never block the mutation.
  }
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

  // F4-R6: booking insert + activity_log insert happen atomically in the RPC.
  const { error } = await supabase.rpc("create_booking_with_log", {
    p_tenant_id: tenant.id,
    p_room_id: input.roomId,
    p_category_id: input.categoryId,
    p_title: input.title,
    p_starts_at: input.startsAt,
    p_ends_at: input.endsAt,
    p_booked_by: user.id,
    p_actor_id: user.id,
  });

  if (error) {
    return { ok: false, error: error.message ?? "Tiden krockar med en annan bokning" };
  }

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

  const roomChanged = existingBooking.room_id !== input.roomId;
  const timeChanged =
    existingBooking.starts_at !== input.startsAt || existingBooking.ends_at !== input.endsAt;
  const type: "moved" | "edited" = roomChanged || timeChanged ? "moved" : "edited";

  // F4-R6: booking update + activity_log insert happen atomically in the RPC.
  const { error } = await supabase.rpc("update_booking_with_log", {
    p_booking_id: bookingId,
    p_tenant_id: tenant.id,
    p_room_id: input.roomId,
    p_category_id: input.categoryId,
    p_title: input.title,
    p_starts_at: input.startsAt,
    p_ends_at: input.endsAt,
    p_actor_id: user.id,
    p_log_type: type,
  });

  if (error) return { ok: false, error: "Tiden krockar med en annan bokning" };

  // F4-R11: notify the owner when an admin changed someone else's booking.
  if (isAdmin) {
    const { data: tenantRow } = await supabase
      .from("tenants")
      .select("name")
      .eq("id", tenant.id)
      .single();
    await notifyOwnerOfAdminChange({
      tenantId: tenant.id,
      tenantName: tenantRow?.name ?? tenant.slug,
      ownerId: existingBooking.booked_by,
      actorId: user.id,
      title: input.title,
      kind: "changed",
      oldWhen: existingBooking.starts_at,
      newWhen: input.startsAt,
    });
  }

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

  // F4-R6: booking cancel + activity_log insert happen atomically in the RPC.
  const { error } = await supabase.rpc("cancel_booking_with_log", {
    p_booking_id: bookingId,
    p_tenant_id: tenant.id,
    p_actor_id: user.id,
  });

  if (error) return { ok: false, error: error.message };

  // F4-R11: notify the owner when an admin cancelled someone else's booking.
  if (isAdmin) {
    const { data: tenantRow } = await supabase
      .from("tenants")
      .select("name")
      .eq("id", tenant.id)
      .single();
    await notifyOwnerOfAdminChange({
      tenantId: tenant.id,
      tenantName: tenantRow?.name ?? tenant.slug,
      ownerId: existingBooking.booked_by,
      actorId: user.id,
      title: existingBooking.title,
      kind: "cancelled",
      when: existingBooking.starts_at,
    });
  }

  revalidatePath("/dashboard");
  return { ok: true };
}
