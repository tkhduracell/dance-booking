"use client";

import { useEffect, useState } from "react";
import { CalendarDay } from "./CalendarDay";
import { fetchDansEvents } from "./dans-api";
import type { CalendarBlock } from "./types";

type Props = {
  /** When provided, skips the dans.se fetch and renders these blocks instead. */
  blocks?: CalendarBlock[];
  onDayClick?: (date: Date) => void;
  onBlockClick?: (blockId: string) => void;
};

const DAY_NAMES = ["Mån", "Tis", "Ons", "Tor", "Fre", "Lör", "Sön"];
const MONTH_NAMES = [
  "Januari", "Februari", "Mars", "April", "Maj", "Juni",
  "Juli", "Augusti", "September", "Oktober", "November", "December",
];

function getCalendarGrid(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  // Convert Sunday=0 to Monday-based: Mon=0..Sun=6
  const startWeekday = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells: { day: number; isOutside: boolean }[] = [];

  // Previous month trailing days
  for (let i = startWeekday - 1; i >= 0; i--) {
    cells.push({ day: daysInPrevMonth - i, isOutside: true });
  }

  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, isOutside: false });
  }

  // Next month leading days
  while (cells.length % 7 !== 0) {
    cells.push({ day: cells.length - daysInMonth - startWeekday + 1, isOutside: true });
  }

  return cells;
}

function blocksByDay(blocks: CalendarBlock[]): Map<number, CalendarBlock[]> {
  const map = new Map<number, CalendarBlock[]>();
  for (const b of blocks) {
    const day = parseInt(b.startAt.slice(8, 10), 10);
    const existing = map.get(day);
    if (existing) {
      existing.push(b);
    } else {
      map.set(day, [b]);
    }
  }
  return map;
}

export function MonthCalendar({ blocks: providedBlocks, onDayClick, onBlockClick }: Props = {}) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const [fetchedBlocks, setFetchedBlocks] = useState<CalendarBlock[]>([]);

  useEffect(() => {
    if (providedBlocks) return;
    fetchDansEvents().then(setFetchedBlocks);
  }, [providedBlocks]);

  const allBlocks = providedBlocks ?? fetchedBlocks;

  const cells = getCalendarGrid(year, month);
  const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;
  const blocks = allBlocks.filter((b) => b.startAt.startsWith(monthStr));
  const byDay = blocksByDay(blocks);

  const today = now.getFullYear() === year && now.getMonth() === month ? now.getDate() : -1;

  function prev() {
    if (month === 0) {
      setYear(year - 1);
      setMonth(11);
    } else {
      setMonth(month - 1);
    }
  }

  function next() {
    if (month === 11) {
      setYear(year + 1);
      setMonth(0);
    } else {
      setMonth(month + 1);
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="mb-4 flex items-center justify-between gap-2">
        <button
          onClick={prev}
          className="shrink-0 whitespace-nowrap rounded-full bg-white px-3 py-1.5 sm:px-4 text-sm font-semibold text-purple-dark shadow-sm transition hover:bg-[#e4dac3]"
          aria-label="Föregående månad"
        >
          ←<span className="hidden sm:inline"> Förra</span>
        </button>
        <h2 className="whitespace-nowrap font-display text-base font-extrabold uppercase tracking-[0.12em] sm:text-lg text-purple-dark sm:text-xl">
          {MONTH_NAMES[month]} {year}
        </h2>
        <button
          onClick={next}
          className="shrink-0 whitespace-nowrap rounded-full bg-white px-3 py-1.5 sm:px-4 text-sm font-semibold text-purple-dark shadow-sm transition hover:bg-[#e4dac3]"
          aria-label="Nästa månad"
        >
          <span className="hidden sm:inline">Nästa </span>→
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-lg">
        <div className="grid grid-cols-7">
          {DAY_NAMES.map((name) => (
            <div
              key={name}
              className="bg-purple-dark py-2 text-center text-xs font-semibold uppercase tracking-widest text-white sm:text-sm"
            >
              {name}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((cell, i) => (
            <CalendarDay
              key={i}
              day={cell.day}
              isToday={!cell.isOutside && cell.day === today}
              isOutside={cell.isOutside}
              blocks={cell.isOutside ? [] : (byDay.get(cell.day) ?? [])}
              onDayClick={
                !cell.isOutside && onDayClick
                  ? () => onDayClick(new Date(year, month, cell.day))
                  : undefined
              }
              onBlockClick={onBlockClick}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
