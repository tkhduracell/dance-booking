import { Logo } from "@/app/components/logo";
import { MonthCalendar } from "./components/calendar/MonthCalendar";
import { getCurrentTenant, getTenantLogoUrl } from "@/lib/tenant/current";

export default async function Home() {
  const tenant = await getCurrentTenant();
  const logoUrl = tenant ? await getTenantLogoUrl(tenant.id) : null;

  return (
    <main className="flex min-h-screen flex-col bg-gray-warm">
      <header className="hero-gradient text-white">
        <div className="mx-auto max-w-5xl px-4 pt-6 pb-10 sm:pb-14">
          <Logo variant="horizontal" className="h-10 w-auto" logoUrl={logoUrl} />
          <h1 className="mt-8 font-display text-3xl font-extrabold uppercase tracking-[0.2em] sm:text-5xl">
            Schema
          </h1>
          <p className="mt-3 max-w-xl text-white/85">
            Kurser, socialdans och event i klubbens lokal.
          </p>
        </div>
      </header>
      <div className="mx-auto mt-6 w-full max-w-5xl flex-1 px-4 pb-12">
        <MonthCalendar />
      </div>
    </main>
  );
}
