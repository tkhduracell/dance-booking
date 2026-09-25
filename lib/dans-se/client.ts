// F5: dans.se public API client + parsing. Pure functions (no Supabase),
// unit-testable against a recorded fixture (personal data stripped).

export type DansSeOccasion = {
  startDateTime: string; // "YYYY-MM-DD HH:MM:SS", tenant-local time
  endDateTime: string;
  startDayOfWeek: number;
  length: number;
};

export type DansSeEvent = {
  id: string;
  key: string;
  name: string;
  source: string;
  place?: string;
  category?: { name?: string };
  instructorsName?: string;
  registration?: { url?: string };
  schedule: {
    dayAndTimeInfo?: string;
    start?: string;
    end?: string;
    occasions: DansSeOccasion[];
  };
  // Authenticated responses may include statistics/hiddenStaff — never read.
};

export type DansSeResponse = {
  search: Record<string, unknown>;
  events: DansSeEvent[];
};

/** Parsed, DB-ready shape — only the fields F5 allows us to persist. */
export type ParsedCourse = {
  dansSeId: string;
  dansSeKey: string;
  name: string;
  category: string | null;
  place: string | null;
  instructors: string | null;
  sourceUrl: string | null;
  scheduleText: string | null;
  occasions: { startsAt: string; endsAt: string }[];
};

/** Converts a "YYYY-MM-DD HH:MM:SS" local timestamp (no tz) to an ISO string
 * with an explicit offset. dans.se occasions are in the tenant's local time;
 * timezone conversion is handled by Postgres when stored as timestamptz using
 * the raw local string — Postgres interprets an offset-less timestamp using
 * the session timezone, so we pass it through with 'T' and let the DB layer
 * apply the tenant's zone via `AT TIME ZONE`. Here we just normalize format. */
function toIsoLocal(dansSeDateTime: string): string {
  return dansSeDateTime.replace(" ", "T");
}

/** Extracts and normalizes only the fields F5 allows us to store. Never
 * touches `statistics`/`hiddenStaff` or any other field. */
export function parseEvents(response: DansSeResponse): ParsedCourse[] {
  return response.events.map((event) => ({
    dansSeId: event.id,
    dansSeKey: event.key,
    name: event.name,
    category: event.category?.name ?? null,
    place: event.place ?? null,
    instructors: event.instructorsName ?? null,
    sourceUrl: event.source ?? null,
    scheduleText: event.schedule?.dayAndTimeInfo ?? null,
    occasions: (event.schedule?.occasions ?? []).map((occ) => ({
      startsAt: toIsoLocal(occ.startDateTime),
      endsAt: toIsoLocal(occ.endDateTime),
    })),
  }));
}

export class DansSeFetchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DansSeFetchError";
  }
}

/** Fetches the tenant's dans.se event list. Never logs the token. */
export async function fetchDansSeEvents(
  org: string,
  token: string
): Promise<ParsedCourse[]> {
  const url = `https://dans.se/api/public/events/?org=${encodeURIComponent(org)}&pw=${encodeURIComponent(token)}`;
  let res: Response;
  try {
    res = await fetch(url, { cache: "no-store" });
  } catch {
    throw new DansSeFetchError("Nätverksfel vid kontakt med dans.se");
  }

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      throw new DansSeFetchError("Ogiltig dans.se-token");
    }
    throw new DansSeFetchError(`dans.se svarade med fel (${res.status})`);
  }

  let data: DansSeResponse;
  try {
    data = await res.json();
  } catch {
    throw new DansSeFetchError("Ogiltigt svar från dans.se");
  }

  return parseEvents(data);
}
