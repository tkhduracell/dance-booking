import { requireRole } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTenant } from "@/lib/tenant/current";
import { MembersTable } from "./members-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Medlemmar - Gasasteget",
};

export default async function MembersPage() {
  await requireRole("admin");
  const tenant = await getCurrentTenant();
  if (!tenant) return null;

  const supabase = await createClient();
  const { data: members } = await supabase.rpc("get_tenant_members", {
    p_tenant_id: tenant.id,
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Medlemmar</h1>
      <p className="mt-2 text-gray-600">
        F7-R1: hantera roller och medlemskap. Klubbens sista admin kan inte tas bort eller
        degraderas.
      </p>
      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6">
        <MembersTable members={members ?? []} />
      </div>
    </div>
  );
}
