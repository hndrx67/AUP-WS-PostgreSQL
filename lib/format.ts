// All times are shown in Philippine time regardless of where the server runs.
export const TZ = "Asia/Manila";

const fmt = (o: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-PH", { timeZone: TZ, ...o });

export const fmtDate = (iso: string) =>
  fmt({ month: "short", day: "numeric", year: "numeric" }).format(new Date(iso));

export const fmtTime = (iso: string) =>
  fmt({ hour: "numeric", minute: "2-digit" }).format(new Date(iso));

export const fmtDateTime = (iso: string) => `${fmtDate(iso)}, ${fmtTime(iso)}`;

/** YYYY-MM-DD of the given instant in Philippine time. */
export function dayKey(iso: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

/** Value for <input type="datetime-local"> in Philippine time. */
export function toManilaInput(iso: string | null) {
  if (!iso) return "";
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date(iso))
      .map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

/** Convert a datetime-local value (Philippine time) to a UTC ISO string. */
export function fromManilaInput(value: string) {
  const d = new Date(`${value}:00+08:00`);
  if (Number.isNaN(d.getTime())) throw new Error("Invalid date and time");
  return d.toISOString();
}

export const peso = (n: number) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(n);

export function fmtHours(hours: number) {
  const m = Math.round(hours * 60);
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m`;
}

/** "13:30:00" -> "1:30 PM" */
export function fmtClock(t: string) {
  const [h, m] = t.split(":").map(Number);
  return new Date(2000, 0, 1, h, m).toLocaleTimeString("en-PH", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
