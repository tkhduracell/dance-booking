export type MyBooking = {
  id: string;
  title: string;
  roomTitle: string;
  startsAt: string;
  endsAt: string;
  hasConflict: boolean;
};

/** F6-R7: upcoming bookings for the signed-in user, conflicts first, then by start time. */
export function sortMyBookings(bookings: MyBooking[]): MyBooking[] {
  return [...bookings].sort((a, b) => {
    if (a.hasConflict !== b.hasConflict) return a.hasConflict ? -1 : 1;
    return a.startsAt.localeCompare(b.startsAt);
  });
}

/**
 * Filters to bookings that start after `nowLocalIso`. Both `startsAt` and
 * `nowLocalIso` must be naive local timestamps (no `Z`/offset) in the same
 * timezone, e.g. both produced by `toTenantLocalIso` — plain string
 * comparison works because the format is zero-padded ISO (YYYY-MM-DDTHH:MM:SS).
 */
export function upcomingBookings(bookings: MyBooking[], nowLocalIso: string): MyBooking[] {
  return bookings.filter((b) => b.startsAt > nowLocalIso);
}
