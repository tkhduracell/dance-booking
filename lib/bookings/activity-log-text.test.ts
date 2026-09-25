import { describe, it, expect } from "vitest";
import { formatActivityLogEntry } from "./activity-log-text";

describe("formatActivityLogEntry", () => {
  it("formats a moved entry with date/time and no room change", () => {
    const text = formatActivityLogEntry({
      type: "moved",
      actorName: "Anna",
      before: { title: "Träning", roomTitle: "Stora salen", startsAt: "2026-04-14T18:00:00" },
      after: { title: "Träning", roomTitle: "Stora salen", startsAt: "2026-04-15T19:00:00" },
    });
    expect(text).toContain("Anna flyttade 'Träning' från");
    expect(text).toContain("till");
  });

  it("formats a cancelled entry", () => {
    const text = formatActivityLogEntry({
      type: "cancelled",
      actorName: "Erik",
      before: { title: "Träning", roomTitle: "Stora salen", startsAt: "2026-04-14T18:00:00" },
      after: null,
    });
    expect(text).toBe("Erik ställde in 'Träning' tis 14/4 18:00");
  });

  it("formats a created entry", () => {
    const text = formatActivityLogEntry({
      type: "created",
      actorName: "Anna",
      before: null,
      after: { title: "Fest", roomTitle: "Lilla salen", startsAt: "2026-04-11T19:00:00" },
    });
    expect(text).toBe("Anna lade till 'Fest'");
  });

  it("includes room change in moved text", () => {
    const text = formatActivityLogEntry({
      type: "moved",
      actorName: "Anna",
      before: { title: "Fest", roomTitle: "Stora salen", startsAt: "2026-04-10T19:00:00" },
      after: { title: "Fest", roomTitle: "Lilla salen", startsAt: "2026-04-11T19:00:00" },
    });
    expect(text).toBe("Anna flyttade 'Fest' från fre 10/4 19:00 Stora salen till lör 11/4 19:00 Lilla salen");
  });
});
