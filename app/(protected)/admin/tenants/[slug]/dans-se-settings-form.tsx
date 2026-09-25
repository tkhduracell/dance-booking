"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveDansSeSettings, syncDansSeNow } from "./actions";

type TenantDansSeStatus = {
  dans_se_org: string | null;
  dans_se_token_set: boolean;
  dans_se_last_synced_at: string | null;
  dans_se_last_sync_error: string | null;
};

export function DansSeSettingsForm({
  slug,
  tenant,
}: {
  slug: string;
  tenant: TenantDansSeStatus;
}) {
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    setError(null);
    setMessage(null);
    const result = await saveDansSeSettings(slug, formData);
    if (result.error) setError(result.error);
    else {
      setMessage(result.message ?? null);
      router.refresh();
    }
  }

  async function handleSyncNow() {
    setError(null);
    setMessage(null);
    setSyncing(true);
    const result = await syncDansSeNow(slug);
    setSyncing(false);
    if (result.error) setError(result.error);
    else {
      setMessage(result.message ?? null);
      router.refresh();
    }
  }

  return (
    <div className="mt-4 space-y-4">
      {error && (
        <div className="rounded-md bg-red-50 p-2 text-sm text-red-700">{error}</div>
      )}
      {message && (
        <div className="rounded-md bg-green-50 p-2 text-sm text-green-700">
          {message}
        </div>
      )}

      <form action={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input
            name="dans_se_org"
            placeholder="Org-slug (t.ex. nsw eller https://dans.se/nsw/)"
            defaultValue={tenant.dans_se_org ?? ""}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm"
          />
          <input
            name="dans_se_token"
            type="password"
            placeholder={tenant.dans_se_token_set ? "••• sparad" : "API-token (pw)"}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm"
          />
        </div>
        <button
          type="submit"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
        >
          Spara
        </button>
      </form>

      <div className="border-t border-gray-200 pt-4">
        <p className="text-sm text-gray-600">
          {tenant.dans_se_last_synced_at ? (
            <>Senast synkad: {new Date(tenant.dans_se_last_synced_at).toLocaleString("sv-SE")}</>
          ) : (
            <>Ingen synk gjord ännu</>
          )}
          {tenant.dans_se_last_sync_error && (
            <span className="ml-2 text-red-700">
              Senaste synk misslyckades: {tenant.dans_se_last_sync_error}
            </span>
          )}
        </p>
        <button
          type="button"
          onClick={handleSyncNow}
          disabled={syncing || !tenant.dans_se_org}
          className="mt-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
        >
          {syncing ? "Synkar..." : "Synka nu"}
        </button>
      </div>
    </div>
  );
}
