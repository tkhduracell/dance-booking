import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Home from "./page";

vi.useFakeTimers({ shouldAdvanceTime: true });
vi.setSystemTime(new Date(2026, 3, 8));

vi.mock("./components/calendar/dans-api", () => ({
  fetchDansEvents: vi.fn().mockResolvedValue([
    { id: "dans-0", name: "Bugg Nybörjare", type: "event", startAt: "2026-04-14T18:30:00", endAt: "2026-04-14T19:45:00" },
    { id: "dans-1", name: "Lindy Hop", type: "event", startAt: "2026-04-15T20:00:00", endAt: "2026-04-15T21:15:00" },
    { id: "dans-2", name: "Maj Event", type: "event", startAt: "2026-05-10T18:00:00", endAt: "2026-05-10T19:00:00" },
  ]),
}));

describe("Home", () => {
  it("renders heading", () => {
    render(<Home />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Schema"
    );
  });

  it("renders the current month heading", () => {
    render(<Home />);
    expect(screen.getAllByText("April 2026").length).toBeGreaterThanOrEqual(1);
  });

  it("renders Swedish day names", () => {
    render(<Home />);
    expect(screen.getAllByText("Mån").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Sön").length).toBeGreaterThanOrEqual(1);
  });

  it("shows dans.se events for current month", async () => {
    render(<Home />);
    await waitFor(() => {
      expect(screen.getAllByText("Bugg Nybörjare").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Lindy Hop").length).toBeGreaterThan(0);
    });
  });

  it("navigates to next month", async () => {
    render(<Home />);
    const nextButtons = screen.getAllByLabelText("Nästa månad");
    fireEvent.click(nextButtons[nextButtons.length - 1]);
    expect(screen.getAllByText("Maj 2026").length).toBeGreaterThanOrEqual(1);
    await waitFor(() => {
      expect(screen.getAllByText("Maj Event").length).toBeGreaterThan(0);
    });
  });

  it("navigates to previous month", () => {
    render(<Home />);
    const prevButtons = screen.getAllByLabelText("Föregående månad");
    fireEvent.click(prevButtons[prevButtons.length - 1]);
    expect(screen.getAllByText("Mars 2026").length).toBeGreaterThanOrEqual(1);
  });
});
