export function manilaToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function normalizeWeekStart(value?: string) {
  const fallback = manilaToday();
  const source = value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : fallback;
  const [year, month, day] = source.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.toISOString().slice(0, 10) !== source) return normalizeWeekStart(fallback);
  const weekday = date.getUTCDay();
  date.setUTCDate(date.getUTCDate() - weekday);
  return date.toISOString().slice(0, 10);
}

export function weekBoundsUtc(weekStart: string) {
  const start = new Date(`${weekStart}T00:00:00+08:00`);
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
  return { start: start.toISOString(), end: end.toISOString() };
}
