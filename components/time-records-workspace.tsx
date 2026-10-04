"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth,
  isToday, startOfMonth, startOfWeek, subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ActionForm, Field } from "@/components/action-form";
import { ProfileAvatar } from "@/components/profile-avatar";
import { Badge, Empty, Panel } from "@/components/ui";
import { deleteTimeLog, overrideTimeLog } from "@/app/actions/timelogs";
import { fmtDate, fmtHours, fmtTime, toManilaInput, dayKey, DAYS } from "@/lib/format";
import { logHours } from "@/lib/stats";
import type { Profile, TimeLog } from "@/lib/types";

type Student = Pick<Profile, "id" | "full_name" | "student_id" | "avatar_path" | "is_active">;
type Log = TimeLog & { student_id: string };
type View = "list" | "calendar";

function TimeLogEditor({ log }: { log: Log }) {
  return (
    <div className="border-t border-border bg-muted/40 px-5 py-4">
      {log.override_reason && <p className="mb-3 text-sm text-muted-foreground">Last adjustment: {log.override_reason}</p>}
      <ActionForm action={overrideTimeLog} submit="Save override" resetOnSuccess={false} className="grid gap-4 md:grid-cols-3">
        <input type="hidden" name="id" value={log.id} />
        <Field label="Time in"><input className="input" type="datetime-local" name="time_in" defaultValue={toManilaInput(log.time_in)} required /></Field>
        <Field label="Time out"><input className="input" type="datetime-local" name="time_out" defaultValue={toManilaInput(log.time_out)} /></Field>
        <Field label="Reason"><input className="input" name="reason" required /></Field>
      </ActionForm>
      <ActionForm action={deleteTimeLog} submit="Delete record" buttonContainerClassName="mt-3" buttonClassName="btn btn-danger">
        <input type="hidden" name="id" value={log.id} />
      </ActionForm>
    </div>
  );
}

function RecordRow({ log, editable }: { log: Log; editable: boolean }) {
  return (
    <li>
      {editable ? (
        <details className="group">
          <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm hover:bg-muted/50">
            <span>{fmtDate(log.time_in)}, {fmtTime(log.time_in)} to {log.time_out ? fmtTime(log.time_out) : "now"}</span>
            <span className="flex items-center gap-2 text-muted-foreground">
              {log.time_out ? fmtHours(logHours(log)) : <Badge tone="success">In progress</Badge>}
              {log.override_reason && <Badge tone="warning">Adjusted</Badge>}
            </span>
          </summary>
          <TimeLogEditor log={log} />
        </details>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm">
          <span>{fmtDate(log.time_in)}, {fmtTime(log.time_in)} to {log.time_out ? fmtTime(log.time_out) : "now"}</span>
          <span className="flex items-center gap-2 text-muted-foreground">
            {log.time_out ? fmtHours(logHours(log)) : <Badge tone="success">In progress</Badge>}
            {log.override_reason && <Badge tone="warning">Adjusted</Badge>}
          </span>
        </div>
      )}
    </li>
  );
}

function RecordsCalendar({ logs, editable }: { logs: Log[]; editable: boolean }) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState(() => new Date());
  const days = useMemo(() => eachDayOfInterval({ start: startOfWeek(startOfMonth(month)), end: endOfWeek(endOfMonth(month)) }), [month]);
  const logsByDay = useMemo(() => {
    const map = new Map<string, Log[]>();
    for (const log of logs) map.set(dayKey(log.time_in), [...(map.get(dayKey(log.time_in)) ?? []), log]);
    return map;
  }, [logs]);
  const selectedKey = format(selected, "yyyy-MM-dd");
  const selectedLogs = logsByDay.get(selectedKey) ?? [];
  const hoursOf = (list: Log[]) => list.reduce((sum, log) => sum + logHours(log), 0);

  return (
    <div className="grid gap-5 p-4 lg:grid-cols-[minmax(0,1fr)_300px]">
      <section aria-label="Time records calendar">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold">{format(month, "MMMM yyyy")}</h3>
          <div className="flex items-center gap-1">
            <button className="btn btn-outline h-9 px-3" onClick={() => { setMonth(startOfMonth(new Date())); setSelected(new Date()); }}>Today</button>
            <button className="btn btn-ghost h-9 w-9 p-0" aria-label="Previous month" onClick={() => setMonth(subMonths(month, 1))}><ChevronLeft size={18} /></button>
            <button className="btn btn-ghost h-9 w-9 p-0" aria-label="Next month" onClick={() => setMonth(addMonths(month, 1))}><ChevronRight size={18} /></button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">{DAYS.map((day) => <div key={day} className="py-1">{day.slice(0, 3)}</div>)}</div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {days.map((date) => {
            const key = format(date, "yyyy-MM-dd");
            const dayLogs = logsByDay.get(key) ?? [];
            const selectedDay = key === selectedKey;
            return (
              <button key={key} onClick={() => setSelected(date)} aria-pressed={selectedDay} aria-label={format(date, "EEEE, MMMM d")}
                className={`flex aspect-square min-h-12 flex-col items-start justify-between rounded-lg border p-1.5 text-left text-sm transition-colors md:p-2 ${selectedDay ? "border-primary bg-accent" : "border-transparent hover:bg-muted"} ${!isSameMonth(date, month) ? "opacity-40" : ""}`}>
                <span className={`grid h-6 w-6 place-items-center rounded-full text-xs font-medium ${isToday(date) ? "bg-primary text-primary-foreground" : ""}`}>{format(date, "d")}</span>
                <span className="flex w-full items-center justify-between gap-1">
                  {dayLogs.length > 0 ? <span className="h-1.5 w-1.5 rounded-full bg-success" /> : <span />}
                  {hoursOf(dayLogs) > 0 && <span className="hidden text-[10px] text-muted-foreground md:inline">{fmtHours(hoursOf(dayLogs))}</span>}
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Green dot: time records</p>
      </section>
      <aside className="rounded-lg border border-border p-4" aria-live="polite">
        <h3 className="font-semibold">{format(selected, "EEEE, MMMM d")}</h3>
        {selectedLogs.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">No records for this day.</p> : (
          <ul className="mt-3 divide-y divide-border">{selectedLogs.map((log) => (
            <li key={log.id} className="py-2">
              <p className="text-sm">{fmtTime(log.time_in)} to {log.time_out ? fmtTime(log.time_out) : "now"}</p>
              <p className="text-xs text-muted-foreground">{log.time_out ? fmtHours(logHours(log)) : "Still clocked in"}{log.override_reason ? " · Adjusted" : ""}</p>
              {editable && <details className="mt-2"><summary className="cursor-pointer text-xs text-primary">Edit or delete</summary><div className="mt-2"><TimeLogEditor log={log} /></div></details>}
            </li>
          ))}</ul>
        )}
      </aside>
    </div>
  );
}

