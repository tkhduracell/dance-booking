import Link from "next/link";
import { Logo } from "@/app/components/logo";
import { SignOutButton } from "@/app/components/auth/sign-out-button";
import { DeleteAccountButton } from "@/app/components/auth/delete-account-button";

/** Shared hero-gradient header for logged-in views (member dashboard,
 * /my-bookings, and the protected layout). */
export function AppHeader({
  logoUrl,
  userEmail,
  isAdmin,
}: {
  logoUrl: string | null;
  userEmail: string | null | undefined;
  isAdmin: boolean;
}) {
  return (
    <header className="hero-gradient text-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/" className="shrink-0">
            <Logo variant="horizontal" className="h-8 w-auto" logoUrl={logoUrl} />
          </Link>
          <nav className="flex gap-4 text-sm">
            <Link href="/" className="text-white/80 hover:text-white">
              Schema
            </Link>
            <Link href="/my-bookings" className="text-white/80 hover:text-white">
              Mina bokningar
            </Link>
            {isAdmin && (
              <Link href="/admin" className="text-white/80 hover:text-white">
                Admin
              </Link>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-white/80">{userEmail}</span>
          <DeleteAccountButton />
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
