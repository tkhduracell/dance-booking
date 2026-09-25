import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import HomeAsync from "./page";

vi.useFakeTimers({ shouldAdvanceTime: true });
vi.setSystemTime(new Date(2026, 3, 8));

vi.mock("./components/calendar/dans-api", () => ({
  fetchDansEvents: vi.fn().mockResolvedValue([
    { id: "dans-0", name: "Bugg Nybörjare", type: "event", startAt: "2026-04-14T18:30:00", endAt: "2026-04-14T19:45:00" },
    { id: "dans-1", name: "Lindy Hop", type: "event", startAt: "2026-04-15T20:00:00", endAt: "2026-04-15T21:15:00" },
    { id: "dans-2", name: "Maj Event", type: "event", startAt: "2026-05-10T18:00:00", endAt: "2026-05-10T19:00:00" },
  ]),
}));

vi.mock("@/lib/tenant/current", () => ({
  getCurrentTenant: vi.fn().mockResolvedValue(null),
  getTenantLogoUrl: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
  }),
}));

// Home is an async server component; resolve it to a plain element before
// rendering with Testing Library (which requires a synchronous component).
async function Home() {
  return await HomeAsync({ searchParams: Promise.resolve({}) });
}

describe("Home", () => {
  it("renders heading", async () => {
    render(await Home());
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Schema"
    );
  });

  it("renders the current month heading", async () => {
    render(await Home());
    expect(screen.getAllByText("April 2026").length).toBeGreaterThanOrEqual(1);
  });

  it("renders Swedish day names", async () => {
    render(await Home());
    expect(screen.getAllByText("Mån").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Sön").length).toBeGreaterThanOrEqual(1);
  });

  it("shows dans.se events for current month", async () => {
    render(await Home());
    await waitFor(() => {
      expect(screen.getAllByText("Bugg Nybörjare").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Lindy Hop").length).toBeGreaterThan(0);
    });
  });

  it("shows no booker names to visitors (F1-R2)", async () => {
    render(await Home());
    await waitFor(() => {
      expect(screen.getAllByText("Bugg Nybörjare").length).toBeGreaterThan(0);
    });
    expect(screen.queryByText(/Tidigare medlem/)).not.toBeInTheDocument();
    expect(screen.queryByText(/–/)).not.toBeInTheDocument();
  });

  it("navigates to next month", async () => {
    render(await Home());
    const nextButtons = screen.getAllByLabelText("Nästa månad");
    fireEvent.click(nextButtons[nextButtons.length - 1]);
    expect(screen.getAllByText("Maj 2026").length).toBeGreaterThanOrEqual(1);
    await waitFor(() => {
      expect(screen.getAllByText("Maj Event").length).toBeGreaterThan(0);
    });
  });

  it("navigates to previous month", async () => {
    render(await Home());
    const prevButtons = screen.getAllByLabelText("Föregående månad");
    fireEvent.click(prevButtons[prevButtons.length - 1]);
    expect(screen.getAllByText("Mars 2026").length).toBeGreaterThanOrEqual(1);
  });
});
