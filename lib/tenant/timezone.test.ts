import { describe, expect, it } from "vitest";
import { toTenantLocalIso } from "./timezone";

describe("toTenantLocalIso", () => {
  it("converts a UTC timestamptz string to Stockholm local time (winter, UTC+1)", () => {
    expect(toTenantLocalIso("2026-01-13T17:00:00+00:00", "Europe/Stockholm")).toBe(
      "2026-01-13T18:00:00"
    );
  });

  it("converts a UTC timestamptz string to Stockholm local time (summer, UTC+2)", () => {
    expect(toTenantLocalIso("2026-06-13T16:00:00+00:00", "Europe/Stockholm")).toBe(
      "2026-06-13T18:00:00"
    );
  });

  it("shifts the calendar day when local time crosses midnight", () => {
    // 23:30 UTC on Jan 13 is 00:30 local on Jan 14 in Stockholm (winter, UTC+1).
    expect(toTenantLocalIso("2026-01-13T23:30:00+00:00", "Europe/Stockholm")).toBe(
      "2026-01-14T00:30:00"
    );
  });
});
