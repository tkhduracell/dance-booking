import { describe, expect, it } from "vitest";
import { bookerDisplayName, FORMER_MEMBER_LABEL } from "./types";

describe("bookerDisplayName", () => {
  it("returns the former-member label when booked_by is null (F4-R9)", () => {
    expect(bookerDisplayName(null, new Map())).toBe(FORMER_MEMBER_LABEL);
    expect(FORMER_MEMBER_LABEL).toBe("Tidigare medlem");
  });

  it("returns the resolved display name for a known booker id", () => {
    const names = new Map([["user-1", "Anna Andersson"]]);
    expect(bookerDisplayName("user-1", names)).toBe("Anna Andersson");
  });

  it("returns undefined when the id has no resolved name", () => {
    expect(bookerDisplayName("user-2", new Map())).toBeUndefined();
  });
});
