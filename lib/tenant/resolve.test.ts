import { describe, expect, it } from "vitest";
import { resolveTenantSlug } from "./resolve";

describe("resolveTenantSlug (F0-R2/R3)", () => {
  it("resolves from a registered domain when present", () => {
    const slug = resolveTenantSlug({
      host: "boka.a.se",
      domainTenantSlug: "a",
      queryTenant: "b",
      cookieTenant: "b",
      defaultTenant: "gasasteget",
    });
    expect(slug).toBe("a");
  });

  it("ignores ?tenant= when the host is a registered custom domain", () => {
    const slug = resolveTenantSlug({
      host: "boka.a.se",
      domainTenantSlug: "a",
      queryTenant: "nsw",
      cookieTenant: null,
      defaultTenant: "gasasteget",
    });
    expect(slug).toBe("a");
  });

  it("falls back to ?tenant= query param when host is unregistered", () => {
    const slug = resolveTenantSlug({
      host: "localhost:4000",
      domainTenantSlug: null,
      queryTenant: "gasasteget",
      cookieTenant: null,
      defaultTenant: null,
    });
    expect(slug).toBe("gasasteget");
  });

  it("falls back to the tenant cookie when no query param is present", () => {
    const slug = resolveTenantSlug({
      host: "localhost:4000",
      domainTenantSlug: null,
      queryTenant: null,
      cookieTenant: "nsw",
      defaultTenant: "gasasteget",
    });
    expect(slug).toBe("nsw");
  });

  it("falls back to DEFAULT_TENANT when host is unregistered and no param/cookie", () => {
    const slug = resolveTenantSlug({
      host: "localhost:4000",
      domainTenantSlug: null,
      queryTenant: null,
      cookieTenant: null,
      defaultTenant: "gasasteget",
    });
    expect(slug).toBe("gasasteget");
  });

  it("returns null when nothing resolves (unknown host, no fallback)", () => {
    const slug = resolveTenantSlug({
      host: "random-preview.vercel.app",
      domainTenantSlug: null,
      queryTenant: null,
      cookieTenant: null,
      defaultTenant: null,
    });
    expect(slug).toBeNull();
  });
});
