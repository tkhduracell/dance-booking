"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MonthCalendar } from "@/app/components/calendar/MonthCalendar";
import { WeekCalendar } from "@/app/components/calendar/WeekCalendar";
import { DayPanel } from "@/app/components/calendar/DayPanel";
import type { CalendarBlock } from "@/app/components/calendar/types";
import { RoomSidebar } from "./room-sidebar";
import { BookingForm, type EditingBooking } from "./booking-form";

type View = "month" | "week";

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
  // F6-R4: default week on desktop, month on mobile.
  const [view, setView] = useState<View>("month");
  const [dayPanelDate, setDayPanelDate] = useState<Date | undefined>();

  useEffect(() => {
    if (typeof window === "undefined") return;
    setView(window.matchMedia("(min-width: 640px)").matches ? "week" : "month");
  }, []);

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

  function openDay(date: Date) {
    setDayPanelDate(date);
  }

  function closeDayPanel() {
    setDayPanelDate(undefined);
  }

  function addFromDayPanel(date: Date) {
    closeDayPanel();
    openCreate(date);
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
        <div className="flex w-full items-center justify-between gap-2 sm:hidden">
          <div className="flex-1">
            <RoomSidebar rooms={rooms} />
          </div>
          <Link href="/mina-bokningar" className="shrink-0 text-sm font-semibold text-purple-dark hover:underline">
            Mina bokningar
          </Link>
        </div>
        <div className="hidden shrink-0 items-center gap-2 sm:flex">
          <Link href="/mina-bokningar" className="text-sm font-semibold text-purple-dark hover:underline">
            Mina bokningar
          </Link>
          <div className="flex overflow-hidden rounded-full border border-purple-dark/20">
            <button
              onClick={() => setView("month")}
              className={`px-3 py-1.5 text-sm font-semibold ${
                view === "month" ? "bg-purple-dark text-white" : "bg-white text-purple-dark hover:bg-card"
              }`}
            >
              Månad
            </button>
            <button
              onClick={() => setView("week")}
              className={`px-3 py-1.5 text-sm font-semibold ${
                view === "week" ? "bg-purple-dark text-white" : "bg-white text-purple-dark hover:bg-card"
              }`}
            >
              Vecka
            </button>
          </div>
          <button
            onClick={() => openCreate()}
            className="shrink-0 rounded-full bg-purple-dark px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            + Lägg till aktivitet
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-6 sm:flex-row">
        <div className="hidden sm:block">
          <RoomSidebar rooms={rooms} />
        </div>
        <div className="flex-1">
          {view === "week" ? (
            <WeekCalendar blocks={blocks} onDayClick={openDay} onBlockClick={openEdit} />
          ) : (
            <MonthCalendar blocks={blocks} onDayClick={openDay} onBlockClick={openEdit} />
          )}
        </div>
      </div>

      {dayPanelDate && (
        <DayPanel
          date={dayPanelDate}
          blocks={blocks}
          onClose={closeDayPanel}
          onAdd={addFromDayPanel}
          onBlockClick={(id) => {
            closeDayPanel();
            openEdit(id);
          }}
        />
      )}

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
