export interface ReminderEvent {
  id: string;
  name: string;
  type: string;
  month: number;
  day: number;
  year?: number | null;
  notes?: string;
  emailEnabled: boolean;
  leadDays: number | null;
  daily: boolean;
  weekly: boolean;
  monthly: boolean;
  archived: boolean;
}
export interface Settings {
  timezone: string;
  sendTime: string;
  defaultLeadDays: number;
  emailEnabled: boolean;
  paused: boolean;
}
export interface SummaryItem {
  id: string;
  name: string;
  type: string;
  date: string;
  days: number;
  number?: number;
}
export interface Summary {
  date: string;
  sections: {
    kind: "monthly" | "weekly" | "alerts";
    title: string;
    items: SummaryItem[];
  }[];
}
export const defaultSettings: Settings = {
  timezone: "America/Denver",
  sendTime: "09:00",
  defaultLeadDays: 7,
  emailEnabled: true,
  paused: false,
};
export const blankEvent: ReminderEvent = {
  id: "",
  name: "",
  type: "Birthday",
  month: 1,
  day: 1,
  year: null,
  notes: "",
  emailEnabled: true,
  leadDays: null,
  daily: false,
  weekly: true,
  monthly: true,
  archived: false,
};
const iso = (year: number, month: number, day: number) =>
  `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
export function validateDate(date: string): void {
  const d = new Date(`${date}T00:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(d.getTime()) ||
    d.toISOString().slice(0, 10) !== date
  )
    throw new Error("Choose a valid calendar date.");
}
export function localDate(now: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (name: string) => parts.find((p) => p.type === name)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
export function daysBetween(today: string, date: string): number {
  return Math.round(
    (Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) /
      86400000,
  );
}
export function nextOccurrence(
  event: Pick<ReminderEvent, "month" | "day">,
  today: string,
): string {
  validateDate(today);
  const occurrence = (year: number) =>
    iso(
      year,
      event.month,
      event.month === 2 &&
        event.day === 29 &&
        new Date(Date.UTC(year, 1, 29)).getUTCMonth() !== 1
        ? 28
        : event.day,
    );
  const year = Number(today.slice(0, 4));
  const date = occurrence(year);
  return date >= today ? date : occurrence(year + 1);
}
export function validateEvent(input: unknown): ReminderEvent {
  if (!input || typeof input !== "object") throw new Error("Invalid event.");
  const v = input as Record<string, unknown>;
  const name = typeof v.name === "string" ? v.name.trim() : "";
  if (
    !name ||
    name.length > 100 ||
    !["Birthday", "Anniversary"].includes(String(v.type))
  )
    throw new Error("Enter a name (1–100 characters) and event type.");
  if (
    !Number.isInteger(v.month) ||
    !Number.isInteger(v.day) ||
    Number(v.month) < 1 ||
    Number(v.month) > 12 ||
    Number(v.day) < 1
  )
    throw new Error("Choose a valid date.");
  const date = new Date(Date.UTC(2000, Number(v.month) - 1, Number(v.day)));
  if (date.getUTCMonth() !== Number(v.month) - 1 || date.getUTCDate() !== v.day)
    throw new Error("Choose a valid date.");
  if (
    v.leadDays !== null &&
    (!Number.isInteger(v.leadDays) ||
      Number(v.leadDays) < 0 ||
      Number(v.leadDays) > 365)
  )
    throw new Error("Lead time must be 0–365 days or default.");
  if (
    v.year != null &&
    (!Number.isInteger(v.year) ||
      Number(v.year) < 1 ||
      Number(v.year) > new Date().getUTCFullYear())
  )
    throw new Error("Year must be in the past or current year.");
  for (const key of ["emailEnabled", "daily", "weekly", "monthly", "archived"])
    if (typeof v[key] !== "boolean")
      throw new Error("Invalid reminder preference.");
  if (v.notes != null && (typeof v.notes !== "string" || v.notes.length > 2000))
    throw new Error("Notes must be under 2,000 characters.");
  return {
    id: typeof v.id === "string" ? v.id : "",
    name,
    type: String(v.type),
    month: Number(v.month),
    day: Number(v.day),
    year: v.year == null ? null : Number(v.year),
    notes: String(v.notes ?? ""),
    emailEnabled: v.emailEnabled as boolean,
    leadDays: v.leadDays as number | null,
    daily: v.daily as boolean,
    weekly: v.weekly as boolean,
    monthly: v.monthly as boolean,
    archived: v.archived as boolean,
  };
}
export function upcoming(
  events: ReminderEvent[],
  today: string,
): SummaryItem[] {
  return events
    .filter((e) => !e.archived)
    .map((e) => {
      const date = nextOccurrence(e, today);
      return {
        id: e.id,
        name: e.name,
        type: e.type,
        date,
        days: daysBetween(today, date),
        ...(e.year ? { number: Number(date.slice(0, 4)) - e.year } : {}),
      };
    })
    .sort(
      (a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name),
    );
}
export function buildSummary(
  events: ReminderEvent[],
  settings: Settings,
  today: string,
): Summary {
  validateDate(today);
  const summary: Summary = { date: today, sections: [] };
  if (settings.paused || !settings.emailEnabled) return summary;
  const eligible = events.filter((e) => !e.archived && e.emailEnabled);
  const items = upcoming(eligible, today);
  const day = Number(today.slice(8)),
    year = Number(today.slice(0, 4)),
    month = Number(today.slice(5, 7));
  if (day === 1) {
    for (const offset of [0, 1]) {
      const date = new Date(Date.UTC(year, month - 1 + offset, 1));
      const prefix = iso(
        date.getUTCFullYear(),
        date.getUTCMonth() + 1,
        1,
      ).slice(0, 7);
      const selected = items.filter(
        (i) =>
          i.date.startsWith(prefix) &&
          eligible.find((e) => e.id === i.id)!.monthly,
      );
      if (selected.length)
        summary.sections.push({
          kind: "monthly",
          title: new Intl.DateTimeFormat("en-US", {
            month: "long",
            year: "numeric",
            timeZone: "UTC",
          }).format(date),
          items: selected,
        });
    }
  }
  if (new Date(`${today}T00:00:00Z`).getUTCDay() === 1) {
    const selected = items.filter(
      (i) => i.days <= 6 && eligible.find((e) => e.id === i.id)!.weekly,
    );
    if (selected.length)
      summary.sections.push({
        kind: "weekly",
        title: "Coming up this week",
        items: selected,
      });
  }
  const alerts = items.filter((i) => {
    const e = eligible.find((e) => e.id === i.id)!;
    const lead = e.leadDays ?? settings.defaultLeadDays;
    return i.days === 0 || (e.daily ? i.days <= lead : i.days === lead);
  });
  if (alerts.length)
    summary.sections.push({
      kind: "alerts",
      title: "Your reminders",
      items: alerts,
    });
  return summary;
}
