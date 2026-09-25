import { MonthCalendar } from "./components/calendar/MonthCalendar";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col bg-gray-warm">
      <header className="hero-gradient text-white">
        <div className="mx-auto max-w-5xl px-4 pt-6 pb-14 sm:pb-20">
          <p className="font-display text-2xl font-semibold lowercase leading-none">
            gåsasteget
            <span className="block text-[10px] font-normal uppercase tracking-[0.3em] text-white/70">
              Lunds Dansklubb
            </span>
          </p>
          <h1 className="mt-10 font-display text-3xl font-extrabold uppercase tracking-[0.2em] sm:text-5xl">
            Schema
          </h1>
          <p className="mt-3 max-w-xl text-white/85">
            Kurser, socialdans och event i klubbens lokal.
          </p>
        </div>
      </header>
      <div className="mx-auto -mt-8 w-full max-w-5xl flex-1 px-4 pb-12">
        <MonthCalendar />
      </div>
    </main>
  );
}
