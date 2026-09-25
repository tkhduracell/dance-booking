import { requireRole } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTenant } from "@/lib/tenant/current";
import { RoomsSection, CategoriesSection } from "./rooms-categories-client";
import {
  GeneralSettingsForm,
  ThemeSettingsForm,
  LogoUploadForm,
  BackgroundGradientForm,
} from "./general-theme-client";
import { TenantAdminSmtpForm, TenantAdminDansSeForm } from "./smtp-dans-client";
import { getTenantLogoUrl } from "@/lib/tenant/current";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Klubbinställningar - Gasasteget",
};

export default async function TenantAdminSettingsPage() {
  await requireRole("admin");
  const tenant = await getCurrentTenant();
  if (!tenant) return null;

  const supabase = await createClient();

  const [tenantRow, smtpStatus, roomsRes, categoriesRes] = await Promise.all([
    supabase
      .from("tenants")
      .select(
        "name, timezone, max_days_ahead, theme, course_room_id, logo_path, bg_gradient_from, bg_gradient_via, bg_gradient_to"
      )
      .eq("id", tenant.id)
      .single(),
    supabase.from("tenant_smtp_status").select("*").eq("id", tenant.id).single(),
    supabase.from("rooms").select("*").eq("tenant_id", tenant.id).order("sort_order"),
    supabase.from("categories").select("*").eq("tenant_id", tenant.id).order("sort_order"),
  ]);

  if (!tenantRow.data) return null;

  const logoUrl = tenantRow.data.logo_path ? await getTenantLogoUrl(tenant.id) : null;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900">Klubbinställningar</h1>

      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">Lokaler</h2>
        <p className="mt-1 text-sm text-gray-600">
          F9-R4: skapa/döp om/ordna om/inaktivera lokaler, välj kurslokal.
        </p>
        <RoomsSection
          rooms={roomsRes.data ?? []}
          courseRoomId={tenantRow.data.course_room_id}
        />
      </div>

      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">Kategorier</h2>
        <p className="mt-1 text-sm text-gray-600">F9-R5: bokningskategorier.</p>
        <CategoriesSection categories={categoriesRes.data ?? []} />
      </div>

      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">Allmänt</h2>
        <GeneralSettingsForm tenant={tenantRow.data} />
      </div>

      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">Logotyp</h2>
        <LogoUploadForm logoUrl={logoUrl} />
      </div>

      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">Bakgrund</h2>
        <BackgroundGradientForm
          gradient={{
            bg_gradient_from: tenantRow.data.bg_gradient_from,
            bg_gradient_via: tenantRow.data.bg_gradient_via,
            bg_gradient_to: tenantRow.data.bg_gradient_to,
          }}
        />
      </div>

      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">Tema</h2>
        <ThemeSettingsForm theme={tenantRow.data.theme as Record<string, string> | null} />
      </div>

      {smtpStatus.data && (
        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900">E-post (SMTP)</h2>
          <TenantAdminSmtpForm tenant={smtpStatus.data} />
        </div>
      )}

      {smtpStatus.data && (
        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900">dans.se-import</h2>
          <TenantAdminDansSeForm tenant={smtpStatus.data} />
        </div>
      )}
    </div>
  );
}
