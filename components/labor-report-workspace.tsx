"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { addDays, format, parseISO } from "date-fns";
import { ChevronLeft, ChevronRight, Printer } from "lucide-react";
import { ProfileAvatar } from "@/components/profile-avatar";
import { Badge, Empty, Panel } from "@/components/ui";
import { dayKey, fmtDate, fmtHours, fmtTime, toManilaInput } from "@/lib/format";
import { logHours } from "@/lib/stats";
import type { Profile, TimeLog } from "@/lib/types";

type Student = Pick<Profile, "id" | "full_name" | "student_id" | "avatar_path" | "is_active" | "work_assignment" | "department_id"> & { department_name: string | null };
type LaborLog = Pick<TimeLog, "id" | "student_id" | "time_in" | "time_out">;
type ReportDay = {
  date: string;
  timeIn: string;
  timeOut: string;
  hours: string;
  accomplishments: string;
  remarks: string;
  signature: string;
};

function addDate(date: string, count: number) {
  return format(addDays(parseISO(`${date}T12:00:00`), count), "yyyy-MM-dd");
}

function makeReportDay(date: string, logs: LaborLog[]): ReportDay {
  const sorted = [...logs].sort((a, b) => a.time_in.localeCompare(b.time_in));
  const first = sorted[0];
  const lastClosed = [...sorted].reverse().find((log) => log.time_out)?.time_out ?? null;
  const totalHours = logs.reduce((sum, log) => sum + logHours(log), 0);
  return {
    date,
    timeIn: first ? toManilaInput(first.time_in).slice(11, 16) : "",
    timeOut: lastClosed ? toManilaInput(lastClosed).slice(11, 16) : "",
    hours: totalHours ? (Math.round(totalHours * 100) / 100).toFixed(2) : "",
    accomplishments: "",
    remarks: "",
    signature: "",
  };
}

function dateLabel(date: string) {
  return fmtDate(`${date}T12:00:00+08:00`);
}

function printableTime(value: string) {
  if (!value) return "—";
  const [hour, minute] = value.split(":").map(Number);
  return new Date(2000, 0, 1, hour, minute).toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" });
}

