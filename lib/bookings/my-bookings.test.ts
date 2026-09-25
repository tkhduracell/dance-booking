import { describe, expect, it } from "vitest";
import { sortMyBookings, upcomingBookings, type MyBooking } from "./my-bookings";

const base: MyBooking[] = [
  { id: "1", title: "A", roomTitle: "Stora salen", startsAt: "2026-04-10T18:00:00", endsAt: "2026-04-10T19:00:00", hasConflict: false },
  { id: "2", title: "B", roomTitle: "Lilla salen", startsAt: "2026-04-09T18:00:00", endsAt: "2026-04-09T19:00:00", hasConflict: true },
  { id: "3", title: "C", roomTitle: "Stora salen", startsAt: "2026-04-08T18:00:00", endsAt: "2026-04-08T19:00:00", hasConflict: false },
];

describe("sortMyBookings", () => {
  it("puts conflicts first", () => {
    const sorted = sortMyBookings(base);
    expect(sorted[0].id).toBe("2");
  });

  it("sorts non-conflicts by start time ascending", () => {
    const sorted = sortMyBookings(base);
    expect(sorted.slice(1).map((b) => b.id)).toEqual(["3", "1"]);
  });

  it("does not mutate the input array", () => {
    const copy = [...base];
    sortMyBookings(base);
    expect(base).toEqual(copy);
  });
});

describe("upcomingBookings", () => {
  it("keeps only bookings starting after now", () => {
    const result = upcomingBookings(base, "2026-04-09T00:00:00");
    expect(result.map((b) => b.id).sort()).toEqual(["1", "2"]);
  });

  it("returns empty when all bookings are in the past", () => {
    expect(upcomingBookings(base, "2026-05-01T00:00:00")).toEqual([]);
  });
});
