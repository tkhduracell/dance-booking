import type { CalendarBlock } from "./types";

/** F6-R4: Monday-start week range containing `date`. */
export function getWeekRange(date: Date): { start: Date; end: Date } {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const weekday = (start.getDay() + 6) % 7; // Mon=0..Sun=6
  start.setDate(start.getDate() - weekday);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start, end };
}

function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** The 7 days (Mon-Sun) of the week containing `date`. */
export function getWeekDays(date: Date): Date[] {
  const { start } = getWeekRange(date);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

/** Groups blocks by their ISO date (YYYY-MM-DD) portion of startAt. */
export function groupBlocksByDay(blocks: CalendarBlock[]): Map<string, CalendarBlock[]> {
  const map = new Map<string, CalendarBlock[]>();
  for (const b of blocks) {
    const key = b.startAt.slice(0, 10);
    const existing = map.get(key);
    if (existing) {
      existing.push(b);
    } else {
      map.set(key, [b]);
    }
  }
  for (const list of map.values()) {
    list.sort((a, b) => a.startAt.localeCompare(b.startAt));
  }
  return map;
}

/** Blocks for a specific day, sorted by start time, full (untruncated). */
export function blocksForDay(blocks: CalendarBlock[], date: Date): CalendarBlock[] {
  const key = dateKey(date);
  return blocks
    .filter((b) => b.startAt.slice(0, 10) === key)
    .sort((a, b) => a.startAt.localeCompare(b.startAt));
}

export { dateKey };
