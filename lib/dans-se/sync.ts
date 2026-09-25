import { createAdminClient } from "@/lib/supabase/admin";
import { decryptSecret } from "@/lib/email/crypto";
import { sendTenantEmail } from "@/lib/email/mailer";
import { conflictFlagEmail } from "@/lib/email/templates";
import { fetchDansSeEvents, DansSeFetchError, type ParsedCourse } from "./client";

export type SyncResult =
  | { ok: true; coursesCount: number; occasionsCount: number }
  | { ok: false; error: string };

type TenantSyncRow = {
  id: string;
  slug: string;
  name: string;
  dans_se_org: string | null;
  dans_se_token_enc: string | null;
  course_room_id: string | null;
};

function decryptToken(hexOrBuf: string | null): string | null {
  if (!hexOrBuf) return null;
  const hex = hexOrBuf.startsWith("\\x") ? hexOrBuf.slice(2) : hexOrBuf;
  return decryptSecret(Buffer.from(hex, "hex"));
}

function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return new Date(aStart) < new Date(bEnd) && new Date(bStart) < new Date(aEnd);
}

/**
 * F5-R1/R2/R4: sync one tenant's dans.se courses. Upserts courses by
 * dans_se_id, replaces their occasions, marks courses missing from the feed
 * as removed, and flags/emails bookers whose confirmed bookings in the
 * course room now overlap an imported occasion (F4-R10/F4-R11).
 */
export async function syncTenant(tenantId: string): Promise<SyncResult> {
  const supabase = createAdminClient();

  const { data: tenant, error: tenantErr } = await supabase
    .from("tenants")
    .select("id, slug, name, dans_se_org, dans_se_token_enc, course_room_id")
    .eq("id", tenantId)
    .single<TenantSyncRow>();

  if (tenantErr || !tenant) {
    return { ok: false, error: "Klubb hittades inte" };
  }

  if (!tenant.dans_se_org || !tenant.dans_se_token_enc) {
    return { ok: false, error: "Ingen dans.se-organisation eller token konfigurerad" };
  }

  let token: string;
  try {
    token = decryptToken(tenant.dans_se_token_enc)!;
  } catch {
    return { ok: false, error: "Kunde inte dekryptera dans.se-token" };
  }

  let courses: ParsedCourse[];
  try {
    courses = await fetchDansSeEvents(tenant.dans_se_org, token);
  } catch (err) {
    const message =
      err instanceof DansSeFetchError ? err.message : "Synk misslyckades";
    await supabase
      .from("tenants")
      .update({ dans_se_last_sync_error: message })
      .eq("id", tenantId);
    return { ok: false, error: message };
  }

  let occasionsCount = 0;
  const allNewConflictOccasionsByBookingId = new Map<string, { id: string; name: string }>();

  for (const course of courses) {
    const { data: upserted, error: upsertErr } = await supabase
      .from("imported_courses")
      .upsert(
        {
          tenant_id: tenantId,
          dans_se_id: course.dansSeId,
          dans_se_key: course.dansSeKey,
          name: course.name,
          category: course.category,
          place: course.place,
          instructors: course.instructors,
          source_url: course.sourceUrl,
          schedule_text: course.scheduleText,
          removed_at: null,
          synced_at: new Date().toISOString(),
        },
        { onConflict: "tenant_id,dans_se_id" }
      )
      .select("id")
      .single();

    if (upsertErr || !upserted) continue;
    const courseId = upserted.id as string;

    // Replace occasions for this course.
    await supabase.from("imported_occasions").delete().eq("course_id", courseId);

    if (course.occasions.length > 0) {
      const { data: insertedOccasions } = await supabase
        .from("imported_occasions")
        .insert(
          course.occasions.map((occ) => ({
            tenant_id: tenantId,
            course_id: courseId,
            starts_at: occ.startsAt,
            ends_at: occ.endsAt,
          }))
        )
        .select("id, starts_at, ends_at");

      occasionsCount += insertedOccasions?.length ?? 0;

      // F5-R4/F4-R10: flag bookings in the course room that now overlap.
      if (tenant.course_room_id && insertedOccasions) {
        const { data: roomBookings } = await supabase
          .from("bookings")
          .select("id, starts_at, ends_at, booked_by, title, conflict_occasion_id")
          .eq("tenant_id", tenantId)
          .eq("room_id", tenant.course_room_id)
          .eq("status", "confirmed");

        for (const booking of roomBookings ?? []) {
          for (const occ of insertedOccasions) {
            if (
              overlaps(
                booking.starts_at,
                booking.ends_at,
                occ.starts_at as string,
                occ.ends_at as string
              )
            ) {
              if (!booking.conflict_occasion_id) {
                await supabase
                  .from("bookings")
                  .update({ conflict_occasion_id: occ.id })
                  .eq("id", booking.id);
                allNewConflictOccasionsByBookingId.set(booking.id, {
                  id: booking.id,
                  name: course.name,
                });
              }
              break;
            }
          }
        }
      }
    }
  }

  // F5-R1: mark courses gone from the feed as removed.
  const seenIds = courses.map((c) => c.dansSeId);
  if (seenIds.length > 0) {
    await supabase
      .from("imported_courses")
      .update({ removed_at: new Date().toISOString() })
      .eq("tenant_id", tenantId)
      .is("removed_at", null)
      .not("dans_se_id", "in", `(${seenIds.map((id) => `"${id}"`).join(",")})`);
  }

  await supabase
    .from("tenants")
    .update({
      dans_se_last_synced_at: new Date().toISOString(),
      dans_se_last_sync_error: null,
    })
    .eq("id", tenantId);

  // F4-R11: email bookers whose booking newly got a conflict flag.
  for (const { id: bookingId, name: courseName } of allNewConflictOccasionsByBookingId.values()) {
    const { data: booking } = await supabase
      .from("bookings")
      .select("booked_by")
      .eq("id", bookingId)
      .single();
    if (!booking?.booked_by) continue;

    const { data: authUser } = await supabase.auth.admin.getUserById(booking.booked_by);
    const email = authUser?.user?.email;
    if (!email) continue;

    try {
      const { subject, html, text } = conflictFlagEmail(tenant.name, courseName);
      await sendTenantEmail(tenantId, { to: email, subject, html, text });
    } catch {
      // Send failures must never block the sync (mirrors mailer.ts contract).
    }
  }

  return { ok: true, coursesCount: courses.length, occasionsCount };
}
