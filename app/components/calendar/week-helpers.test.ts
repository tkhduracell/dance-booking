import { describe, expect, it } from "vitest";
import { getWeekRange, getWeekDays, groupBlocksByDay, blocksForDay } from "./week-helpers";
import type { CalendarBlock } from "./types";

describe("getWeekRange", () => {
  it("returns Monday-Sunday range for a mid-week date", () => {
    // 2026-04-08 is a Wednesday
    const { start, end } = getWeekRange(new Date(2026, 3, 8));
    expect(start.getDate()).toBe(6); // Monday
    expect(start.getMonth()).toBe(3);
    expect(end.getDate()).toBe(12); // Sunday
  });

  it("handles a Sunday date (last day of week)", () => {
    const { start, end } = getWeekRange(new Date(2026, 3, 12));
    expect(start.getDate()).toBe(6);
    expect(end.getDate()).toBe(12);
  });

  it("handles a Monday date (first day of week)", () => {
    const { start, end } = getWeekRange(new Date(2026, 3, 6));
    expect(start.getDate()).toBe(6);
    expect(end.getDate()).toBe(12);
  });

  it("spans a month boundary correctly", () => {
    // 2026-04-01 is a Wednesday; week should be Mar 30 - Apr 5
    const { start, end } = getWeekRange(new Date(2026, 3, 1));
    expect(start.getMonth()).toBe(2);
    expect(start.getDate()).toBe(30);
    expect(end.getMonth()).toBe(3);
    expect(end.getDate()).toBe(5);
  });
});

describe("getWeekDays", () => {
  it("returns 7 consecutive days starting Monday", () => {
    const days = getWeekDays(new Date(2026, 3, 8));
    expect(days).toHaveLength(7);
    expect(days[0].getDate()).toBe(6);
    expect(days[6].getDate()).toBe(12);
  });
});

const blocks: CalendarBlock[] = [
  { id: "1", name: "Morning", type: "event", startAt: "2026-04-08T09:00:00", endAt: "2026-04-08T10:00:00" },
  { id: "2", name: "Evening", type: "event", startAt: "2026-04-08T18:00:00", endAt: "2026-04-08T19:00:00" },
  { id: "3", name: "Other day", type: "course", startAt: "2026-04-09T12:00:00", endAt: "2026-04-09T13:00:00" },
];

describe("groupBlocksByDay", () => {
  it("groups blocks by date and sorts within each day", () => {
    const map = groupBlocksByDay(blocks);
    expect(map.get("2026-04-08")?.map((b) => b.id)).toEqual(["1", "2"]);
    expect(map.get("2026-04-09")?.map((b) => b.id)).toEqual(["3"]);
  });
});

describe("blocksForDay", () => {
  it("returns full, untruncated list of blocks for a day sorted by time", () => {
    const result = blocksForDay(blocks, new Date(2026, 3, 8));
    expect(result.map((b) => b.id)).toEqual(["1", "2"]);
  });

  it("returns empty array for a day with no blocks", () => {
    expect(blocksForDay(blocks, new Date(2026, 3, 10))).toEqual([]);
  });
});
