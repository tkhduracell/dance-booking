"use client";

import { blocksForDay } from "./week-helpers";
import type { CalendarBlock } from "./types";

const MONTH_NAMES = [
  "Januari", "Februari", "Mars", "April", "Maj", "Juni",
  "Juli", "Augusti", "September", "Oktober", "November", "December",
];

function formatTime(iso: string): string {
  return iso.slice(11, 16);
}

type Props = {
  date: Date;
  blocks: CalendarBlock[];
  onClose: () => void;
  onAdd: (date: Date) => void;
  onBlockClick?: (blockId: string) => void;
};

/** F1-R6: full, untruncated list of a day's items in a panel. */
export function DayPanel({ date, blocks, onClose, onAdd, onBlockClick }: Props) {
  const items = blocksForDay(blocks, date);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-4 shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-extrabold text-purple-dark">
            {date.getDate()} {MONTH_NAMES[date.getMonth()]} {date.getFullYear()}
          </h2>
          <button onClick={onClose} aria-label="Stäng" className="text-2xl leading-none text-gray-400 hover:text-gray-600">
            &times;
          </button>
        </div>

        {items.length === 0 ? (
          <p className="text-sm text-gray-500">Inga aktiviteter denna dag.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {items.map((block) => (
              <li
                key={block.id}
                onClick={onBlockClick ? () => onBlockClick(block.id) : undefined}
                className={`rounded-lg px-3 py-2 text-sm ${
                  block.type === "course" ? "bg-purple-light/20 text-purple-dark" : "bg-purple-accent/35 text-purple-dark"
                } ${onBlockClick ? "cursor-pointer hover:opacity-90" : ""}`}
              >
                <span className="font-semibold">
                  {formatTime(block.startAt)}–{formatTime(block.endAt)}
                </span>{" "}
                {block.name}
              </li>
            ))}
          </ul>
        )}

        <button
          onClick={() => onAdd(date)}
          className="mt-4 w-full rounded-full bg-purple-dark px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          + Lägg till
        </button>
      </div>
    </div>
  );
}
