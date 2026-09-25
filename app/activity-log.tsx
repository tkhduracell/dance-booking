import { formatActivityLogEntry } from "@/lib/bookings/activity-log-text";

export type ActivityLogRow = {
  id: string;
  type: "created" | "moved" | "edited" | "cancelled";
  actorName: string;
  before: { title?: string; roomTitle?: string; startsAt?: string } | null;
  after: { title?: string; roomTitle?: string; startsAt?: string } | null;
  createdAt: string;
  soon: boolean;
};

/** F8-R2/R3: latest 20 entries, plain Swedish, highlighted when within 7 days. */
export function ActivityLog({ entries }: { entries: ActivityLogRow[] }) {
  return (
    <section className="mt-8">
      <h2 className="mb-2 font-display text-base font-bold uppercase tracking-wide text-purple-dark">
        Senaste ändringar
      </h2>
      {entries.length === 0 ? (
        <p className="text-sm text-gray-500">Inga ändringar ännu.</p>
      ) : (
        <ul className="space-y-1">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className={`rounded-lg px-3 py-2 text-sm ${
                entry.soon ? "bg-purple-accent/20 font-medium text-purple-dark" : "bg-white text-gray-700"
              }`}
            >
              {formatActivityLogEntry(entry)}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
