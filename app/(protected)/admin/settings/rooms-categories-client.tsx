"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createRoom,
  updateRoom,
  reorderRoom,
  setCourseRoom,
  createCategory,
  updateCategory,
} from "./actions";

type Room = { id: string; title: string; description: string | null; active: boolean; sort_order: number };
type Category = { id: string; name: string; color: string; active: boolean; sort_order: number };

export function RoomsSection({
  rooms,
  courseRoomId,
}: {
  rooms: Room[];
  courseRoomId: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function refresh(result: { error?: string; message?: string }) {
    setMsg(result.error ? `Fel: ${result.error}` : result.message ?? null);
    router.refresh();
  }

  return (
    <div className="mt-4 space-y-4">
      {msg && <div className="rounded-md bg-gray-50 p-2 text-sm text-gray-700">{msg}</div>}
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="pb-2 text-left font-medium text-gray-500">Namn</th>
            <th className="pb-2 text-left font-medium text-gray-500">Aktiv</th>
            <th className="pb-2 text-left font-medium text-gray-500">Kurslokal</th>
            <th className="pb-2 text-left font-medium text-gray-500">Ordning</th>
          </tr>
        </thead>
        <tbody>
          {rooms.map((room) => (
            <tr key={room.id} className="border-b border-gray-100">
              <td className="py-2">{room.title}</td>
              <td className="py-2">
                <button
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      refresh(await updateRoom(room.id, { active: !room.active }));
                    })
                  }
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    room.active ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {room.active ? "Aktiv" : "Inaktiv"}
                </button>
              </td>
              <td className="py-2">
                <input
                  type="radio"
                  name="course_room"
                  checked={courseRoomId === room.id}
                  disabled={pending}
                  onChange={() =>
                    startTransition(async () => {
                      refresh(await setCourseRoom(room.id));
                    })
                  }
                />
              </td>
              <td className="py-2">
                <button
                  disabled={pending}
                  onClick={() => startTransition(async () => refresh(await reorderRoom(room.id, "up")))}
                  className="px-1 text-gray-500 hover:text-gray-800"
                >
                  ↑
                </button>
                <button
                  disabled={pending}
                  onClick={() => startTransition(async () => refresh(await reorderRoom(room.id, "down")))}
                  className="px-1 text-gray-500 hover:text-gray-800"
                >
                  ↓
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <form
        action={(formData) => startTransition(async () => refresh(await createRoom(formData)))}
        className="flex gap-2"
      >
        <input
          name="title"
          placeholder="Ny lokal"
          required
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
        >
          Lägg till
        </button>
      </form>
    </div>
  );
}

export function CategoriesSection({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function refresh(result: { error?: string; message?: string }) {
    setMsg(result.error ? `Fel: ${result.error}` : result.message ?? null);
    router.refresh();
  }

  return (
    <div className="mt-4 space-y-4">
      {msg && <div className="rounded-md bg-gray-50 p-2 text-sm text-gray-700">{msg}</div>}
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="pb-2 text-left font-medium text-gray-500">Namn</th>
            <th className="pb-2 text-left font-medium text-gray-500">Färg</th>
            <th className="pb-2 text-left font-medium text-gray-500">Aktiv</th>
          </tr>
        </thead>
        <tbody>
          {categories.map((cat) => (
            <tr key={cat.id} className="border-b border-gray-100">
              <td className="py-2">{cat.name}</td>
              <td className="py-2">
                <span
                  className="inline-block h-4 w-4 rounded-full align-middle"
                  style={{ backgroundColor: cat.color }}
                />{" "}
                {cat.color}
              </td>
              <td className="py-2">
                <button
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      refresh(await updateCategory(cat.id, { active: !cat.active }));
                    })
                  }
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    cat.active ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {cat.active ? "Aktiv" : "Inaktiv"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <form
        action={(formData) => startTransition(async () => refresh(await createCategory(formData)))}
        className="flex gap-2"
      >
        <input
          name="name"
          placeholder="Ny kategori"
          required
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm"
        />
        <input
          name="color"
          type="color"
          defaultValue="#0B6E4F"
          className="h-10 w-14 rounded-md border border-gray-300"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
        >
          Lägg till
        </button>
      </form>
    </div>
  );
}
