"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/permissions";
import { getCurrentTenant } from "@/lib/tenant/current";
import { isValidHex } from "@/lib/tenant/theme";
import { LOGO_MAX_BYTES, LOGO_MIME_EXT, hasValidMagicBytes } from "@/lib/tenant/logo";
import {
  saveSmtpSettingsForTenant,
  sendSmtpTestEmailForTenant,
  saveDansSeSettingsForTenant,
  syncDansSeNowForTenant,
} from "@/lib/tenant-settings/save";

/** F9-R10/R11: save SMTP settings (tenant-admin route). */
export async function saveSmtpSettingsTenantAdmin(
  formData: FormData
): Promise<{ error?: string; message?: string }> {
  await requireRole("admin");
  const tenant = await getCurrentTenant();
  if (!tenant) return { error: "Ingen klubb hittades." };

  const result = await saveSmtpSettingsForTenant(tenant.id, formData);
  revalidatePath("/admin/settings");
  return result;
}

export async function sendSmtpTestEmailTenantAdmin(
  to: string
): Promise<{ error?: string; message?: string }> {
  await requireRole("admin");
  const tenant = await getCurrentTenant();
  if (!tenant) return { error: "Ingen klubb hittades." };

  const result = await sendSmtpTestEmailForTenant(tenant.id, to);
  revalidatePath("/admin/settings");
  return result;
}

export async function saveDansSeSettingsTenantAdmin(
  formData: FormData
): Promise<{ error?: string; message?: string }> {
  await requireRole("admin");
  const tenant = await getCurrentTenant();
  if (!tenant) return { error: "Ingen klubb hittades." };

  const result = await saveDansSeSettingsForTenant(tenant.id, formData);
  revalidatePath("/admin/settings");
  return result;
}

export async function syncDansSeNowTenantAdmin(): Promise<{
  error?: string;
  message?: string;
}> {
  await requireRole("admin");
  const tenant = await getCurrentTenant();
  if (!tenant) return { error: "Ingen klubb hittades." };

  const result = await syncDansSeNowForTenant(tenant.id);
  revalidatePath("/admin/settings");
  return result;
}

