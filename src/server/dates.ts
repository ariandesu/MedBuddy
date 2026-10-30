const DAY_MS = 86_400_000;

export function daysAgoDate(days: number): Date {
  return new Date(Date.now() - days * DAY_MS);
}

export function daysAgoISODate(days: number): string {
  return daysAgoDate(days).toISOString().slice(0, 10);
}
