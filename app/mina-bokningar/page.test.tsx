import { render, screen } from "@testing-library/react";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import MinaBokningarPageAsync from "./page";

beforeAll(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date(2026, 3, 8));
});

afterAll(() => {
  vi.useRealTimers();
});

vi.mock("@/lib/tenant/current", () => ({
  getCurrentTenant: vi.fn().mockResolvedValue({ id: "tenant-1", slug: "gasasteget" }),
}));

vi.mock("@/lib/auth/permissions", () => ({
  getCurrentUser: vi.fn().mockResolvedValue({ id: "user-1", roles: ["booker"], permissions: [] }),
}));

function makeSupabaseMock() {
  const bookingsData = [
    {
      id: "b1",
      room_id: "room-1",
      title: "Träning",
      starts_at: "2026-04-10T16:00:00.000Z",
      ends_at: "2026-04-10T17:00:00.000Z",
      conflict_occasion_id: null,
    },
    {
      id: "b2",
      room_id: "room-1",
      title: "Krockande pass",
      starts_at: "2026-04-09T16:00:00.000Z",
      ends_at: "2026-04-09T17:00:00.000Z",
      conflict_occasion_id: "occ-1",
    },
  ];

  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1", email: "a@b.se" } } }) },
    from: vi.fn((table: string) => {
      if (table === "tenants") {
        return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { timezone: "Europe/Stockholm" } }) }) }) };
      }
      if (table === "rooms") {
        return { select: () => ({ eq: () => Promise.resolve({ data: [{ id: "room-1", title: "Stora salen" }] }) }) };
      }
      if (table === "bookings") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                eq: () => Promise.resolve({ data: bookingsData }),
              }),
            }),
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    }),
  };
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue(makeSupabaseMock()),
}));

async function MinaBokningarPage() {
  return await MinaBokningarPageAsync();
}

describe("MinaBokningarPage", () => {
  it("renders heading", async () => {
    render(await MinaBokningarPage());
    expect(screen.getAllByRole("heading", { level: 1 }).length).toBeGreaterThanOrEqual(1);
  });

  it("shows conflicts first", async () => {
    render(await MinaBokningarPage());
    const items = screen.getAllByRole("listitem");
    expect(items[items.length - 2]).toHaveTextContent("Krockande pass");
    expect(items[items.length - 1]).toHaveTextContent("Träning");
  });

  it("marks the conflicting booking", async () => {
    render(await MinaBokningarPage());
    expect(screen.getAllByText("Krockar").length).toBeGreaterThanOrEqual(1);
  });
});
