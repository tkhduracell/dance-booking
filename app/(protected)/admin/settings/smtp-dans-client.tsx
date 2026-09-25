"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  saveSmtpSettingsTenantAdmin,
  sendSmtpTestEmailTenantAdmin,
  saveDansSeSettingsTenantAdmin,
  syncDansSeNowTenantAdmin,
} from "./actions";

type TenantSmtpStatus = {
  smtp_host: string | null;
  smtp_port: number | null;
  smtp_security: string | null;
  smtp_user: string | null;
  smtp_from_name: string | null;
  smtp_from_address: string | null;
  smtp_password_set: boolean;
  smtp_test_ok: boolean;
  smtp_test_at: string | null;
  smtp_test_error: string | null;
};

export function TenantAdminSmtpForm({ tenant }: { tenant: TenantSmtpStatus }) {
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [testTo, setTestTo] = useState("");
  const [testing, setTesting] = useState(false);
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    setError(null);
    setMessage(null);
    const result = await saveSmtpSettingsTenantAdmin(formData);
    if (result.error) setError(result.error);
    else {
      setMessage(result.message ?? null);
      router.refresh();
    }
  }

  async function handleTestEmail() {
    if (!testTo) return;
    setError(null);
    setMessage(null);
    setTesting(true);
    const result = await sendSmtpTestEmailTenantAdmin(testTo);
    setTesting(false);
    if (result.error) setError(result.error);
    else {
      setMessage(result.message ?? null);
      router.refresh();
    }
  }

  return (
    <div className="mt-4 space-y-4">
      {error && <div className="rounded-md bg-red-50 p-2 text-sm text-red-700">{error}</div>}
      {message && (
        <div className="rounded-md bg-green-50 p-2 text-sm text-green-700">{message}</div>
      )}

      <form action={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input
            name="smtp_host"
            placeholder="Värd (t.ex. localhost)"
            defaultValue={tenant.smtp_host ?? ""}
            required
            className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm"
          />
          <input
            name="smtp_port"
            type="number"
            placeholder="Port"
            defaultValue={tenant.smtp_port ?? ""}
            required
            className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm"
          />
          <select
            name="smtp_security"
            defaultValue={tenant.smtp_security ?? "starttls"}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm"
          >
            <option value="tls">TLS</option>
            <option value="starttls">STARTTLS</option>
            <option value="none">Ingen (lokal testserver)</option>
          </select>
          <input
            name="smtp_user"
            placeholder="Användarnamn (valfritt)"
            defaultValue={tenant.smtp_user ?? ""}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm"
          />
          <input
            name="smtp_password"
            type="password"
            placeholder={tenant.smtp_password_set ? "••• sparad" : "Lösenord"}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm"
          />
          <input
            name="smtp_from_name"
            placeholder="Avsändarnamn"
            defaultValue={tenant.smtp_from_name ?? ""}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm"
          />
          <input
            name="smtp_from_address"
            type="email"
            placeholder="Avsändaradress"
            defaultValue={tenant.smtp_from_address ?? ""}
            required
            className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm sm:col-span-2"
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
          Status:{" "}
          {tenant.smtp_test_ok ? (
            <span className="text-green-700">Testmejl lyckades</span>
          ) : (
            <span className="text-gray-500">Inget lyckat testmejl ännu</span>
          )}
          {tenant.smtp_test_error && (
            <span className="ml-2 text-red-700">({tenant.smtp_test_error})</span>
          )}
        </p>
        <div className="mt-2 flex gap-2">
          <input
            type="email"
            placeholder="Testmejl till..."
            value={testTo}
            onChange={(e) => setTestTo(e.target.value)}
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm"
          />
          <button
            type="button"
            onClick={handleTestEmail}
            disabled={testing || !testTo}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
          >
            {testing ? "Skickar..." : "Skicka testmejl"}
          </button>
        </div>
      </div>
    </div>
  );
}

type TenantDansSeStatus = {
  dans_se_org: string | null;
  dans_se_token_set: boolean;
  dans_se_last_synced_at: string | null;
  dans_se_last_sync_error: string | null;
};

export function TenantAdminDansSeForm({ tenant }: { tenant: TenantDansSeStatus }) {
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    setError(null);
    setMessage(null);
    const result = await saveDansSeSettingsTenantAdmin(formData);
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
    const result = await syncDansSeNowTenantAdmin();
    setSyncing(false);
    if (result.error) setError(result.error);
    else {
      setMessage(result.message ?? null);
      router.refresh();
    }
  }

  return (
    <div className="mt-4 space-y-4">
      {error && <div className="rounded-md bg-red-50 p-2 text-sm text-red-700">{error}</div>}
      {message && (
        <div className="rounded-md bg-green-50 p-2 text-sm text-green-700">{message}</div>
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
