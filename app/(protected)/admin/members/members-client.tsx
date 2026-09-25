"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setMemberRole, removeMember } from "./actions";

type Member = { user_id: string; name: string; email: string; roles: string[] };

export function MembersTable({ members }: { members: Member[] }) {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();

  function refresh(result: { error?: string; message?: string }) {
    setMsg(result.error ? `Fel: ${result.error}` : result.message ?? null);
    router.refresh();
  }

  async function handleRemove(userId: string, name: string) {
    if (!confirm(`Ta bort ${name} från klubben? Deras kommande bokningar behålls.`)) return;
    startTransition(async () => refresh(await removeMember(userId)));
  }

  return (
    <div className="mt-4 space-y-4">
      {msg && <div className="rounded-md bg-gray-50 p-2 text-sm text-gray-700">{msg}</div>}
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="pb-2 text-left font-medium text-gray-500">Namn</th>
            <th className="pb-2 text-left font-medium text-gray-500">E-post</th>
            <th className="pb-2 text-left font-medium text-gray-500">Roll</th>
            <th className="pb-2 text-left font-medium text-gray-500">Åtgärder</th>
          </tr>
        </thead>
        <tbody>
          {members.map((m) => {
            const isAdmin = m.roles.includes("admin");
            return (
              <tr key={m.user_id} className="border-b border-gray-100">
                <td className="py-2">{m.name}</td>
                <td className="py-2 text-gray-600">{m.email}</td>
                <td className="py-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      isAdmin ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {isAdmin ? "admin" : "booker"}
                  </span>
                </td>
                <td className="py-2 space-x-2">
                  <button
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () =>
                        refresh(await setMemberRole(m.user_id, "admin", !isAdmin))
                      )
                    }
                    className="text-xs font-medium text-blue-700 hover:underline"
                  >
                    {isAdmin ? "Gör till booker" : "Gör till admin"}
                  </button>
                  <button
                    disabled={pending}
                    onClick={() => handleRemove(m.user_id, m.name)}
                    className="text-xs font-medium text-red-700 hover:underline"
                  >
                    Ta bort
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