export function TimeRecordsWorkspace({ students, selectedStudentId, logs, editable, basePath }: {
  students: Student[];
  selectedStudentId: string | null;
  logs: Log[];
  editable: boolean;
  basePath: string;
}) {
  const [studentLayout, setStudentLayout] = useState<"list" | "cards">("list");
  const [recordsView, setRecordsView] = useState<View>("list");
  const selectedStudent = students.find((student) => student.id === selectedStudentId) ?? null;
  const studentHref = (id: string) => `${basePath}?student=${encodeURIComponent(id)}`;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(260px,340px)_minmax(0,1fr)]">
      <Panel title={`Students (${students.length})`}>
        <div className="flex items-center justify-end gap-1 border-b border-border px-4 py-3">
          <span className="mr-auto text-xs text-muted-foreground">Display</span>
          <button type="button" className={`btn btn-sm ${studentLayout === "list" ? "btn-primary" : "btn-outline"}`} aria-pressed={studentLayout === "list"} onClick={() => setStudentLayout("list")}>List</button>
          <button type="button" className={`btn btn-sm ${studentLayout === "cards" ? "btn-primary" : "btn-outline"}`} aria-pressed={studentLayout === "cards"} onClick={() => setStudentLayout("cards")}>Cards</button>
        </div>
        {students.length === 0 ? <Empty>No students found.</Empty> : studentLayout === "list" ? (
          <ul className="divide-y divide-border">{students.map((student) => (
            <li key={student.id}><Link href={studentHref(student.id)} aria-current={selectedStudent?.id === student.id ? "page" : undefined} className={`flex items-center gap-3 px-4 py-3 hover:bg-muted/50 ${selectedStudent?.id === student.id ? "bg-accent" : ""}`}>
              <ProfileAvatar profile={student} size="sm" /><span className="min-w-0 flex-1 truncate text-sm font-medium">{student.full_name}</span>{!student.is_active && <Badge tone="default">Inactive</Badge>}
            </Link></li>
          ))}</ul>
        ) : (
          <ul className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">{students.map((student) => (
            <li key={student.id}><Link href={studentHref(student.id)} aria-current={selectedStudent?.id === student.id ? "page" : undefined} className={`flex h-full items-center gap-3 rounded-lg border border-border p-3 hover:bg-muted/50 ${selectedStudent?.id === student.id ? "bg-accent" : ""}`}>
              <ProfileAvatar profile={student} size="md" /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{student.full_name}</span>{student.student_id && <span className="block truncate text-xs text-muted-foreground">{student.student_id}</span>}</span>
            </Link></li>
          ))}</ul>
        )}
      </Panel>

      {!selectedStudent ? (
        <Panel><Empty>Select a student to view their time records.</Empty></Panel>
      ) : (
        <div className="min-w-0 space-y-5">
          <Panel>
            <div className="flex items-center gap-4 p-5">
              <ProfileAvatar profile={selectedStudent} size="lg" />
              <div className="min-w-0"><h2 className="truncate text-xl font-semibold">{selectedStudent.full_name}</h2>{selectedStudent.student_id && <p className="mt-1 text-sm text-muted-foreground">Student ID: {selectedStudent.student_id}</p>}<p className="mt-1 text-sm text-muted-foreground">{logs.length} time {logs.length === 1 ? "record" : "records"}</p></div>
            </div>
          </Panel>
          <Panel title="Time records">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
              <span className="text-sm text-muted-foreground">{recordsView === "list" ? "Record list" : "Calendar"}</span>
              <div className="flex gap-2">
                <button type="button" className={`btn btn-sm ${recordsView === "list" ? "btn-primary" : "btn-outline"}`} aria-pressed={recordsView === "list"} onClick={() => setRecordsView("list")}>List view</button>
                <button type="button" className={`btn btn-sm ${recordsView === "calendar" ? "btn-primary" : "btn-outline"}`} aria-pressed={recordsView === "calendar"} onClick={() => setRecordsView("calendar")}>Calendar view</button>
              </div>
            </div>
            {logs.length === 0 ? <Empty>No time records for this student.</Empty> : recordsView === "calendar" ? <RecordsCalendar logs={logs} editable={editable} /> : (
              <ul className="divide-y divide-border">{logs.map((log) => <RecordRow key={log.id} log={log} editable={editable} />)}</ul>
            )}
          </Panel>
        </div>
      )}
    </div>
  );
}
