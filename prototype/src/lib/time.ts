import type { BranchCalendar } from "./data";

export const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Every date from `from` to `to` (inclusive) as YYYY-MM-DD. */
export function eachDay(from: string, to: string): string[] {
  const out: string[] = [];
  const d = new Date(from + "T00:00:00Z");
  const end = new Date(to + "T00:00:00Z");
  while (d <= end) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

export const weekdayOf = (day: string) => new Date(day + "T00:00:00Z").getUTCDay();

/** Days that count against leave: the branch's working days, minus its holidays. */
export function chargeableDays(from: string, to: string, cal: BranchCalendar | undefined): string[] {
  if (!from || !to || to < from || !cal) return [];
  const holidays = new Set(cal.holidays.map((h) => h.day));
  return eachDay(from, to).filter((d) => cal.weekdays.includes(weekdayOf(d)) && !holidays.has(d));
}

/** Current wall-clock time in India as "HH:MM". */
export function nowIST(): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Kolkata",
  }).format(new Date());
}

/** "18:10" -> "6:10 pm" */
export function clock(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`;
}

/** Hours between two "HH:MM" times, e.g. "9h 12m". */
export function duration(from: string, to: string): string {
  const [a, b] = [from, to].map((t) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  });
  const mins = Math.max(0, b - a);
  return `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, "0")}m`;
}
