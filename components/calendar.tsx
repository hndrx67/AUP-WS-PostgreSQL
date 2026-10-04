"use client";

import { useMemo, useState } from "react";
import {
  addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format,
  isSameMonth, isToday, startOfMonth, startOfWeek, subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { DAYS, dayKey, fmtClock, fmtHours, fmtTime } from "@/lib/format";

type Shift = { id: string; day_of_week: number; start_time: string; end_time: string; label: string | null };
type Log = { id: string; time_in: string; time_out: string | null };

export function Calendar({ shifts, logs }: { shifts: Shift[]; logs: Log[] }) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState(() => new Date());

  const days = useMemo(
    () => eachDayOfInterval({ start: startOfWeek(startOfMonth(month)), end: endOfWeek(endOfMonth(month)) }),
    [month],
  );

  const logsByDay = useMemo(() => {
    const map = new Map<string, Log[]>();
    for (const l of logs) {
      const k = dayKey(l.time_in);
      map.set(k, [...(map.get(k) ?? []), l]);
    }
    return map;
  }, [logs]);

  const hoursOf = (list: Log[] = []) =>
    list.reduce((s, l) => (l.time_out ? s + (new Date(l.time_out).getTime() - new Date(l.time_in).getTime()) / 36e5 : s), 0);

  const selectedKey = format(selected, "yyyy-MM-dd");
  const selectedShifts = shifts
    .filter((s) => s.day_of_week === selected.getDay())
    .sort((a, b) => a.start_time.localeCompare(b.start_time));
  const selectedLogs = logsByDay.get(selectedKey) ?? [];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <section className="card p-4 md:p-5" aria-label="Work calendar">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{format(month, "MMMM yyyy")}</h2>
          <div className="flex items-center gap-1">
            <button className="btn btn-outline h-9 px-3" onClick={() => { setMonth(startOfMonth(new Date())); setSelected(new Date()); }}>
              Today
            </button>
            <button className="btn btn-ghost h-9 w-9 p-0" aria-label="Previous month" onClick={() => setMonth(subMonths(month, 1))}>
              <ChevronLeft size={18} />
            </button>
            <button className="btn btn-ghost h-9 w-9 p-0" aria-label="Next month" onClick={() => setMonth(addMonths(month, 1))}>
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
          {DAYS.map((d) => <div key={d} className="py-1">{d.slice(0, 3)}</div>)}
        </div>

        <div className="mt-1 grid grid-cols-7 gap-1">
          {days.map((d) => {
            const key = format(d, "yyyy-MM-dd");
            const dayLogs = logsByDay.get(key);
            const scheduled = shifts.some((s) => s.day_of_week === d.getDay());
            const worked = hoursOf(dayLogs);
            const isSel = key === selectedKey;
            return (
              <button
                key={key}
                onClick={() => setSelected(d)}
                aria-pressed={isSel}
                aria-label={format(d, "EEEE, MMMM d")}
                className={cn(
                  "flex aspect-square min-h-[3.25rem] flex-col items-start justify-between rounded-lg border p-1.5 text-left text-sm transition-colors md:p-2",
                  isSel ? "border-primary bg-accent" : "border-transparent hover:bg-muted",
                  !isSameMonth(d, month) && "opacity-40",
                )}
              >
                <span className={cn("grid h-6 w-6 place-items-center rounded-full text-xs font-medium", isToday(d) && "bg-primary text-primary-foreground")}>
                  {format(d, "d")}
                </span>
                <span className="flex w-full items-center justify-between gap-1">
                  <span className="flex gap-1">
                    {scheduled && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                    {dayLogs && <span className="h-1.5 w-1.5 rounded-full bg-success" />}
                  </span>
                  {worked > 0 && <span className="hidden text-[10px] text-muted-foreground md:inline">{fmtHours(worked)}</span>}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary" />Scheduled shift</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-success" />Time recorded</span>
        </div>
      </section>

      <aside className="card h-fit p-5" aria-live="polite">
        <h3 className="font-semibold">{format(selected, "EEEE, MMMM d")}</h3>

        <p className="mt-4 text-sm font-medium">Scheduled</p>
        {selectedShifts.length === 0 ? (
          <p className="mt-1 text-sm text-muted-foreground">No shifts on {DAYS[selected.getDay()]}s.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {selectedShifts.map((s) => (
              <li key={s.id} className="rounded-lg bg-accent px-3 py-2 text-sm text-accent-foreground">
                {fmtClock(s.start_time)} to {fmtClock(s.end_time)}
                {s.label && <span className="block text-xs opacity-80">{s.label}</span>}
              </li>
            ))}
          </ul>
        )}

        <p className="mt-5 text-sm font-medium">Recorded</p>
        {selectedLogs.length === 0 ? (
          <p className="mt-1 text-sm text-muted-foreground">Nothing recorded for this day.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {selectedLogs.map((l) => (
              <li key={l.id} className="rounded-lg bg-success/10 px-3 py-2 text-sm">
                {fmtTime(l.time_in)} to {l.time_out ? fmtTime(l.time_out) : "now"}
                <span className="block text-xs text-muted-foreground">
                  {l.time_out ? fmtHours(hoursOf([l])) : "Still clocked in"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}