export function LaborReportWorkspace({
  students,
  selectedStudentId,
  logs,
  weekStart,
  basePath,
}: {
  students: Student[];
  selectedStudentId: string | null;
  logs: LaborLog[];
  weekStart: string;
  basePath: string;
}) {
  const [studentLayout, setStudentLayout] = useState<"list" | "cards">("list");
  const selectedStudent = students.find((student) => student.id === selectedStudentId) ?? null;
  const groupedLogs = useMemo(() => {
    const grouped = new Map<string, LaborLog[]>();
    logs.forEach((log) => {
      const key = dayKey(log.time_in);
      grouped.set(key, [...(grouped.get(key) ?? []), log]);
    });
    return grouped;
  }, [logs]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => addDate(weekStart, index)), [weekStart]);
  const daysWithLogs = weekDays.filter((date) => (groupedLogs.get(date)?.length ?? 0) > 0);
  const [selectedDates, setSelectedDates] = useState<string[]>(daysWithLogs);
  const [reportName, setReportName] = useState(selectedStudent?.full_name ?? "");
  const [workAssignment, setWorkAssignment] = useState(selectedStudent?.work_assignment ?? "");
  const [department, setDepartment] = useState(selectedStudent?.department_name ?? "");
  const [periodFrom, setPeriodFrom] = useState(daysWithLogs[0] ?? weekDays[0]);
  const [periodTo, setPeriodTo] = useState(daysWithLogs.at(-1) ?? weekDays.at(-1)!);
  const [reportDays, setReportDays] = useState<ReportDay[]>(daysWithLogs.map((date) => makeReportDay(date, groupedLogs.get(date) ?? [])));
  const weeksAgoHref = `${basePath}?student=${encodeURIComponent(selectedStudentId ?? "")}&week=${addDate(weekStart, -7)}`;
  const weeksAheadHref = `${basePath}?student=${encodeURIComponent(selectedStudentId ?? "")}&week=${addDate(weekStart, 7)}`;

  function toggleDate(date: string, checked: boolean) {
    setSelectedDates((current) => checked ? [...current, date].sort() : current.filter((item) => item !== date));
    setReportDays((current) => {
      if (!checked) return current.filter((day) => day.date !== date);
      if (current.some((day) => day.date === date)) return current;
      return [...current, makeReportDay(date, groupedLogs.get(date) ?? [])].sort((a, b) => a.date.localeCompare(b.date));
    });
    if (checked) {
      setPeriodFrom((current) => date < current ? date : current);
      setPeriodTo((current) => date > current ? date : current);
    }
  }

  function updateDay(date: string, field: keyof Omit<ReportDay, "date">, value: string) {
    setReportDays((current) => current.map((day) => day.date === date ? { ...day, [field]: value } : day));
  }

  function exportPdf() {
    if (!reportDays.length) return;
    window.print();
  }

  const weekTitle = `${dateLabel(weekDays[0])} – ${dateLabel(weekDays[6])}`;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(260px,340px)_minmax(0,1fr)]">
      <Panel title={`Students (${students.length})`}>
        <div className="flex items-center justify-end gap-1 border-b border-border px-4 py-3 no-print">
          <span className="mr-auto text-xs text-muted-foreground">Display</span>
          <button type="button" className={`btn btn-sm ${studentLayout === "list" ? "btn-primary" : "btn-outline"}`} aria-pressed={studentLayout === "list"} onClick={() => setStudentLayout("list")}>List</button>
          <button type="button" className={`btn btn-sm ${studentLayout === "cards" ? "btn-primary" : "btn-outline"}`} aria-pressed={studentLayout === "cards"} onClick={() => setStudentLayout("cards")}>Cards</button>
        </div>
        {students.length === 0 ? <Empty>No students found.</Empty> : studentLayout === "list" ? (
          <ul className="divide-y divide-border">{students.map((student) => (
            <li key={student.id}><Link href={`${basePath}?student=${encodeURIComponent(student.id)}&week=${weekStart}`} aria-current={selectedStudent?.id === student.id ? "page" : undefined} className={`flex items-center gap-3 px-4 py-3 hover:bg-muted/50 ${selectedStudent?.id === student.id ? "bg-accent" : ""}`}>
              <ProfileAvatar profile={student} size="sm" /><span className="min-w-0 flex-1 truncate text-sm font-medium">{student.full_name}</span>{!student.is_active && <Badge>Inactive</Badge>}
            </Link></li>
          ))}</ul>
        ) : (
          <ul className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">{students.map((student) => (
            <li key={student.id}><Link href={`${basePath}?student=${encodeURIComponent(student.id)}&week=${weekStart}`} aria-current={selectedStudent?.id === student.id ? "page" : undefined} className={`flex h-full items-center gap-3 rounded-lg border border-border p-3 hover:bg-muted/50 ${selectedStudent?.id === student.id ? "bg-accent" : ""}`}>
              <ProfileAvatar profile={student} size="md" /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{student.full_name}</span><span className="block truncate text-xs text-muted-foreground">{student.student_id || "No student ID"}</span></span>
            </Link></li>
          ))}</ul>
        )}
      </Panel>

      {!selectedStudent ? <Panel><Empty>Select a student to prepare a labor report.</Empty></Panel> : (
        <div className="min-w-0 space-y-5">
          <Panel title="Select report days">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
              <h2 className="font-medium">Week of {weekTitle}</h2>
              <div className="flex gap-1 no-print">
                <Link className="btn btn-ghost h-9 w-9 p-0" aria-label="Previous week" href={weeksAgoHref}><ChevronLeft size={18} /></Link>
                <Link className="btn btn-ghost h-9 w-9 p-0" aria-label="Next week" href={weeksAheadHref}><ChevronRight size={18} /></Link>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-4 xl:grid-cols-7 no-print">
              {weekDays.map((date) => {
                const dayLogs = groupedLogs.get(date) ?? [];
                const selected = selectedDates.includes(date);
                return (
                  <label key={date} className={`cursor-pointer rounded-lg border p-3 transition-colors ${selected ? "border-primary bg-accent" : "border-border hover:bg-muted/50"}`}>
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">{format(parseISO(`${date}T12:00:00`), "EEE, MMM d")}</span>
                      <input type="checkbox" checked={selected} onChange={(event) => toggleDate(date, event.target.checked)} aria-label={`Include ${dateLabel(date)} in report`} />
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">{dayLogs.length ? `${dayLogs.length} record${dayLogs.length > 1 ? "s" : ""} · ${fmtHours(dayLogs.reduce((sum, log) => sum + logHours(log), 0))}` : "No clock records"}</span>
                  </label>
                );
              })}
            </div>
            {selectedDates.length === 0 && <p className="px-5 pb-4 text-sm text-muted-foreground">Select at least one day to include it in the report.</p>}
          </Panel>

          <Panel title="Edit labor report" description="Fields are prefilled from the student's account and time records. Update them as needed before exporting.">
            <div className="grid gap-4 p-5 sm:grid-cols-2 no-print">
              <label><span className="label">Name of Work Scholar</span><input className="input" value={reportName} onChange={(event) => setReportName(event.target.value)} /></label>
              <label><span className="label">Work Assignment</span><input className="input" value={workAssignment} onChange={(event) => setWorkAssignment(event.target.value)} /></label>
              <label><span className="label">Department</span><input className="input" value={department} onChange={(event) => setDepartment(event.target.value)} /></label>
              <div className="grid grid-cols-2 gap-3">
                <label><span className="label">Period from</span><input type="date" className="input" value={periodFrom} onChange={(event) => setPeriodFrom(event.target.value)} /></label>
                <label><span className="label">Period to</span><input type="date" className="input" value={periodTo} onChange={(event) => setPeriodTo(event.target.value)} /></label>
              </div>
              {reportDays.map((day) => (
                <section key={day.date} className="rounded-lg border border-border p-4 sm:col-span-2">
                  <h3 className="mb-3 font-medium">{dateLabel(day.date)} <span className="font-normal text-muted-foreground">({format(parseISO(`${day.date}T12:00:00`), "EEEE")})</span></h3>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <label><span className="label">Date</span><input type="date" className="input" value={day.date} onChange={(event) => {
                      const nextDate = event.target.value;
                      if (!nextDate || (nextDate !== day.date && reportDays.some((item) => item.date === nextDate))) return;
                      setSelectedDates((current) => current.map((date) => date === day.date ? nextDate : date).sort());
                      setReportDays((current) => current.map((item) => item.date === day.date ? { ...item, date: nextDate } : item).sort((a, b) => a.date.localeCompare(b.date)));
                    }} /></label>
                    <label><span className="label">Time in</span><input type="time" className="input" value={day.timeIn} onChange={(event) => updateDay(day.date, "timeIn", event.target.value)} /></label>
                    <label><span className="label">Time out</span><input type="time" className="input" value={day.timeOut} onChange={(event) => updateDay(day.date, "timeOut", event.target.value)} /></label>
                    <label><span className="label"># of hours</span><input type="number" min="0" step="0.01" className="input" value={day.hours} onChange={(event) => updateDay(day.date, "hours", event.target.value)} /></label>
                    <label className="sm:col-span-2"><span className="label">Summary of accomplishments and/or jobs done</span><textarea className="input min-h-20 resize-y" value={day.accomplishments} onChange={(event) => updateDay(day.date, "accomplishments", event.target.value)} /></label>
                    <label><span className="label">Supervisor's remarks</span><textarea className="input min-h-20 resize-y" value={day.remarks} onChange={(event) => updateDay(day.date, "remarks", event.target.value)} /></label>
                    <label><span className="label">Supervisor's signature / name</span><input className="input" value={day.signature} onChange={(event) => updateDay(day.date, "signature", event.target.value)} /></label>
                  </div>
                </section>
              ))}
              <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
                <button type="button" className="btn btn-primary" disabled={!reportDays.length} onClick={exportPdf}><Printer size={16} />Export PDF</button>
                <span className="text-xs text-muted-foreground">In the print dialog, choose Save as PDF.</span>
              </div>
            </div>

            <article className="labor-report-print mx-auto max-w-[1100px] p-5 sm:p-8">
              <header className="border-b-2 border-black pb-3 text-center text-black">
                <p className="text-xs font-medium uppercase tracking-wide">Adventist University of the Philippines · Student Finance Office</p>
                <h2 className="mt-2 text-2xl font-bold">WORK SCHOLAR LABOR REPORT</h2>
              </header>
              <dl className="grid grid-cols-2 gap-x-8 gap-y-2 py-4 text-sm text-black sm:grid-cols-3">
                <div><dt className="inline font-semibold">Name of Work Scholar: </dt><dd className="inline">{reportName || "________________________"}</dd></div>
                <div><dt className="inline font-semibold">Work Assignment: </dt><dd className="inline">{workAssignment || "________________________"}</dd></div>
                <div><dt className="inline font-semibold">Department: </dt><dd className="inline">{department || "________________________"}</dd></div>
                <div className="sm:col-span-3"><dt className="inline font-semibold">Period Covered: </dt><dd className="inline">From {periodFrom ? dateLabel(periodFrom) : "__________"} to {periodTo ? dateLabel(periodTo) : "__________"}</dd></div>
              </dl>
              {reportDays.length === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">Select days above to build the report.</p> : (
                <table className="w-full table-fixed border-collapse text-left text-[10px] text-black sm:text-xs">
                  <thead><tr className="bg-gray-100">
                    <th className="w-[10%] border border-black p-2">Date &amp; Day</th>
                    <th className="w-[8%] border border-black p-2">Time in</th>
                    <th className="w-[8%] border border-black p-2">Time out</th>
                    <th className="w-[6%] border border-black p-2"># of Hrs.</th>
                    <th className="w-[27%] border border-black p-2">Summary of accomplishments and/or jobs done</th>
                    <th className="w-[18%] border border-black p-2">Supervisor's Remarks</th>
                    <th className="w-[23%] border border-black p-2">Supervisor's Signature</th>
                  </tr></thead>
                  <tbody>{reportDays.map((day) => (
                    <tr key={day.date} className="align-top">
                      <td className="border border-black p-2">{dateLabel(day.date)}<br />{format(parseISO(`${day.date}T12:00:00`), "EEEE")}</td>
                      <td className="border border-black p-2">{printableTime(day.timeIn)}</td>
                      <td className="border border-black p-2">{printableTime(day.timeOut)}</td>
                      <td className="border border-black p-2">{day.hours || "—"}</td>
                      <td className="whitespace-pre-wrap border border-black p-2">{day.accomplishments || " "}</td>
                      <td className="whitespace-pre-wrap border border-black p-2">{day.remarks || " "}</td>
                      <td className="whitespace-pre-wrap border border-black p-2">{day.signature || " "}</td>
                    </tr>
                  ))}</tbody>
                </table>
              )}
              <p className="mt-3 text-right text-xs font-semibold text-black">Total Hours: {reportDays.reduce((sum, day) => sum + (Number(day.hours) || 0), 0).toFixed(2)}</p>
            </article>
          </Panel>
        </div>
      )}
    </div>
  );
}
