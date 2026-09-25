import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/permissions";
import { getCurrentTenant } from "@/lib/tenant/current";
import { SignOutButton } from "@/app/components/auth/sign-out-button";
import type { AccessRequest } from "@/lib/auth/types";
import { WaitingDetailsForm } from "./waiting-details-form";
import { RequestAgainButton } from "./request-again-button";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Väntar på godkännande - Gasasteget",
};

export default async function WaitingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // F3-R8: if the user already has a membership, send them on to /dashboard.
  const currentUser = await getCurrentUser();
  if (currentUser && currentUser.roles.length > 0) {
    redirect("/dashboard");
  }

  const tenant = await getCurrentTenant();

  const { data: latest } = tenant
    ? await supabase
        .from("access_requests")
        .select("*")
        .eq("tenant_id", tenant.id)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null };

  const request = latest as AccessRequest | null;

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

        {request?.status === "denied" ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-red-200 bg-red-50 p-6">
              <h2 className="text-lg font-semibold text-red-800">
                Förfrågan nekad
              </h2>
              {request.deny_reason && (
                <p className="mt-2 text-sm text-red-700">
                  Anledning: {request.deny_reason}
                </p>
              )}
              <p className="mt-2 text-sm text-red-700">
                Du kan skicka en ny förfrågan.
              </p>
            </div>
            <RequestAgainButton />
          </div>
        ) : (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6">
            <h2 className="text-lg font-semibold text-yellow-800">
              Din förfrågan väntar på godkännande
              {tenant ? ` hos ${tenant.slug}` : ""}
            </h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div>
                <dt className="font-medium text-yellow-800">Namn</dt>
                <dd className="text-yellow-700">{request?.name}</dd>
              </div>
              <div>
                <dt className="font-medium text-yellow-800">E-post</dt>
                <dd className="text-yellow-700">{request?.email}</dd>
              </div>
            </dl>

            {request && <WaitingDetailsForm requestId={request.id} />}
          </div>
        )}
      </div>
    </div>
  );
}
