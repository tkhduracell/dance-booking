"use client";

import { useState } from "react";
import { createBooking, updateBooking, cancelBooking } from "./dashboard-actions";

type Room = { id: string; title: string };
type Category = { id: string; name: string };

export type EditingBooking = {
  id: string;
  roomId: string;
  categoryId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  canModify: boolean;
};

function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function BookingForm({
  rooms,
  categories,
  defaultRoomId,
  defaultDate,
  editing,
  onClose,
}: {
  rooms: Room[];
  categories: Category[];
  defaultRoomId?: string;
  defaultDate?: Date;
  editing?: EditingBooking;
  onClose: () => void;
}) {
  const [roomId, setRoomId] = useState(editing?.roomId ?? defaultRoomId ?? rooms[0]?.id ?? "");
  const [categoryId, setCategoryId] = useState(editing?.categoryId ?? categories[0]?.id ?? "");
  const [title, setTitle] = useState(editing?.title ?? "");
  const [startsAt, setStartsAt] = useState(
    editing ? toLocalInputValue(editing.startsAt) : defaultDate ? toLocalInputValue(defaultDate.toISOString()) : ""
  );
  const [endsAt, setEndsAt] = useState(editing ? toLocalInputValue(editing.endsAt) : "");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const input = {
      roomId,
      categoryId,
      title,
      startsAt: new Date(startsAt).toISOString(),
      endsAt: new Date(endsAt).toISOString(),
    };
    const result = editing
      ? await updateBooking(editing.id, input)
      : await createBooking(input);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onClose();
  }

  async function handleCancel() {
    if (!editing) return;
    setPending(true);
    const result = await cancelBooking(editing.id);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 font-display text-lg font-bold text-purple-dark">
          {editing ? "Ändra bokning" : "Lägg till aktivitet"}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-purple-dark">Lokal</label>
            <select
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              disabled={editing && !editing.canModify}
              className="mt-1 w-full rounded-lg border border-gray-warm px-3 py-2 text-sm"
            >
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-purple-dark">Kategori</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              disabled={editing && !editing.canModify}
              className="mt-1 w-full rounded-lg border border-gray-warm px-3 py-2 text-sm"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-purple-dark">Titel</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              disabled={editing && !editing.canModify}
              className="mt-1 w-full rounded-lg border border-gray-warm px-3 py-2 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-sm font-medium text-purple-dark">Start</label>
              <input
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                required
                disabled={editing && !editing.canModify}
                className="mt-1 w-full rounded-lg border border-gray-warm px-3 py-2 text-sm"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-purple-dark">Slut</label>
              <input
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                required
                disabled={editing && !editing.canModify}
                className="mt-1 w-full rounded-lg border border-gray-warm px-3 py-2 text-sm"
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-between gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-4 py-2 text-sm font-semibold text-purple-dark hover:bg-card"
            >
              Avbryt
            </button>
            <div className="flex gap-2">
              {editing && editing.canModify && (
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={pending}
                  className="rounded-full bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
                >
                  Ställ in
                </button>
              )}
              {(!editing || editing.canModify) && (
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-full bg-purple-dark px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                >
                  {editing ? "Spara" : "Boka"}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
