import type { CalendarBlock } from "./types";

type Props = {
  day: number | null;
  isToday: boolean;
  isOutside: boolean;
  blocks: CalendarBlock[];
};

function formatTime(iso: string): string {
  return iso.slice(11, 16);
}

export function CalendarDay({ day, isToday, isOutside, blocks }: Props) {
  return (
    <div
      className={`min-h-20 border-t border-gray-warm p-1 sm:min-h-24 sm:p-2 ${
        isOutside ? "bg-card text-gray-400" : "bg-white"
      } ${isToday ? "ring-2 ring-purple-accent ring-inset" : ""}`}
    >
      {day !== null && (
        <>
          <span
            className={`text-xs font-medium sm:text-sm ${
              isToday ? "font-bold text-purple-light" : ""
            }`}
          >
            {day}
          </span>
          <div className="mt-0.5 flex flex-col gap-0.5">
            {blocks.map((block) => (
              <div
                key={block.id}
                className={`truncate rounded px-1 py-0.5 text-[10px] leading-tight sm:text-xs ${
                  block.type === "course"
                    ? "bg-purple-light/20 text-purple-dark"
                    : "bg-purple-accent/35 text-purple-dark"
                }`}
                title={`${block.name} ${formatTime(block.startAt)}–${formatTime(block.endAt)}`}
              >
                <span className="hidden sm:inline">
                  {formatTime(block.startAt)}{" "}
                </span>
                {block.name}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
