import { describe, expect, it } from "vitest";
import { isValidHex, buildTenantBackground, DEFAULT_BG_GRADIENT } from "./theme";

describe("isValidHex", () => {
  it("accepts 6-digit hex with #", () => {
    expect(isValidHex("#2d284d")).toBe(true);
    expect(isValidHex("#ABCDEF")).toBe(true);
  });

  it("rejects invalid values", () => {
    expect(isValidHex("2d284d")).toBe(false);
    expect(isValidHex("#fff")).toBe(false);
    expect(isValidHex("#gggggg")).toBe(false);
    expect(isValidHex("")).toBe(false);
  });
});

describe("buildTenantBackground", () => {
  it("builds a 3-stop gradient when from/via/to all set", () => {
    const css = buildTenantBackground({
      bg_gradient_from: "#111111",
      bg_gradient_via: "#222222",
      bg_gradient_to: "#333333",
    });
    expect(css).toBe("linear-gradient(180deg, #111111, #222222, #333333)");
  });

  it("builds a 2-stop gradient when via is null", () => {
    const css = buildTenantBackground({
      bg_gradient_from: "#111111",
      bg_gradient_via: null,
      bg_gradient_to: "#333333",
    });
    expect(css).toBe("linear-gradient(180deg, #111111, #333333)");
  });

  it("falls back to a solid colour when only from is set", () => {
    const css = buildTenantBackground({
      bg_gradient_from: "#111111",
      bg_gradient_via: null,
      bg_gradient_to: null,
    });
    expect(css).toBe("#111111");
  });

  it("uses the default Gåsasteget gradient when nothing is set", () => {
    const css = buildTenantBackground({
      bg_gradient_from: null,
      bg_gradient_via: null,
      bg_gradient_to: null,
    });
    expect(css).toBe(DEFAULT_BG_GRADIENT.bg_gradient_from);
  });
});
