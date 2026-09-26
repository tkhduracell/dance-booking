import { describe, expect, it } from "vitest";
import { isValidHex } from "@/lib/tenant/theme";
import { PRESETS, DEFAULT_THEME_STATE } from "./general-theme-client";

describe("F9-R8 theme presets (Tema panel)", () => {
  it("includes the Gåsasteget default as the first preset", () => {
    expect(PRESETS[0].values).toEqual(DEFAULT_THEME_STATE);
  });

  it("has at least 4 presets (Gåsasteget, Turkos, Skog, Solnedgång)", () => {
    expect(PRESETS.length).toBeGreaterThanOrEqual(4);
  });

  it("every preset's colour fields are valid hex", () => {
    for (const preset of PRESETS) {
      for (const [key, value] of Object.entries(preset.values)) {
        expect(isValidHex(value), `${preset.name}.${key} = ${value}`).toBe(true);
      }
    }
  });

  it("preset names are unique", () => {
    const names = PRESETS.map((p) => p.name);
    expect(new Set(names).size).toBe(names.length);
  });
});
