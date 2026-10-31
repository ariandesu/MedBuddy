const DAY_MS = 86_400_000;

export function daysAgoDate(days: number): Date {
  return new Date(Date.now() - days * DAY_MS);
}

export function daysAgoISODate(days: number): string {
  return daysAgoDate(days).toISOString().slice(0, 10);
}

/** The app's home timezone (users are in Bangladesh). Server clocks run in UTC. */
export const APP_TIME_ZONE = "Asia/Dhaka";

/** Today's date (YYYY-MM-DD) in Bangladesh, not UTC — avoids the 00:00–06:00 off-by-one. */
export function todayISODate(timeZone: string = APP_TIME_ZONE): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
