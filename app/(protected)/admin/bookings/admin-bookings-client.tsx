"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelBooking, updateBooking } from "@/app/dashboard-actions";

type Row = {
  id: string;
  title: string;
  roomTitle: string;
  ownerName: string;
  startsAt: string;
  endsAt: string;
  hasConflict: boolean;
  categoryId: string;
};

export function AdminBookingsTable({
  rows,
  rooms,
}: {
  rows: Row[];
  rooms: { id: string; title: string }[];
}) {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const router = useRouter();

  function refresh(result: { ok: boolean; error?: string }) {
    setMsg(result.ok ? "Uppdaterat." : `Fel: ${result.error}`);
    router.refresh();
  }

  async function handleCancel(id: string, title: string) {
    if (!confirm(`Ställ in "${title}"?`)) return;
    startTransition(async () => refresh(await cancelBooking(id)));
  }

  return (
    <div className="space-y-4">
      {msg && <div className="rounded-md bg-gray-50 p-2 text-sm text-gray-700">{msg}</div>}
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="pb-2 text-left font-medium text-gray-500">Titel</th>
            <th className="pb-2 text-left font-medium text-gray-500">Lokal</th>
            <th className="pb-2 text-left font-medium text-gray-500">Bokad av</th>
            <th className="pb-2 text-left font-medium text-gray-500">Tid</th>
            <th className="pb-2 text-left font-medium text-gray-500">Åtgärder</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-gray-100 align-top">
              <td className="py-2">
                {r.title}
                {r.hasConflict && (
                  <span className="ml-2 rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-800">
                    Krockar med kurs
                  </span>
                )}
              </td>
              <td className="py-2">{r.roomTitle}</td>
              <td className="py-2">{r.ownerName}</td>
              <td className="py-2 text-xs">
                {new Date(r.startsAt).toLocaleString("sv-SE")} –{" "}
                {new Date(r.endsAt).toLocaleString("sv-SE")}
              </td>
              <td className="py-2 space-x-2">
                <button
                  disabled={pending}
                  onClick={() => setEditing(editing === r.id ? null : r.id)}
                  className="text-xs font-medium text-blue-700 hover:underline"
                >
                  Flytta
                </button>
                <button
                  disabled={pending}
                  onClick={() => handleCancel(r.id, r.title)}
                  className="text-xs font-medium text-red-700 hover:underline"
                >
                  Ställ in
                </button>
                {editing === r.id && (
                  <form
                    className="mt-2 flex flex-col gap-1"
                    action={(formData) =>
                      startTransition(async () => {
                        const result = await updateBooking(r.id, {
                          roomId: formData.get("roomId") as string,
                          categoryId: r.categoryId,
                          title: r.title,
                          startsAt: new Date(formData.get("startsAt") as string).toISOString(),
                          endsAt: new Date(formData.get("endsAt") as string).toISOString(),
                        });
                        setEditing(null);
                        refresh(result);
                      })
                    }
                  >
                    <select name="roomId" defaultValue="" required className="rounded border px-2 py-1 text-xs">
                      <option value="" disabled>
                        Ny lokal
                      </option>
                      {rooms.map((room) => (
                        <option key={room.id} value={room.id}>
                          {room.title}
                        </option>
                      ))}
                    </select>
                    <input type="datetime-local" name="startsAt" required className="rounded border px-2 py-1 text-xs" />
                    <input type="datetime-local" name="endsAt" required className="rounded border px-2 py-1 text-xs" />
                    <button type="submit" className="rounded bg-blue-600 px-2 py-1 text-xs text-white">
                      Spara
                    </button>
                  </form>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
