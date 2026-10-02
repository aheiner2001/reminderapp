import type { Summary } from "./reminders";
export function summaryText(summary: Summary): string {
  return summary.sections
    .map(
      (s) =>
        `${s.title}\n${s.items.map((i) => `${i.name} — ${i.type}, ${i.date}${i.number != null ? ` (${i.number})` : ""}: ${i.days === 0 ? "today" : `${i.days} days away`}`).join("\n")}`,
    )
    .join("\n\n");
}
