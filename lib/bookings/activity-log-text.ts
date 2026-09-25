// F8-R2: render activity_log rows as plain Swedish sentences.

const DAY_NAMES = ["sön", "mån", "tis", "ons", "tor", "fre", "lör"];

function fmt(iso: string): string {
  const d = new Date(iso);
  const day = DAY_NAMES[d.getDay()];
  const date = `${d.getDate()}/${d.getMonth() + 1}`;
  const time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return `${day} ${date} ${time}`;
}

export type ActivityLogEntry = {
  type: "created" | "moved" | "edited" | "cancelled";
  actorName: string;
  before: {
    title?: string;
    roomTitle?: string;
    startsAt?: string;
  } | null;
  after: {
    title?: string;
    roomTitle?: string;
    startsAt?: string;
  } | null;
};

export function formatActivityLogEntry(entry: ActivityLogEntry): string {
  const { type, actorName, before, after } = entry;
  const title = after?.title ?? before?.title ?? "";

  switch (type) {
    case "created":
      return `${actorName} lade till '${title}'`;
    case "cancelled":
      return `${actorName} ställde in '${title}'${before?.startsAt ? ` ${fmt(before.startsAt)}` : ""}`;
    case "edited":
      return `${actorName} redigerade '${title}'`;
    case "moved": {
      const roomChanged = before?.roomTitle !== after?.roomTitle;
      const fromPart = `${before?.startsAt ? fmt(before.startsAt) : ""}${roomChanged && before?.roomTitle ? ` ${before.roomTitle}` : ""}`;
      const toPart = `${after?.startsAt ? fmt(after.startsAt) : ""}${roomChanged && after?.roomTitle ? ` ${after.roomTitle}` : ""}`;
      return `${actorName} flyttade '${title}' från ${fromPart} till ${toPart}`;
    }
    default:
      return `${actorName} ändrade '${title}'`;
  }
}
