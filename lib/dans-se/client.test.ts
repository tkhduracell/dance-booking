import { describe, expect, it } from "vitest";
import fixture from "./__fixtures__/events.json";
import { parseEvents, type DansSeResponse } from "./client";

describe("dans.se event parsing (F5-R9)", () => {
  it("parses courses and occasions from the fixture", () => {
    const courses = parseEvents(fixture as DansSeResponse);
    expect(courses).toHaveLength(2);

    const bugg = courses.find((c) => c.dansSeId === "1001");
    expect(bugg).toBeDefined();
    expect(bugg?.name).toBe("Bugg nybörjare");
    expect(bugg?.category).toBe("Bugg");
    expect(bugg?.place).toBe("Stora salen");
    expect(bugg?.instructors).toBe("Anna Andersson");
    expect(bugg?.sourceUrl).toBe("https://dans.se/nsw/kurser/bugg-1");
    expect(bugg?.scheduleText).toBe("Tisdagar 18:00-19:30");
    expect(bugg?.occasions).toHaveLength(2);
    expect(bugg?.occasions[0]).toEqual({
      startsAt: "2026-01-13T18:00:00",
      endsAt: "2026-01-13T19:30:00",
    });
  });

  it("never surfaces statistics or hiddenStaff fields (F5 personal-data rule)", () => {
    const courses = parseEvents(fixture as DansSeResponse);
    const serialized = JSON.stringify(courses);
    expect(serialized).not.toContain("statistics");
    expect(serialized).not.toContain("hiddenStaff");
    expect(serialized).not.toContain("registered");
    expect(serialized).not.toContain("internal-note");
  });

  it("handles a course with a single occasion", () => {
    const courses = parseEvents(fixture as DansSeResponse);
    const foxtrot = courses.find((c) => c.dansSeId === "1002");
    expect(foxtrot?.occasions).toHaveLength(1);
  });

  it("handles an event with no occasions", () => {
    const courses = parseEvents({
      search: {},
      events: [
        {
          id: "1003",
          key: "empty",
          name: "Tom kurs",
          source: "https://dans.se/nsw/kurser/empty",
          schedule: { occasions: [] },
        },
      ],
    });
    expect(courses[0].occasions).toEqual([]);
  });
});
