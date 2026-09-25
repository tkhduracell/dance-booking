import { notFound } from "next/navigation";
import { requireSuperAdmin } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { SmtpSettingsForm } from "./smtp-settings-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Klubbinställningar - Gasasteget",
};

export default async function TenantSettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await requireSuperAdmin();
  const { slug } = await params;

  const supabase = await createClient();
  const { data: tenant } = await supabase
    .from("tenant_smtp_status")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!tenant) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900">{slug} — inställningar</h1>

      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">E-post (SMTP)</h2>
        <p className="mt-1 text-sm text-gray-600">
          F9-R10: allt mejl (magiclänkar, kö-notiser, bokningar) skickas via
          klubbens egen SMTP-server.
        </p>
        <SmtpSettingsForm slug={slug} tenant={tenant} />
      </div>
    </div>
  );
}
