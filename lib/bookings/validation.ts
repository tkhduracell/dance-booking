// F4 pure validation helpers — no DB/Supabase dependency, unit-testable.

export type ExistingBooking = {
  id: string;
  roomId: string;
  startsAt: string; // ISO
  endsAt: string; // ISO
  title: string;
  status: "confirmed" | "cancelled";
};

export type ImportedOccasion = {
  roomId: string; // course room
  startsAt: string;
  endsAt: string;
};

export type BookingInput = {
  roomId: string;
  startsAt: string;
  endsAt: string;
  title: string;
  categoryId: string;
};

export type ValidationResult =
  | { ok: true }
  | { ok: false; error: string };

function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return new Date(aStart) < new Date(bEnd) && new Date(bStart) < new Date(aEnd);
}

/** F4-R1: ends_at must be after starts_at. */
export function validateTimeRange(input: Pick<BookingInput, "startsAt" | "endsAt">): ValidationResult {
  if (new Date(input.endsAt) <= new Date(input.startsAt)) {
    return { ok: false, error: "Sluttid måste vara efter starttid" };
  }
  return { ok: true };
}

/** F4-R3: booking may not start in the past, nor more than maxDaysAhead from now. */
export function validateStartWithinWindow(
  startsAt: string,
  maxDaysAhead: number,
  now: Date = new Date()
): ValidationResult {
  const start = new Date(startsAt);
  if (start.getTime() < now.getTime()) {
    return { ok: false, error: "Bokningen kan inte starta i det förflutna" };
  }
  const maxDate = new Date(now.getTime() + maxDaysAhead * 24 * 60 * 60 * 1000);
  if (start.getTime() > maxDate.getTime()) {
    return { ok: false, error: `Bokningen kan tidigast göras ${maxDaysAhead} dagar i förväg` };
  }
  return { ok: true };
}

/**
 * F4-R2: no overlap with other confirmed bookings in the same room, and no
 * overlap with imported occasions in the course room. Touching (end = next
 * start) is allowed since overlaps() uses strict inequalities.
 * excludeBookingId: when moving/editing a booking, ignore itself.
 */
export function validateNoConflict(
  input: BookingInput,
  existingBookings: ExistingBooking[],
  importedOccasions: ImportedOccasion[],
  excludeBookingId?: string
): ValidationResult {
  for (const b of existingBookings) {
    if (b.status !== "confirmed") continue;
    if (b.id === excludeBookingId) continue;
    if (b.roomId !== input.roomId) continue;
    if (overlaps(input.startsAt, input.endsAt, b.startsAt, b.endsAt)) {
      return { ok: false, error: `Tiden krockar med ${b.title}` };
    }
  }

  for (const occ of importedOccasions) {
    if (occ.roomId !== input.roomId) continue;
    if (overlaps(input.startsAt, input.endsAt, occ.startsAt, occ.endsAt)) {
      return { ok: false, error: "Tiden krockar med en importerad kurs" };
    }
  }

  return { ok: true };
}

/**
 * F4-R4: only the booker (own, before start) or an admin may move/cancel.
 */
export function canModifyBooking(params: {
  isAdmin: boolean;
  isOwnBooking: boolean;
  bookingStartsAt: string;
  now?: Date;
}): boolean {
  if (params.isAdmin) return true;
  if (!params.isOwnBooking) return false;
  const now = params.now ?? new Date();
  return new Date(params.bookingStartsAt).getTime() > now.getTime();
}

/** Runs all F4 create/move validations in order, short-circuiting on first failure. */
export function validateBooking(
  input: BookingInput,
  opts: {
    maxDaysAhead: number;
    existingBookings: ExistingBooking[];
    importedOccasions: ImportedOccasion[];
    excludeBookingId?: string;
    now?: Date;
  }
): ValidationResult {
  const timeRange = validateTimeRange(input);
  if (!timeRange.ok) return timeRange;

  const window = validateStartWithinWindow(input.startsAt, opts.maxDaysAhead, opts.now);
  if (!window.ok) return window;

  return validateNoConflict(
    input,
    opts.existingBookings,
    opts.importedOccasions,
    opts.excludeBookingId
  );
}
