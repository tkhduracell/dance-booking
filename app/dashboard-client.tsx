"use client";

import { useState } from "react";
import { MonthCalendar } from "@/app/components/calendar/MonthCalendar";
import type { CalendarBlock } from "@/app/components/calendar/types";
import { RoomSidebar } from "./room-sidebar";
import { BookingForm, type EditingBooking } from "./booking-form";

type Room = { id: string; title: string };
type Category = { id: string; name: string };
type BookingRow = {
  id: string;
  roomId: string;
  categoryId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  canModify: boolean;
  hasConflict?: boolean;
  bookerName?: string;
};
type ImportedOccasionRow = {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string;
};

export function DashboardClient({
  rooms,
  categories,
  bookings,
  importedOccasions = [],
  selectedRoomId,
}: {
  rooms: Room[];
  categories: Category[];
  bookings: BookingRow[];
  importedOccasions?: ImportedOccasionRow[];
  selectedRoomId: string | null;
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [formDefaultDate, setFormDefaultDate] = useState<Date | undefined>();
  const [editing, setEditing] = useState<EditingBooking | undefined>();

  const filtered = selectedRoomId
    ? bookings.filter((b) => b.roomId === selectedRoomId)
    : bookings;

  const blocks: CalendarBlock[] = [
    ...filtered.map((b) => {
      const base = b.hasConflict ? `${b.title} (krockar)` : b.title;
      return {
        id: b.id,
        name: b.bookerName ? `${base} – ${b.bookerName}` : base,
        type: "event" as const,
        startAt: b.startsAt,
        endAt: b.endsAt,
        bookerName: b.bookerName,
      };
    }),
    // F5-R6: imported dans.se courses, read-only on the calendar.
    ...importedOccasions.map((occ) => ({
      id: `imported-${occ.id}`,
      name: occ.name,
      type: "course" as const,
      startAt: occ.startsAt,
      endAt: occ.endsAt,
    })),
  ];

  function openCreate(date?: Date) {
    setEditing(undefined);
    setFormDefaultDate(date);
    setFormOpen(true);
  }

  function openEdit(blockId: string) {
    const booking = bookings.find((b) => b.id === blockId);
    if (!booking) return;
    setEditing(booking);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditing(undefined);
    setFormDefaultDate(undefined);
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="sm:hidden w-full">
          <RoomSidebar rooms={rooms} />
        </div>
        <button
          onClick={() => openCreate()}
          className="hidden shrink-0 rounded-full bg-purple-dark px-4 py-2 text-sm font-semibold text-white hover:opacity-90 sm:block"
        >
          + Lägg till aktivitet
        </button>
      </div>

      <div className="flex flex-col gap-6 sm:flex-row">
        <div className="hidden sm:block">
          <RoomSidebar rooms={rooms} />
        </div>
        <div className="flex-1">
          <MonthCalendar blocks={blocks} onDayClick={openCreate} onBlockClick={openEdit} />
        </div>
      </div>

      <button
        onClick={() => openCreate()}
        aria-label="Lägg till aktivitet"
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-purple-dark text-2xl text-white shadow-lg sm:hidden"
      >
        +
      </button>

      {formOpen && (
        <BookingForm
          rooms={rooms}
          categories={categories}
          defaultRoomId={selectedRoomId ?? undefined}
          defaultDate={formDefaultDate}
          editing={editing}
          onClose={closeForm}
        />
      )}
    </div>
  );
}
