import type { Payout, TimeLog } from "./types";
import { dayKey } from "./format";

export function logHours(log: Pick<TimeLog, "time_in" | "time_out">) {
  if (!log.time_out) return 0;
  return Math.max(0, (new Date(log.time_out).getTime() - new Date(log.time_in).getTime()) / 36e5);
}

export function summarize(logs: TimeLog[], payouts: Payout[], hourlyRate: number) {
  const totalHours = logs.reduce((s, l) => s + logHours(l), 0);
  const earned = totalHours * hourlyRate;
  const paid = payouts.reduce((s, p) => s + Number(p.amount), 0);
  return { totalHours, earned, paid, balance: earned - paid };
}

/** Hours worked per day for the last `days` days (Philippine time), oldest first. */
export function lastDays(logs: TimeLog[], days = 7) {
  const out: { key: string; label: string; hours: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const iso = new Date(Date.now() - i * 864e5).toISOString();
    out.push({
      key: dayKey(iso),
      label: new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", weekday: "short" }).format(new Date(iso)),
      hours: 0,
    });
  }
  for (const l of logs) {
    const slot = out.find((d) => d.key === dayKey(l.time_in));
    if (slot) slot.hours += logHours(l);
  }
  return out;
}

export function hoursInLastDays(logs: TimeLog[], days: number) {
  const since = Date.now() - days * 864e5;
  return logs
    .filter((l) => new Date(l.time_in).getTime() >= since)
    .reduce((s, l) => s + logHours(l), 0);
}
