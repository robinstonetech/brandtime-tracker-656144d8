/** Pure, client-safe helpers shared by the timesheet UI and server functions. */

/** ISO date (yyyy-mm-dd) for a Date, in local calendar terms. */
export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Parse a yyyy-mm-dd string as a local Date (no timezone shifting). */
export function fromISODate(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** Monday of the week containing `date`. */
export function startOfWeek(date: Date): Date {
  const day = date.getDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day;
  const start = addDays(date, diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

export function currentWeekStartISO(): string {
  return toISODate(startOfWeek(new Date()));
}

export function weekDays(weekStartISO: string): string[] {
  const start = fromISODate(weekStartISO);
  return Array.from({ length: 7 }, (_, i) => toISODate(addDays(start, i)));
}

export function weekEndISO(weekStartISO: string): string {
  return toISODate(addDays(fromISODate(weekStartISO), 6));
}

/** 435 -> "7h 15m", 60 -> "1h", 0 -> "0h" */
export function formatMinutes(minutes: number): string {
  const safe = Math.max(0, Math.round(minutes));
  const h = Math.floor(safe / 60);
  const m = safe % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function formatHours(minutes: number): string {
  return (Math.round((minutes / 60) * 100) / 100).toFixed(2);
}

/** Accepts "1:30", "1.5", "90m", "1h30", "2h" -> minutes. Returns null if unparseable. */
export function parseDurationToMinutes(input: string): number | null {
  const value = input.trim().toLowerCase();
  if (!value) return null;

  const colon = value.match(/^(\d+):([0-5]?\d)$/);
  if (colon) return Number(colon[1]) * 60 + Number(colon[2]);

  const hm = value.match(/^(\d+(?:[.,]\d+)?)\s*h(?:\s*(\d+)\s*m?)?$/);
  if (hm) {
    const hours = Number(hm[1].replace(",", "."));
    const mins = hm[2] ? Number(hm[2]) : 0;
    return Math.round(hours * 60 + mins);
  }

  const onlyMinutes = value.match(/^(\d+)\s*m$/);
  if (onlyMinutes) return Number(onlyMinutes[1]);

  const decimal = value.match(/^(\d+(?:[.,]\d+)?)$/);
  if (decimal) return Math.round(Number(decimal[1].replace(",", ".")) * 60);

  return null;
}

export function elapsedMinutes(startedAtISO: string, now: Date = new Date()): number {
  const started = new Date(startedAtISO).getTime();
  return Math.max(0, Math.floor((now.getTime() - started) / 60000));
}

export function formatElapsed(startedAtISO: string, now: Date = new Date()): string {
  const totalSeconds = Math.max(
    0,
    Math.floor((now.getTime() - new Date(startedAtISO).getTime()) / 1000),
  );
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${`${h}`.padStart(2, "0")}:${`${m}`.padStart(2, "0")}:${`${s}`.padStart(2, "0")}`;
}

export const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export function formatDayLabel(iso: string): string {
  const date = fromISODate(iso);
  return date.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
}

export function formatWeekRange(weekStartISO: string): string {
  const start = fromISODate(weekStartISO);
  const end = fromISODate(weekEndISO(weekStartISO));
  const sameMonth = start.getMonth() === end.getMonth();
  const startText = start.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    ...(sameMonth ? {} : {}),
  });
  const endText = end.toLocaleDateString(undefined, {
    month: sameMonth ? undefined : "short",
    day: "numeric",
    year: "numeric",
  });
  return `${startText} – ${endText}`;
}
