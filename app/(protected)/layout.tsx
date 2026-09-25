import { Logo } from "@/app/components/logo";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/permissions";
import { SignOutButton } from "@/app/components/auth/sign-out-button";
import { AccessRequestForm } from "@/app/components/auth/access-request-form";
import type { AccessRequest } from "@/lib/auth/types";

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
    redirect("/logga-in");
  }

  const currentUser = await getCurrentUser();
  const hasAccess = currentUser && currentUser.roles.length > 0;

  // If user has no roles, check for existing access request
  if (!hasAccess) {
    const { data: existingRequest } = await supabase
      .from("access_requests")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    const request = existingRequest as AccessRequest | null;

    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-warm px-4">
        <div className="w-full max-w-md">
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900">Gasasteget</h1>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">{user.email}</span>
              <SignOutButton />
            </div>
          </div>

          {request?.status === "pending" ? (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6">
              <h2 className="text-lg font-semibold text-yellow-800">
                Förfrågan skickad
              </h2>
              <p className="mt-2 text-sm text-yellow-700">
                Din begäran om åtkomst har skickats och väntar på godkännande
                från en administratör.
              </p>
              <dl className="mt-4 space-y-2 text-sm">
                <div>
                  <dt className="font-medium text-yellow-800">Namn</dt>
                  <dd className="text-yellow-700">{request.name}</dd>
                </div>
                <div>
                  <dt className="font-medium text-yellow-800">E-post</dt>
                  <dd className="text-yellow-700">{request.email}</dd>
                </div>
                <div>
                  <dt className="font-medium text-yellow-800">
                    Roll i föreningen
                  </dt>
                  <dd className="text-yellow-700">{request.community_role}</dd>
                </div>
              </dl>
            </div>
          ) : request?.status === "denied" ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-red-200 bg-red-50 p-6">
                <h2 className="text-lg font-semibold text-red-800">
                  Förfrågan nekad
                </h2>
                <p className="mt-2 text-sm text-red-700">
                  Din tidigare begäran nekades. Du kan skicka en ny förfrågan
                  nedan.
                </p>
              </div>
              <AccessRequestForm userEmail={user.email ?? ""} />
            </div>
          ) : (
            <AccessRequestForm userEmail={user.email ?? ""} />
          )}
        </div>
      </div>
    );
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
