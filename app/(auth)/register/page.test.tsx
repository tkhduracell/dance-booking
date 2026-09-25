import { describe, expect, it, vi } from "vitest";

const { mockRedirect } = vi.hoisted(() => ({ mockRedirect: vi.fn() }));

vi.mock("next/navigation", () => ({
  redirect: mockRedirect,
}));

import RegisterPage from "./page";

describe("RegisterPage (F2-R2)", () => {
  it("redirects /register to /login", () => {
    RegisterPage();
    expect(mockRedirect).toHaveBeenCalledWith("/login");
  });
});
