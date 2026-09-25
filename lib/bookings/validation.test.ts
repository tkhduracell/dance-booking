import { describe, it, expect } from "vitest";
import {
  validateTimeRange,
  validateStartWithinWindow,
  validateNoConflict,
  canModifyBooking,
  validateBooking,
  type ExistingBooking,
  type ImportedOccasion,
} from "./validation";

const stora = "room-stora";
const lilla = "room-lilla";

describe("validateTimeRange", () => {
  it("rejects end before start", () => {
    expect(
      validateTimeRange({ startsAt: "2026-04-14T20:00:00Z", endsAt: "2026-04-14T18:00:00Z" }).ok
    ).toBe(false);
  });
  it("accepts spanning midnight", () => {
    expect(
      validateTimeRange({ startsAt: "2026-04-14T23:00:00Z", endsAt: "2026-04-15T02:00:00Z" }).ok
    ).toBe(true);
  });
});

describe("validateStartWithinWindow", () => {
  const now = new Date("2026-01-01T00:00:00Z");
  it("rejects a booking starting in the past", () => {
    const result = validateStartWithinWindow("2025-12-31T00:00:00Z", 90, now);
    expect(result.ok).toBe(false);
  });
  it("rejects starting 91 days ahead when max is 90", () => {
    const result = validateStartWithinWindow("2026-04-02T00:00:00Z", 90, now); // 91 days
    expect(result.ok).toBe(false);
  });
  it("accepts starting exactly at the boundary", () => {
    const result = validateStartWithinWindow("2026-03-31T00:00:00Z", 90, now); // 89 days
    expect(result.ok).toBe(true);
  });
});

describe("validateNoConflict", () => {
  const existing: ExistingBooking[] = [
    {
      id: "b1",
      roomId: stora,
      startsAt: "2026-04-14T18:00:00Z",
      endsAt: "2026-04-14T20:00:00Z",
      title: "Träning",
      status: "confirmed",
    },
  ];

  it("rejects an overlapping booking in the same room", () => {
    const result = validateNoConflict(
      { roomId: stora, startsAt: "2026-04-14T19:00:00Z", endsAt: "2026-04-14T21:00:00Z", title: "x", categoryId: "c" },
      existing,
      []
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("Träning");
  });

  it("accepts a touching booking (20:00 start after 20:00 end)", () => {
    const result = validateNoConflict(
      { roomId: stora, startsAt: "2026-04-14T20:00:00Z", endsAt: "2026-04-14T22:00:00Z", title: "x", categoryId: "c" },
      existing,
      []
    );
    expect(result.ok).toBe(true);
  });

  it("accepts overlapping time in a different room", () => {
    const result = validateNoConflict(
      { roomId: lilla, startsAt: "2026-04-14T19:00:00Z", endsAt: "2026-04-14T21:00:00Z", title: "x", categoryId: "c" },
      existing,
      []
    );
    expect(result.ok).toBe(true);
  });

  it("rejects overlap with an imported occasion in the course room", () => {
    const occasions: ImportedOccasion[] = [
      { roomId: stora, startsAt: "2026-04-14T18:30:00Z", endsAt: "2026-04-14T19:45:00Z" },
    ];
    const result = validateNoConflict(
      { roomId: stora, startsAt: "2026-04-14T19:00:00Z", endsAt: "2026-04-14T20:00:00Z", title: "x", categoryId: "c" },
      [],
      occasions
    );
    expect(result.ok).toBe(false);
  });

  it("ignores the booking itself when excludeBookingId matches (for move)", () => {
    const result = validateNoConflict(
      { roomId: stora, startsAt: "2026-04-14T18:30:00Z", endsAt: "2026-04-14T19:30:00Z", title: "x", categoryId: "c" },
      existing,
      [],
      "b1"
    );
    expect(result.ok).toBe(true);
  });
});

describe("canModifyBooking", () => {
  const now = new Date("2026-04-14T18:10:00Z");

  it("admin can modify any booking, even started", () => {
    expect(
      canModifyBooking({ isAdmin: true, isOwnBooking: false, bookingStartsAt: "2026-04-14T18:00:00Z", now })
    ).toBe(true);
  });

  it("booker cannot modify own booking that already started", () => {
    expect(
      canModifyBooking({ isAdmin: false, isOwnBooking: true, bookingStartsAt: "2026-04-14T18:00:00Z", now })
    ).toBe(false);
  });

  it("booker can modify own booking before start", () => {
    expect(
      canModifyBooking({ isAdmin: false, isOwnBooking: true, bookingStartsAt: "2026-04-14T19:00:00Z", now })
    ).toBe(true);
  });

  it("booker cannot modify someone else's booking", () => {
    expect(
      canModifyBooking({ isAdmin: false, isOwnBooking: false, bookingStartsAt: "2026-04-14T19:00:00Z", now })
    ).toBe(false);
  });
});

describe("validateBooking (composed)", () => {
  const now = new Date("2026-01-01T00:00:00Z");

  it("rejects a move that would create an overlap", () => {
    const existing: ExistingBooking[] = [
      { id: "b1", roomId: stora, startsAt: "2026-01-05T18:00:00Z", endsAt: "2026-01-05T20:00:00Z", title: "Fest", status: "confirmed" },
      { id: "b2", roomId: stora, startsAt: "2026-01-06T18:00:00Z", endsAt: "2026-01-06T20:00:00Z", title: "Träning", status: "confirmed" },
    ];
    const result = validateBooking(
      { roomId: stora, startsAt: "2026-01-06T19:00:00Z", endsAt: "2026-01-06T21:00:00Z", title: "Flyttad", categoryId: "c" },
      { maxDaysAhead: 90, existingBookings: existing, importedOccasions: [], excludeBookingId: "b1", now }
    );
    expect(result.ok).toBe(false);
  });
});
