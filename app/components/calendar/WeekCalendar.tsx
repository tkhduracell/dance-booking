"use client";

import { useState } from "react";
import { getWeekDays, getWeekRange, groupBlocksByDay, dateKey } from "./week-helpers";
import type { CalendarBlock } from "./types";

type Props = {
  blocks: CalendarBlock[];
  onDayClick?: (date: Date) => void;
  onBlockClick?: (blockId: string) => void;
};

const DAY_NAMES = ["Mån", "Tis", "Ons", "Tor", "Fre", "Lör", "Sön"];
const MONTH_NAMES = [
  "Januari", "Februari", "Mars", "April", "Maj", "Juni",
  "Juli", "Augusti", "September", "Oktober", "November", "December",
];

const START_HOUR = 7;
const END_HOUR = 23;
const HOUR_HEIGHT = 48; // px per hour

function formatTime(iso: string): string {
  return iso.slice(11, 16);
}

function minutesFromStart(iso: string): number {
  const h = parseInt(iso.slice(11, 13), 10);
  const m = parseInt(iso.slice(14, 16), 10);
  return (h - START_HOUR) * 60 + m;
}

export function WeekCalendar({ blocks, onDayClick, onBlockClick }: Props) {
  const [anchor, setAnchor] = useState(() => new Date());
  const days = getWeekDays(anchor);
  const { start, end } = getWeekRange(anchor);
  const byDay = groupBlocksByDay(blocks);

  const today = new Date();
  const todayKey = dateKey(today);

  function prev() {
    const d = new Date(anchor);
    d.setDate(d.getDate() - 7);
    setAnchor(d);
  }

  function next() {
    const d = new Date(anchor);
    d.setDate(d.getDate() + 7);
    setAnchor(d);
  }

  const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);
  const totalHeight = (END_HOUR - START_HOUR) * HOUR_HEIGHT;

  const rangeLabel =
    start.getMonth() === end.getMonth()
      ? `${start.getDate()}–${end.getDate()} ${MONTH_NAMES[start.getMonth()]} ${start.getFullYear()}`
      : `${start.getDate()} ${MONTH_NAMES[start.getMonth()]} – ${end.getDate()} ${MONTH_NAMES[end.getMonth()]} ${end.getFullYear()}`;

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="mb-4 flex items-center justify-between gap-2">
        <button
          onClick={prev}
          className="shrink-0 whitespace-nowrap rounded-full bg-white px-3 py-1.5 sm:px-4 text-sm font-semibold text-purple-dark shadow-sm transition hover:bg-[#e4dac3]"
          aria-label="Föregående vecka"
        >
          ←<span className="hidden sm:inline"> Förra</span>
        </button>
        <h2 className="whitespace-nowrap font-display text-sm font-extrabold uppercase tracking-[0.1em] sm:text-lg text-purple-dark">
          {rangeLabel}
        </h2>
        <button
          onClick={next}
          className="shrink-0 whitespace-nowrap rounded-full bg-white px-3 py-1.5 sm:px-4 text-sm font-semibold text-purple-dark shadow-sm transition hover:bg-[#e4dac3]"
          aria-label="Nästa vecka"
        >
          <span className="hidden sm:inline">Nästa </span>→
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl bg-white shadow-lg">
        <div className="grid min-w-[640px] grid-cols-[48px_repeat(7,1fr)]">
          <div className="bg-purple-dark" />
          {days.map((d) => {
            const key = dateKey(d);
            return (
              <div
                key={key}
                onClick={onDayClick ? () => onDayClick(d) : undefined}
                className={`bg-purple-dark py-2 text-center text-xs font-semibold uppercase tracking-widest text-white sm:text-sm ${
                  onDayClick ? "cursor-pointer hover:opacity-90" : ""
                } ${key === todayKey ? "ring-2 ring-purple-accent ring-inset" : ""}`}
              >
                {DAY_NAMES[(d.getDay() + 6) % 7]} {d.getDate()}
              </div>
            );
          })}

          <div style={{ height: totalHeight }} className="relative">
            {hours.slice(0, -1).map((h) => (
              <div
                key={h}
                className="absolute right-1 -translate-y-2 text-[10px] text-gray-400"
                style={{ top: (h - START_HOUR) * HOUR_HEIGHT }}
              >
                {String(h).padStart(2, "0")}
              </div>
            ))}
          </div>

          {days.map((d) => {
            const key = dateKey(d);
            const dayBlocks = byDay.get(key) ?? [];
            return (
              <div
                key={key}
                className="relative border-l border-gray-warm"
                style={{ height: totalHeight }}
                onClick={onDayClick ? () => onDayClick(d) : undefined}
              >
                {hours.slice(0, -1).map((h) => (
                  <div
                    key={h}
                    className="absolute w-full border-t border-gray-warm/60"
                    style={{ top: (h - START_HOUR) * HOUR_HEIGHT }}
                  />
                ))}
                {dayBlocks.map((block) => {
                  const top = Math.max(0, minutesFromStart(block.startAt));
                  const bottom = minutesFromStart(block.endAt);
                  const heightMin = Math.max(20, bottom - top);
                  return (
                    <div
                      key={block.id}
                      onClick={
                        onBlockClick
                          ? (e) => {
                              e.stopPropagation();
                              onBlockClick(block.id);
                            }
                          : undefined
                      }
                      title={`${block.name} ${formatTime(block.startAt)}–${formatTime(block.endAt)}`}
                      className={`absolute left-0.5 right-0.5 overflow-hidden rounded px-1 py-0.5 text-[10px] leading-tight sm:text-xs ${
                        block.type === "course"
                          ? "bg-purple-light/20 text-purple-dark"
                          : "bg-purple-accent/35 text-purple-dark"
                      }`}
                      style={{ top: (top / 60) * HOUR_HEIGHT, height: (heightMin / 60) * HOUR_HEIGHT }}
                    >
                      <span className="hidden sm:inline">{formatTime(block.startAt)} </span>
                      {block.name}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
