import { requireSuperAdmin } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { CreateTenantForm } from "./create-tenant-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Superadmin - Gasasteget",
};

export default async function SuperAdminPage() {
  await requireSuperAdmin();

  const supabase = await createClient();
  const { data: tenants } = await supabase
    .from("tenants")
    .select("id, name, slug, active, created_at, tenant_domains(domain)")
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900">Superadmin</h1>
      <p className="mt-2 text-gray-600">Hantera klubbar (tenants).</p>

      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">Ny klubb</h2>
        <CreateTenantForm />
      </div>

      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">Klubbar</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="pb-2 text-left font-medium text-gray-500">Namn</th>
                <th className="pb-2 text-left font-medium text-gray-500">Slug</th>
                <th className="pb-2 text-left font-medium text-gray-500">Domäner</th>
                <th className="pb-2 text-left font-medium text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {(tenants ?? []).map((t) => (
                <tr key={t.id} className="border-b border-gray-100">
                  <td className="py-2 text-gray-900">{t.name}</td>
                  <td className="py-2 font-mono text-xs text-gray-700">{t.slug}</td>
                  <td className="py-2 text-gray-700">
                    {((t.tenant_domains as { domain: string }[] | null) ?? [])
                      .map((d) => d.domain)
                      .join(", ") || "-"}
                  </td>
                  <td className="py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        t.active
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {t.active ? "Aktiv" : "Inaktiv"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
