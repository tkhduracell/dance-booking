import { describe, expect, it } from "vitest";
import { safeNext } from "./safe-next";

describe("safeNext", () => {
  it("allows same-origin paths", () => expect(safeNext("/admin/tenants")).toBe("/admin/tenants"));
  it("rejects protocol-relative and absolute URLs", () => {
    expect(safeNext("//evil.com")).toBe("/");
    expect(safeNext("https://evil.com")).toBe("/");
    expect(safeNext("/\\evil.com")).toBe("/");
  });
  it("falls back when missing", () => expect(safeNext(null)).toBe("/"));
});
