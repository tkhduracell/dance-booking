"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  approveRequest,
  setAdminMembership,
  inviteAdminByEmail,
} from "./actions";

type Member = { userId: string; name: string; email: string; roles: string[] };
type PendingRequest = { id: string; name: string; email: string; createdAt: string };

export function MembersSection({
  slug,
  tenantId,
  members,
  pendingRequests,
}: {
  slug: string;
  tenantId: string;
  members: Member[];
  pendingRequests: PendingRequest[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const router = useRouter();

  async function run(key: string, fn: () => Promise<{ error?: string; message?: string }>) {
    setError(null);
    setMessage(null);
    setBusy(key);
    const result = await fn();
    setBusy(null);
    if (result.error) setError(result.error);
    else {
      setMessage(result.message ?? null);
      router.refresh();
    }
  }

  async function handleInvite() {
    if (!inviteEmail) return;
    await run("invite", async () => {
      const result = await inviteAdminByEmail(slug, inviteEmail, tenantId);
      if (!result.error) setInviteEmail("");
      return result;
    });
  }

  return (
    <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-gray-900">Medlemmar</h2>
      <p className="mt-1 text-sm text-gray-600">
        F9-R13: hantera medlemmar, godkänn förfrågningar och bjud in admins.
      </p>

      {error && (
        <div className="mt-3 rounded-md bg-red-50 p-2 text-sm text-red-700">{error}</div>
      )}
      {message && (
        <div className="mt-3 rounded-md bg-green-50 p-2 text-sm text-green-700">
          {message}
        </div>
      )}

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="pb-2 text-left font-medium text-gray-500">Namn</th>
              <th className="pb-2 text-left font-medium text-gray-500">E-post</th>
              <th className="pb-2 text-left font-medium text-gray-500">Roller</th>
              <th className="pb-2 text-left font-medium text-gray-500"></th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => {
              const isAdmin = m.roles.includes("admin");
              const key = `member-${m.userId}`;
              return (
                <tr key={m.userId} className="border-b border-gray-100">
                  <td className="py-2 text-gray-900">{m.name}</td>
                  <td className="py-2 text-gray-700">{m.email}</td>
                  <td className="py-2 text-gray-700">{m.roles.join(", ")}</td>
                  <td className="py-2">
                    <button
                      type="button"
                      disabled={busy === key}
                      onClick={() =>
                        run(key, () =>
                          setAdminMembership(slug, m.userId, tenantId, !isAdmin)
                        )
                      }
                      className="rounded-md border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
                    >
                      {isAdmin ? "Ta bort admin" : "Gör till admin"}
                    </button>
                  </td>
                </tr>
              );
            })}
            {members.length === 0 && (
              <tr>
                <td colSpan={4} className="py-4 text-center text-gray-500">
                  Inga medlemmar ännu.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <h3 className="mt-6 text-sm font-semibold text-gray-900">Väntande förfrågningar</h3>
      <div className="mt-2 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="pb-2 text-left font-medium text-gray-500">Namn</th>
              <th className="pb-2 text-left font-medium text-gray-500">E-post</th>
              <th className="pb-2 text-left font-medium text-gray-500"></th>
            </tr>
          </thead>
          <tbody>
            {pendingRequests.map((r) => {
              const key = `request-${r.id}`;
              return (
                <tr key={r.id} className="border-b border-gray-100">
                  <td className="py-2 text-gray-900">{r.name}</td>
                  <td className="py-2 text-gray-700">{r.email}</td>
                  <td className="py-2 space-x-2">
                    <button
                      type="button"
                      disabled={busy === key}
                      onClick={() => run(key, () => approveRequest(slug, r.id, "booker"))}
                      className="rounded-md border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
                    >
                      Godkänn som booker
                    </button>
                    <button
                      type="button"
                      disabled={busy === key}
                      onClick={() => run(key, () => approveRequest(slug, r.id, "admin"))}
                      className="rounded-md border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
                    >
                      Godkänn som admin
                    </button>
                  </td>
                </tr>
              );
            })}
            {pendingRequests.length === 0 && (
              <tr>
                <td colSpan={3} className="py-4 text-center text-gray-500">
                  Inga väntande förfrågningar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <h3 className="mt-6 text-sm font-semibold text-gray-900">Bjud in admin via e-post</h3>
      <div className="mt-2 flex gap-2">
        <input
          type="email"
          placeholder="E-postadress"
          value={inviteEmail}
          onChange={(e) => setInviteEmail(e.target.value)}
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm"
        />
        <button
          type="button"
          onClick={handleInvite}
          disabled={busy === "invite" || !inviteEmail}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
        >
          {busy === "invite" ? "Skickar..." : "Bjud in"}
        </button>
      </div>
    </div>
  );
}
