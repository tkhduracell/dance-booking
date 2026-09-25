import Link from "next/link";
import { Logo } from "@/app/components/logo";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/permissions";
import { getCurrentTenant, getTenantLogoUrl } from "@/lib/tenant/current";
import { SignOutButton } from "@/app/components/auth/sign-out-button";
import { DeleteAccountButton } from "@/app/components/auth/delete-account-button";

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
      <header className="hero-gradient text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <Link href="/" className="shrink-0"><Logo variant="horizontal" className="h-8 w-auto" logoUrl={logoUrl} /></Link>
            <nav className="flex gap-4 text-sm">
              <Link
                href="/"
                className="text-white/80 hover:text-white"
              >
                Dashboard
              </Link>
              {isAdmin && (
                <Link
                  href="/admin"
                  className="text-white/80 hover:text-white"
                >
                  Admin
                </Link>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-white/80">{user.email}</span>
            <DeleteAccountButton />
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
