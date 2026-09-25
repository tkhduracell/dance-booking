import { describe, expect, it, vi, beforeEach } from "vitest";
import fixture from "./__fixtures__/events.json";

const { mockCreateAdminClient, mockFetchDansSeEvents } = vi.hoisted(() => ({
  mockCreateAdminClient: vi.fn(),
  mockFetchDansSeEvents: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: mockCreateAdminClient,
}));

vi.mock("@/lib/email/crypto", () => ({
  decryptSecret: vi.fn(() => "plain-token"),
}));

vi.mock("@/lib/email/mailer", () => ({
  sendTenantEmail: vi.fn(async () => {}),
}));

vi.mock("@/lib/email/templates", () => ({
  conflictFlagEmail: vi.fn(() => ({ subject: "s", html: "h", text: "t" })),
}));

vi.mock("./client", async () => {
  const actual = await vi.importActual<typeof import("./client")>("./client");
  return {
    ...actual,
    fetchDansSeEvents: mockFetchDansSeEvents,
  };
});

/** Minimal fake Supabase query builder: every call returns `this` except the
 * terminal ones (`single`, or awaiting the builder itself as a thenable). */
function makeSupabaseStub(opts: { tenant: Record<string, unknown> }) {
  const insertedOccasions: { course_id: string }[] = [];
  const roomBookingsQueried: boolean[] = [];

  function chain(table: string): Record<string, unknown> {
    const builder: Record<string, unknown> = {
      select: () => builder,
      eq: () => builder,
      is: () => builder,
      not: () => builder,
      delete: () => builder,
      update: () => builder,
      upsert: (row: Record<string, unknown>) => {
        if (table === "imported_courses") {
          return {
            select: () => ({
              single: async () => ({ data: { id: `course-${row.dans_se_id}` }, error: null }),
            }),
          };
        }
        return builder;
      },
      insert: (rows: Record<string, unknown>[]) => {
        if (table === "imported_occasions") {
          for (const r of rows) insertedOccasions.push({ course_id: r.course_id as string });
          return {
            select: async () => ({
              data: rows.map((r, i) => ({ id: `occ-${i}`, starts_at: r.starts_at, ends_at: r.ends_at })),
              error: null,
            }),
          };
        }
        return builder;
      },
      single: async () => {
        if (table === "tenants") return { data: opts.tenant, error: null };
        return { data: null, error: null };
      },
      then: (resolve: (v: unknown) => void) => {
        if (table === "bookings") {
          roomBookingsQueried.push(true);
          resolve({ data: [], error: null });
        } else {
          resolve({ data: [], error: null });
        }
      },
    };
    return builder;
  }

  return {
    client: {
      from: (table: string) => chain(table),
      auth: { admin: { getUserById: vi.fn() } },
    },
    insertedOccasions,
    roomBookingsQueried,
  };
}

describe("syncTenant (F5-R5: occasions stored without a course room)", () => {
  beforeEach(() => {
    mockFetchDansSeEvents.mockReset();
    mockCreateAdminClient.mockReset();
  });

  it("still stores occasions when the tenant has no course_room_id, and skips conflict checks", async () => {
    const { syncTenant } = await import("./sync");
    const { parseEvents } = await import("./client");
    mockFetchDansSeEvents.mockResolvedValue(parseEvents(fixture as never));

    const stub = makeSupabaseStub({
      tenant: {
        id: "tenant-1",
        slug: "gasasteget",
        name: "Gåsasteget",
        dans_se_org: "nsw",
        dans_se_token_enc: "abcd",
        course_room_id: null,
      },
    });
    mockCreateAdminClient.mockReturnValue(stub.client);

    const result = await syncTenant("tenant-1");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.coursesCount).toBe(2);
      // 2 + 1 occasions from the fixture, all inserted despite no course room.
      expect(result.occasionsCount).toBe(3);
    }
    expect(stub.insertedOccasions.length).toBe(3);
    // No room configured → sync never queries bookings to flag conflicts.
    expect(stub.roomBookingsQueried.length).toBe(0);
  });
});
