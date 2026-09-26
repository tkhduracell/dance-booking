import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/permissions";
import { getCurrentTenant, getTenantLogoUrl } from "@/lib/tenant/current";
import { AppHeader } from "@/app/components/app-header";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const currentUser = await getCurrentUser();
  const hasAccess = currentUser && currentUser.roles.length > 0;

  if (!hasAccess) {
    redirect("/");
  }

  const isAdmin = currentUser.roles.includes("admin");
  const tenant = await getCurrentTenant();
  const logoUrl = tenant ? await getTenantLogoUrl(tenant.id) : null;

  return (
    <div className="min-h-screen bg-gray-warm">
      <AppHeader logoUrl={logoUrl} userEmail={user.email} isAdmin={isAdmin} />
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