// ---------- F9-R6: general settings ----------
export async function saveGeneralSettings(
  formData: FormData
): Promise<{ error?: string; message?: string }> {
  await requireRole("admin");
  const tenant = await getCurrentTenant();
  if (!tenant) return { error: "Ingen klubb hittades." };

  const name = (formData.get("name") as string | null)?.trim() ?? "";
  const timezone = (formData.get("timezone") as string | null)?.trim() || "Europe/Stockholm";
  const maxDaysAheadRaw = (formData.get("max_days_ahead") as string | null)?.trim() ?? "";

  if (!name) return { error: "Namn krävs." };
  const maxDaysAhead = Number(maxDaysAheadRaw);
  if (!maxDaysAheadRaw || Number.isNaN(maxDaysAhead) || maxDaysAhead <= 0) {
    return { error: "Ogiltigt värde för max dagar i förväg." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("tenants")
    .update({
      name,
      timezone,
      max_days_ahead: maxDaysAhead,
    })
    .eq("id", tenant.id);

  if (error) return { error: error.message };

  revalidatePath("/admin/settings");
  return { message: "Allmänna inställningar sparade." };
}

/** F9-R6: upload a tenant logo (png/webp, ≤1MB), stored directly in
 * tenants.logo_data via the service-role client (bypasses RLS so the
 * write isn't gated on a tenants UPDATE policy covering this column). */
export async function uploadTenantLogo(
  formData: FormData
): Promise<{ error?: string; message?: string }> {
  await requireRole("admin");
  const tenant = await getCurrentTenant();
  if (!tenant) return { error: "Ingen klubb hittades." };

  const file = formData.get("logo") as File | null;
  if (!file || file.size === 0) return { error: "Ingen fil vald." };
  if (file.size > LOGO_MAX_BYTES) return { error: "Filen är för stor (max 1MB)." };

  const ext = LOGO_MIME_EXT[file.type];
  if (!ext) return { error: "Filtyp stöds ej (använd PNG eller WebP)." };

  const buffer = new Uint8Array(await file.arrayBuffer());
  if (!hasValidMagicBytes(buffer, file.type)) {
    return { error: "Filens innehåll matchar inte filtypen." };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("tenants")
    .update({
      logo_data: "\\x" + Buffer.from(buffer).toString("hex"),
      logo_mime: file.type,
      logo_updated_at: new Date().toISOString(),
    })
    .eq("id", tenant.id);
  if (error) return { error: error.message };

  revalidatePath("/admin/settings");
  return { message: "Logotyp uppladdad." };
}

export async function removeTenantLogo(): Promise<{ error?: string; message?: string }> {
  await requireRole("admin");
  const tenant = await getCurrentTenant();
  if (!tenant) return { error: "Ingen klubb hittades." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("tenants")
    .update({ logo_data: null, logo_mime: null, logo_updated_at: new Date().toISOString() })
    .eq("id", tenant.id);
  if (error) return { error: error.message };

  revalidatePath("/admin/settings");
  return { message: "Logotyp borttagen." };
}

// ---------- F9-R8: theme ----------
export type ThemeInput = {
  primary: string;
  onPrimary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  mutedText: string;
  headerFrom: string;
  headerTo: string;
};

/** F9-R8: unified theme panel — saves primary/secondary/text + gradient in
 * one action. Other theme keys (onPrimary/accent/background/surface/
 * mutedText/headerFrom/headerTo) are left as previously saved. */
export async function saveUnifiedTheme(
  formData: FormData
): Promise<{ error?: string; message?: string }> {
  await requireRole("admin");
  const tenant = await getCurrentTenant();
  if (!tenant) return { error: "Ingen klubb hittades." };

  const primary = (formData.get("primary") as string | null)?.trim() ?? "";
  const secondary = (formData.get("secondary") as string | null)?.trim() ?? "";
  const text = (formData.get("text") as string | null)?.trim() ?? "";
  const from = (formData.get("bg_gradient_from") as string | null)?.trim() ?? "";
  const via = (formData.get("bg_gradient_via") as string | null)?.trim() ?? "";
  const to = (formData.get("bg_gradient_to") as string | null)?.trim() ?? "";

  for (const [label, v] of [
    ["Primär", primary],
    ["Sekundär", secondary],
    ["Text", text],
  ] as const) {
    if (!v || !isValidHex(v)) return { error: `Ogiltig hex-färg för ${label}.` };
  }
  if (!from || !isValidHex(from)) return { error: "Ogiltig hex-färg för gradient start." };
  if (via && !isValidHex(via)) return { error: "Ogiltig hex-färg för gradient mitten." };
  if (to && !isValidHex(to)) return { error: "Ogiltig hex-färg för gradient slut." };

  const supabase = await createClient();

  const { data: current } = await supabase
    .from("tenants")
    .select("theme")
    .eq("id", tenant.id)
    .single();
  const existingTheme = (current?.theme as Record<string, string> | null) ?? {};

  const theme = { ...existingTheme, primary, secondary, text };

  const { error } = await supabase
    .from("tenants")
    .update({
      theme,
      bg_gradient_from: from,
      bg_gradient_via: via || null,
      bg_gradient_to: to || null,
    })
    .eq("id", tenant.id);

  if (error) return { error: error.message };

  revalidatePath("/admin/settings");
  return { message: "Tema sparat." };
}

/** F9-R8: reset theme + gradient to the default Gåsasteget look. */
export async function resetTenantTheme(): Promise<{ error?: string; message?: string }> {
  await requireRole("admin");
  const tenant = await getCurrentTenant();
  if (!tenant) return { error: "Ingen klubb hittades." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("tenants")
    .update({
      theme: null,
      bg_gradient_from: null,
      bg_gradient_via: null,
      bg_gradient_to: null,
    })
    .eq("id", tenant.id);

  if (error) return { error: error.message };

  revalidatePath("/admin/settings");
  return { message: "Tema återställt till standard." };
}

// ---------- F9-R4: rooms ----------
export async function createRoom(
  formData: FormData
): Promise<{ error?: string; message?: string }> {
  await requireRole("admin");
  const tenant = await getCurrentTenant();
  if (!tenant) return { error: "Ingen klubb hittades." };

  const title = (formData.get("title") as string | null)?.trim() ?? "";
  if (!title) return { error: "Namn krävs." };

  const supabase = await createClient();
  const { count } = await supabase
    .from("rooms")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenant.id);

  const { error } = await supabase.from("rooms").insert({
    tenant_id: tenant.id,
    title,
    sort_order: count ?? 0,
  });

  if (error) return { error: error.message };

  revalidatePath("/admin/settings");
  return { message: "Lokal skapad." };
}

export async function updateRoom(
  roomId: string,
  input: { title?: string; description?: string; active?: boolean }
): Promise<{ error?: string; message?: string }> {
  await requireRole("admin");
  const tenant = await getCurrentTenant();
  if (!tenant) return { error: "Ingen klubb hittades." };

  const supabase = await createClient();
  const update: Record<string, unknown> = {};
  if (input.title !== undefined) update.title = input.title;
  if (input.description !== undefined) update.description = input.description;
  if (input.active !== undefined) update.active = input.active;

  const { error } = await supabase
    .from("rooms")
    .update(update)
    .eq("id", roomId)
    .eq("tenant_id", tenant.id);

  if (error) return { error: error.message };

  revalidatePath("/admin/settings");
  return { message: "Lokal uppdaterad." };
}

export async function reorderRoom(
  roomId: string,
  direction: "up" | "down"
): Promise<{ error?: string; message?: string }> {
  await requireRole("admin");
  const tenant = await getCurrentTenant();
  if (!tenant) return { error: "Ingen klubb hittades." };

  const supabase = await createClient();
  const { data: rooms } = await supabase
    .from("rooms")
    .select("id, sort_order")
    .eq("tenant_id", tenant.id)
    .order("sort_order");

  if (!rooms) return { error: "Inga lokaler hittades." };

  const idx = rooms.findIndex((r) => r.id === roomId);
  if (idx === -1) return { error: "Lokal hittades inte." };
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= rooms.length) return {};

  const a = rooms[idx];
  const b = rooms[swapIdx];

  await supabase.from("rooms").update({ sort_order: b.sort_order }).eq("id", a.id);
  await supabase.from("rooms").update({ sort_order: a.sort_order }).eq("id", b.id);

  revalidatePath("/admin/settings");
  return { message: "Ordning uppdaterad." };
}

/** F9-R4: change the tenant's course room. Simplified: flags conflicts
 * immediately (no separate preview-before-confirm step) and returns a
 * summary message, mirroring the sync's overlap-check logic. */
export async function setCourseRoom(
  roomId: string
): Promise<{ error?: string; message?: string }> {
  await requireRole("admin");
  const tenant = await getCurrentTenant();
  if (!tenant) return { error: "Ingen klubb hittades." };

  const supabase = await createClient();

  const { error: updateError } = await supabase
    .from("tenants")
    .update({ course_room_id: roomId })
    .eq("id", tenant.id);
  if (updateError) return { error: updateError.message };

  // Flag confirmed bookings in the new course room that overlap an
  // imported occasion (same overlap logic used by lib/dans-se/sync.ts).
  const { data: occasions } = await supabase
    .from("imported_occasions")
    .select("id, starts_at, ends_at, imported_courses!inner(removed_at)")
    .eq("tenant_id", tenant.id)
    .is("imported_courses.removed_at", null);

  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, starts_at, ends_at")
    .eq("tenant_id", tenant.id)
    .eq("room_id", roomId)
    .eq("status", "confirmed");

  let flagged = 0;
  for (const b of bookings ?? []) {
    const conflict = (occasions ?? []).find(
      (o) =>
        new Date(b.starts_at) < new Date(o.ends_at) &&
        new Date(o.starts_at) < new Date(b.ends_at)
    );
    if (conflict) {
      await supabase
        .from("bookings")
        .update({ conflict_occasion_id: conflict.id })
        .eq("id", b.id);
      flagged += 1;
    }
  }

  revalidatePath("/admin/settings");
  return { message: `Kurslokal ändrad. ${flagged} bokningar flaggades.` };
}

// ---------- F9-R5: categories ----------
export async function createCategory(
  formData: FormData
): Promise<{ error?: string; message?: string }> {
  await requireRole("admin");
  const tenant = await getCurrentTenant();
  if (!tenant) return { error: "Ingen klubb hittades." };

  const name = (formData.get("name") as string | null)?.trim() ?? "";
  const color = (formData.get("color") as string | null)?.trim() ?? "";
  if (!name) return { error: "Namn krävs." };
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) return { error: "Ogiltig hex-färg." };

  const supabase = await createClient();
  const { count } = await supabase
    .from("categories")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenant.id);

  const { error } = await supabase.from("categories").insert({
    tenant_id: tenant.id,
    name,
    color,
    sort_order: count ?? 0,
  });

  if (error) return { error: error.message };

  revalidatePath("/admin/settings");
  return { message: "Kategori skapad." };
}

export async function updateCategory(
  categoryId: string,
  input: { name?: string; color?: string; active?: boolean }
): Promise<{ error?: string; message?: string }> {
  await requireRole("admin");
  const tenant = await getCurrentTenant();
  if (!tenant) return { error: "Ingen klubb hittades." };

  const supabase = await createClient();

  // At least one active category is required.
  if (input.active === false) {
    const { count } = await supabase
      .from("categories")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenant.id)
      .eq("active", true)
      .neq("id", categoryId);
    if ((count ?? 0) === 0) {
      return { error: "Minst en aktiv kategori krävs." };
    }
  }

  const update: Record<string, unknown> = {};
  if (input.name !== undefined) update.name = input.name;
  if (input.color !== undefined) update.color = input.color;
  if (input.active !== undefined) update.active = input.active;

  const { error } = await supabase
    .from("categories")
    .update(update)
    .eq("id", categoryId)
    .eq("tenant_id", tenant.id);

  if (error) return { error: error.message };

  revalidatePath("/admin/settings");
  return { message: "Kategori uppdaterad." };
}
