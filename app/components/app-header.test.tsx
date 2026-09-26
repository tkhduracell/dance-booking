import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppHeader } from "./app-header";

afterEach(() => {
  cleanup();
});

vi.mock("next/navigation", () => ({
  useRouter: vi.fn().mockReturnValue({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn().mockReturnValue({ auth: { signOut: vi.fn() } }),
}));

describe("AppHeader", () => {
  it("shows the Admin link for admins", () => {
    render(<AppHeader logoUrl={null} userEmail="admin@example.com" isAdmin={true} />);
    expect(screen.getByRole("link", { name: "Admin" })).toBeInTheDocument();
  });

  it("hides the Admin link for non-admins", () => {
    render(<AppHeader logoUrl={null} userEmail="booker@example.com" isAdmin={false} />);
    expect(screen.queryByRole("link", { name: "Admin" })).not.toBeInTheDocument();
  });

  it("always shows Schema and Mina bokningar links", () => {
    render(<AppHeader logoUrl={null} userEmail="booker@example.com" isAdmin={false} />);
    expect(screen.getByRole("link", { name: "Schema" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Mina bokningar" })).toHaveAttribute(
      "href",
      "/my-bookings"
    );
  });
});
