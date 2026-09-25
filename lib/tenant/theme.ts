const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export function isValidHex(value: string): boolean {
  return HEX_RE.test(value);
}

export interface TenantBackground {
  bg_gradient_from: string | null;
  bg_gradient_via: string | null;
  bg_gradient_to: string | null;
}

/** Default Gåsasteget hero gradient, used when a tenant hasn't set one. */
export const DEFAULT_BG_GRADIENT: { [K in keyof TenantBackground]: string } = {
  bg_gradient_from: "#2d284d",
  bg_gradient_via: "#4b4280",
  bg_gradient_to: "#9e97c4",
};

/**
 * Build the CSS `background` value for --tenant-bg from a tenant's gradient
 * columns. `from` only → solid colour. `from` + `to` (no `via`) → 2-stop
 * gradient. All three → 3-stop gradient (default look).
 */
export function buildTenantBackground(t: TenantBackground): string {
  const from = t.bg_gradient_from ?? DEFAULT_BG_GRADIENT.bg_gradient_from;
  const via = t.bg_gradient_via;
  const to = t.bg_gradient_to;

  if (!to && !via) return from;

  const stops = [from, via, to].filter((s): s is string => Boolean(s));
  return `linear-gradient(180deg, ${stops.join(", ")})`;
}
