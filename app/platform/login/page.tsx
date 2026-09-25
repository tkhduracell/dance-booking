import { SignInForm } from "@/app/components/auth/sign-in-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Plattformsadmin - Logga in",
};

/** F9: neutral, unbranded sign-in for the super-admin (not tied to a tenant's look). */
export default function PlatformLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-lg font-semibold uppercase tracking-[0.3em] text-white">Plattformsadmin</h1>
          <p className="mt-1 text-xs text-white/60">Dansbokning — hantera klubbar</p>
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-lg">
          <SignInForm next="/superadmin" />
        </div>
      </div>
    </div>
  );
}
