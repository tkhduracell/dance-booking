"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setTenantActive, openTenantAsAdmin } from "./actions";

/** F9-R12/F9-R3: activate/deactivate toggle (go-live gate) and the
 * "Öppna som admin" link, shown at the top of /admin/tenants/[slug]. */
export function TenantStatusActions({
  slug,
  active,
  smtpTestOk,
}: {
  slug: string;
  active: boolean;
  smtpTestOk: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();
  const router = useRouter();

  function toggleActive() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await setTenantActive(slug, !active);
      if (result.error) setError(result.error);
      else {
        setMessage(result.message ?? null);
        router.refresh();
      }
    });
  }

  function openAsAdmin() {
    setError(null);
    startTransition(async () => {
      await openTenantAsAdmin(slug);
    });
  }

  return (
    <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
            }`}
          >
            {active ? "Aktiv" : "Inaktiv"}
          </span>
          {!active && !smtpTestOk ? (
            <p className="mt-2 text-sm text-gray-600">
              Kan inte aktiveras förrän SMTP-testmejlet har lyckats (F9-R12).
            </p>
          ) : null}
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={toggleActive}
            disabled={busy || (!active && !smtpTestOk)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {active ? "Inaktivera" : "Aktivera"}
          </button>
          <button
            type="button"
            onClick={openAsAdmin}
            disabled={busy}
            className="rounded-md bg-purple-main px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            Öppna som admin
          </button>
        </div>
      </div>
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      {message ? <p className="mt-2 text-sm text-green-700">{message}</p> : null}
    </div>
  );
}
