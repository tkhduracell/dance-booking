export type CalendarBlock = {
  id: string;
  name: string;
  type: "course" | "event";
  startAt: string;
  endAt: string;
  bookerName?: string;
};

// F4-R7: former members show as this when booked_by is NULL.
export const FORMER_MEMBER_LABEL = "Tidigare medlem";

/**
 * Maps a booker's user id (or null) to a display name.
 * - null booked_by → "Tidigare medlem" (F4-R9)
 * - known id with a resolved name → that name
 * - known id without a resolved name (e.g. RPC miss) → undefined
 */
export function bookerDisplayName(
  bookedBy: string | null,
  namesById: Map<string, string>
): string | undefined {
  if (bookedBy === null) return FORMER_MEMBER_LABEL;
  return namesById.get(bookedBy);
}
