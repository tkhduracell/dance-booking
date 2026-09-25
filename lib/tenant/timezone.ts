/**
 * Converts a UTC ISO timestamp (as returned by Postgres `timestamptz`
 * columns via supabase-js, e.g. "2026-01-13T17:00:00+00:00") into an
 * offset-less local wall-clock string ("2026-01-13T18:00:00") in the given
 * IANA timezone. Calendar components (MonthCalendar/CalendarDay) expect
 * local wall-clock strings so day-of-month and time-of-day slicing is
 * correct — passing a UTC string directly can put an evening booking on the
 * wrong calendar day.
 */
export function toTenantLocalIso(utcIso: string, timezone: string): string {
  const date = new Date(utcIso);
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}`;
}
