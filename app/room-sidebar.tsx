"use client";

import { useRouter, useSearchParams } from "next/navigation";

type Room = { id: string; title: string };

export function RoomSidebar({ rooms }: { rooms: Room[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selected = searchParams.get("room");

  function selectRoom(roomId: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (roomId) {
      params.set("room", roomId);
    } else {
      params.delete("room");
    }
    router.push(`/?${params.toString()}`);
  }

  return (
    <nav aria-label="Lokaler" className="w-full sm:w-48 shrink-0">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-purple-dark">
        Lokaler
      </h2>
      <ul className="flex flex-row gap-1 overflow-x-auto sm:flex-col sm:overflow-visible">
        <li>
          <button
            onClick={() => selectRoom(null)}
            className={`w-full whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm ${
              !selected ? "bg-purple-dark text-white" : "bg-white text-purple-dark hover:bg-card"
            }`}
          >
            Alla lokaler
          </button>
        </li>
        {rooms.map((room) => (
          <li key={room.id}>
            <button
              onClick={() => selectRoom(room.id)}
              className={`w-full whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm ${
                selected === room.id
                  ? "bg-purple-dark text-white"
                  : "bg-white text-purple-dark hover:bg-card"
              }`}
            >
              {room.title}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
