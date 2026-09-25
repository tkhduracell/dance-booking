import { Logo } from "@/app/components/logo";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/permissions";
import { SignOutButton } from "@/app/components/auth/sign-out-button";
import { ensureAccessRequest } from "./actions";

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

  // F3-R1/F3-R8: pending/no-membership users are sent to /waiting, which
  // handles auto-queueing and shows request status.
  if (!hasAccess) {
    await ensureAccessRequest();
    redirect("/waiting");
  }

  const isAdmin = currentUser.roles.includes("admin");

  return (
    <div className="min-h-screen bg-gray-warm">
      <header className="hero-gradient text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <a href="/dashboard" className="shrink-0"><Logo variant="horizontal" className="h-8 w-auto" /></a>
            <nav className="flex gap-4 text-sm">
              <a
                href="/dashboard"
                className="text-white/80 hover:text-white"
              >
                Dashboard
              </a>
              {isAdmin && (
                <a
                  href="/admin"
                  className="text-white/80 hover:text-white"
                >
                  Admin
                </a>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-white/80">{user.email}</span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
