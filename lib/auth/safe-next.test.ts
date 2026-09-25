import { describe, expect, it } from "vitest";
import { safeNext } from "./safe-next";

describe("safeNext", () => {
  it("allows same-origin paths", () => expect(safeNext("/superadmin")).toBe("/superadmin"));
  it("rejects protocol-relative and absolute URLs", () => {
    expect(safeNext("//evil.com")).toBe("/dashboard");
    expect(safeNext("https://evil.com")).toBe("/dashboard");
    expect(safeNext("/\\evil.com")).toBe("/dashboard");
  });
  it("falls back when missing", () => expect(safeNext(null)).toBe("/dashboard"));
});
