"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { addDays, format, parseISO } from "date-fns";
import { ChevronLeft, ChevronRight, FileDown } from "lucide-react";
import { ProfileAvatar } from "@/components/profile-avatar";
import { Badge, Empty, Panel } from "@/components/ui";
import { dayKey, fmtDate, fmtHours, toManilaInput } from "@/lib/format";
import { logHours } from "@/lib/stats";
import { showToast } from "@/lib/toast";
import type { Profile, TimeLog } from "@/lib/types";

type Student = Pick<Profile, "id" | "full_name" | "student_id" | "avatar_path" | "is_active" | "work_assignment" | "department_id"> & { department_name: string | null };
type LaborLog = Pick<TimeLog, "id" | "student_id" | "time_in" | "time_out">;
type Period = "AM" | "PM";
type ReportSlot = { timeIn: string; timeOut: string; hours: string; accomplishments: string; remarks: string; signature: string };
type ReportDay = { date: string; am: ReportSlot; pm: ReportSlot };
type SlotField = keyof ReportSlot;

function addDate(date: string, count: number) {
  return format(addDays(parseISO(`${date}T12:00:00`), count), "yyyy-MM-dd");
}

function blankSlot(): ReportSlot {
  return { timeIn: "", timeOut: "", hours: "", accomplishments: "", remarks: "", signature: "" };
}

function makeSlot(logs: LaborLog[]): ReportSlot {
  const sorted = [...logs].sort((a, b) => a.time_in.localeCompare(b.time_in));
  const first = sorted[0];
  const lastClosed = [...sorted].reverse().find((log) => log.time_out)?.time_out ?? null;
  const totalHours = logs.reduce((sum, log) => sum + logHours(log), 0);
  return {
    ...blankSlot(),
    timeIn: first ? toManilaInput(first.time_in).slice(11, 16) : "",
    timeOut: lastClosed ? toManilaInput(lastClosed).slice(11, 16) : "",
    hours: totalHours ? (Math.round(totalHours * 100) / 100).toFixed(2) : "",
  };
}

function makeReportDay(date: string, logs: LaborLog[]): ReportDay {
  const morning: LaborLog[] = [];
  const afternoon: LaborLog[] = [];
  for (const log of logs) {
    const hour = Number(toManilaInput(log.time_in).slice(11, 13));
    (hour < 12 ? morning : afternoon).push(log);
  }
  return { date, am: makeSlot(morning), pm: makeSlot(afternoon) };
}

function dateLabel(date: string) {
  return date ? fmtDate(`${date}T12:00:00+08:00`) : "—";
}

function weekdayLabel(date: string) {
  return date ? format(parseISO(`${date}T12:00:00`), "EEEE") : "";
}

function printableTime(value: string) {
  if (!value) return "";
  const [hour, minute] = value.split(":").map(Number);
  return new Date(2000, 0, 1, hour, minute).toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" });
}

function SlotEditor({ period, slot, onChange }: { period: Period; slot: ReportSlot; onChange: (field: SlotField, value: string) => void }) {
  return (
    <div className="rounded-lg border border-border p-4">
      <h4 className="mb-3 text-sm font-semibold">{period} entries</h4>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <label><span className="label">Time in</span><input type="time" className="input" value={slot.timeIn} onChange={(event) => onChange("timeIn", event.target.value)} /></label>
        <label><span className="label">Time out</span><input type="time" className="input" value={slot.timeOut} onChange={(event) => onChange("timeOut", event.target.value)} /></label>
        <label><span className="label"># of hours</span><input type="number" min="0" step="0.01" className="input" value={slot.hours} onChange={(event) => onChange("hours", event.target.value)} /></label>
        <label><span className="label">Supervisor's signature</span><input className="input" value={slot.signature} onChange={(event) => onChange("signature", event.target.value)} /></label>
        <label className="sm:col-span-2"><span className="label">Summary of accomplishments and/or jobs done</span><textarea className="input min-h-20 resize-y" value={slot.accomplishments} onChange={(event) => onChange("accomplishments", event.target.value)} /></label>
        <label className="sm:col-span-2"><span className="label">Supervisor's remarks</span><textarea className="input min-h-20 resize-y" value={slot.remarks} onChange={(event) => onChange("remarks", event.target.value)} /></label>
      </div>
    </div>
  );
}

export function LaborReportWorkspace({ students, selectedStudentId, logs, weekStart, basePath }: {
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
    for (const log of logs) {
      const key = dayKey(log.time_in);
      grouped.set(key, [...(grouped.get(key) ?? []), log]);
    }
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
  const [scholarSignature, setScholarSignature] = useState("");
  const [supervisorSignature, setSupervisorSignature] = useState("");
  const [exporting, setExporting] = useState(false);
  const previousWeekHref = `${basePath}?student=${encodeURIComponent(selectedStudentId ?? "")}&week=${addDate(weekStart, -7)}`;
  const nextWeekHref = `${basePath}?student=${encodeURIComponent(selectedStudentId ?? "")}&week=${addDate(weekStart, 7)}`;

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

  function updateSlot(date: string, period: Period, field: SlotField, value: string) {
    setReportDays((current) => current.map((day) => day.date === date ? { ...day, [period.toLowerCase()]: { ...day[period.toLowerCase() as "am" | "pm"], [field]: value } } : day));
  }

  function updateDate(oldDate: string, newDate: string) {
    if (!newDate || (newDate !== oldDate && reportDays.some((item) => item.date === newDate))) return;
    setSelectedDates((current) => current.map((date) => date === oldDate ? newDate : date).sort());
    setReportDays((current) => current.map((day) => day.date === oldDate ? { ...day, date: newDate } : day).sort((a, b) => a.date.localeCompare(b.date)));
  }

  async function exportWordDocument() {
    if (!reportDays.length || !selectedStudent) return;
    setExporting(true);
    try {
      const response = await fetch("/api/labor-report/docx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: selectedStudent.id,
          report: { name: reportName, workAssignment, department, periodFrom, periodTo, scholarSignature, supervisorSignature, days: reportDays },
        }),
      });
      if (!response.ok) {
        const result = await response.json().catch(() => null) as { error?: string } | null;
        showToast(result?.error ?? "Could not export the Word report.", "error");
        return;
      }
      const blob = await response.blob();
      const fileUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      const safeName = reportName.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "Student";
      anchor.href = fileUrl;
      anchor.download = `Work-Scholar-Labor-Report-${safeName}.docx`;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(fileUrl), 1000);
      showToast("Word labor report downloaded.", "success");
    } catch {
      showToast("Could not export the Word report. Check your connection and try again.", "error");
    } finally {
      setExporting(false);
    }
  }

  const totalHours = reportDays.reduce((sum, day) => sum + (Number(day.am.hours) || 0) + (Number(day.pm.hours) || 0), 0);
  const weekTitle = `${dateLabel(weekDays[0])} – ${dateLabel(weekDays[6])}`;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(260px,340px)_minmax(0,1fr)]">
      <Panel title={`Students (${students.length})`}>
        <div className="no-print flex items-center justify-end gap-1 border-b border-border px-4 py-3">
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
            <div className="no-print flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
              <h2 className="font-medium">Week of {weekTitle}</h2>
              <div className="flex gap-1">
                <Link className="btn btn-ghost h-9 w-9 p-0" aria-label="Previous week" href={previousWeekHref}><ChevronLeft size={18} /></Link>
                <Link className="btn btn-ghost h-9 w-9 p-0" aria-label="Next week" href={nextWeekHref}><ChevronRight size={18} /></Link>
              </div>
            </div>
            <div className="no-print grid grid-cols-2 gap-2 p-4 sm:grid-cols-4 xl:grid-cols-7">
              {weekDays.map((date) => {
                const dayLogs = groupedLogs.get(date) ?? [];
                const selected = selectedDates.includes(date);
                return (
                  <label key={date} className={`cursor-pointer rounded-lg border p-3 transition-colors ${selected ? "border-primary bg-accent" : "border-border hover:bg-muted/50"}`}>
                    <span className="flex items-center justify-between gap-2"><span className="text-sm font-medium">{format(parseISO(`${date}T12:00:00`), "EEE, MMM d")}</span><input type="checkbox" checked={selected} onChange={(event) => toggleDate(date, event.target.checked)} aria-label={`Include ${dateLabel(date)} in report`} /></span>
                    <span className="mt-1 block text-xs text-muted-foreground">{dayLogs.length ? `${dayLogs.length} record${dayLogs.length > 1 ? "s" : ""} · ${fmtHours(dayLogs.reduce((sum, log) => sum + logHours(log), 0))}` : "No clock records"}</span>
                  </label>
                );
              })}
            </div>
            {selectedDates.length === 0 && <p className="no-print px-5 pb-4 text-sm text-muted-foreground">Select at least one day to include it in the report.</p>}
          </Panel>

          <Panel title="Edit labor report" description="Edit the fields below and review the live form preview before downloading the Word document.">
            <div className="no-print grid gap-4 p-5 sm:grid-cols-2">
              <label><span className="label">Name of Work Scholar</span><input className="input" value={reportName} onChange={(event) => setReportName(event.target.value)} /></label>
              <label><span className="label">Work Assignment</span><input className="input" value={workAssignment} onChange={(event) => setWorkAssignment(event.target.value)} /></label>
              <label><span className="label">Department</span><input className="input" value={department} onChange={(event) => setDepartment(event.target.value)} /></label>
              <div className="grid grid-cols-2 gap-3">
                <label><span className="label">Period from</span><input type="date" className="input" value={periodFrom} onChange={(event) => setPeriodFrom(event.target.value)} /></label>
                <label><span className="label">Period to</span><input type="date" className="input" value={periodTo} onChange={(event) => setPeriodTo(event.target.value)} /></label>
              </div>
              {reportDays.map((day) => (
                <section key={day.date} className="rounded-lg border border-border p-4 sm:col-span-2">
                  <div className="mb-4 flex flex-wrap items-end gap-3">
                    <label><span className="label">Date</span><input type="date" className="input" value={day.date} onChange={(event) => updateDate(day.date, event.target.value)} /></label>
                    <p className="pb-2 text-sm text-muted-foreground">{weekdayLabel(day.date)}</p>
                  </div>
                  <div className="grid gap-4 xl:grid-cols-2">
                    <SlotEditor period="AM" slot={day.am} onChange={(field, value) => updateSlot(day.date, "AM", field, value)} />
                    <SlotEditor period="PM" slot={day.pm} onChange={(field, value) => updateSlot(day.date, "PM", field, value)} />
                  </div>
                </section>
              ))}
              <div className="grid gap-4 sm:grid-cols-2 sm:col-span-2">
                <label><span className="label">Work scholar signature (printed name)</span><input className="input" value={scholarSignature} onChange={(event) => setScholarSignature(event.target.value)} /></label>
                <label><span className="label">Supervisor signature (printed name)</span><input className="input" value={supervisorSignature} onChange={(event) => setSupervisorSignature(event.target.value)} /></label>
              </div>
              <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
                <button type="button" className="btn btn-primary" disabled={!reportDays.length || exporting} onClick={exportWordDocument}><FileDown size={16} />{exporting ? "Preparing Word file..." : "Download Word document"}</button>
                <span className="text-xs text-muted-foreground">Downloads a copy of the original labor report template with your edits.</span>
              </div>
            </div>

            <article className="labor-report-print mx-auto max-w-[920px] p-5 text-black sm:p-8">
              <header className="grid grid-cols-[96px_1fr_82px] items-center gap-3 pb-3">
                <Image src="/labor-report-logo.png" alt="Adventist University of the Philippines seal" width={96} height={88} unoptimized className="h-[88px] w-[96px] object-contain" />
                <div className="text-center leading-tight">
                  <p className="text-[11px] font-bold uppercase">Adventist University of the Philippines</p>
                  <p className="mt-1 text-[9px]">Puting Kahoy, Silang, Cavite</p>
                  <p className="text-[9px]">Student Finance Office</p>
                </div>
                <div className="text-right text-[8px]"><p>FM-DSF-023</p><p className="mt-1">Rev. 1</p></div>
              </header>
              <h2 className="py-4 text-center text-lg font-bold">WORK SCHOLAR LABOR REPORT</h2>

              <div className="grid grid-cols-2 gap-x-8 gap-y-3 pb-4 text-[11px]">
                <p><strong>Name of Work Scholar:</strong> <span className="labor-underline">{reportName || " "}</span></p>
                <p><strong>Work Assignment:</strong> <span className="labor-underline">{workAssignment || " "}</span></p>
                <p><strong>Period Covered:</strong> From <span className="labor-underline">{periodFrom ? dateLabel(periodFrom) : " "}</span> to <span className="labor-underline">{periodTo ? dateLabel(periodTo) : " "}</span></p>
                <p><strong>Department:</strong> <span className="labor-underline">{department || " "}</span></p>
              </div>

              <table className="labor-report-table w-full table-fixed border-collapse text-left text-[8px] leading-tight">
                <colgroup><col style={{ width: "8.24%" }} /><col style={{ width: "3.47%" }} /><col style={{ width: "4.54%" }} /><col style={{ width: "4.78%" }} /><col style={{ width: "6.33%" }} /><col style={{ width: "46.59%" }} /><col style={{ width: "13.38%" }} /><col style={{ width: "12.67%" }} /></colgroup>
                <thead>
                  <tr>
                    <th rowSpan={2}>Date &amp;<br />Day</th><th rowSpan={2} aria-label="AM or PM" />
                    <th colSpan={2}>Time</th><th rowSpan={2}># of Hrs.</th>
                    <th rowSpan={2}>Summary of accomplishments and/or jobs done</th>
                    <th rowSpan={2}>Supervisor's Remarks</th><th rowSpan={2}>Supervisor's Signature</th>
                  </tr>
                  <tr><th>in</th><th>out</th></tr>
                </thead>
                <tbody>
                  {reportDays.flatMap((day) => ([
                    { key: `${day.date}-am`, date: day, period: "AM" as const, slot: day.am },
                    { key: `${day.date}-pm`, date: day, period: "PM" as const, slot: day.pm },
                  ])).map((row, index) => (
                    <tr key={row.key}>
                      {index % 2 === 0 && <td rowSpan={2} className="labor-date-cell">{dateLabel(row.date.date)}<br />{weekdayLabel(row.date.date)}</td>}
                      <td className="text-center">{row.period}</td><td>{printableTime(row.slot.timeIn)}</td><td>{printableTime(row.slot.timeOut)}</td><td className="text-center">{row.slot.hours}</td>
                      <td className="labor-text-cell">{row.slot.accomplishments}</td><td className="labor-text-cell">{row.slot.remarks}</td><td className="labor-text-cell">{row.slot.signature}</td>
                    </tr>
                  ))}
                  <tr className="labor-total-row"><td colSpan={4}><strong>Total Hours</strong></td><td className="text-center"><strong>{totalHours.toFixed(2)}</strong></td><td /><td /><td /></tr>
                </tbody>
              </table>

              <div className="mt-3 space-y-1 text-[9px] leading-snug">
                <p><strong>Reminder:</strong> Deadline for submissions of Weekly labor report is <strong>EVERY MONDAY and TUESDAY ONLY.</strong></p>
                <p>Any <strong>ALTERATION or CORRECTION</strong> in figures will not be honored unless <strong>COUNTER SIGNED</strong> by the supervisor.</p>
              </div>

              <div className="mt-9 grid grid-cols-2 gap-12 text-center text-[9px]">
                <div><p className="labor-signature-line" /><p className="labor-signature-value">{scholarSignature || " "}</p><p className="mt-1 italic">(Signature over printed name of the Work Scholar)</p></div>
                <div><p className="labor-signature-line" /><p className="labor-signature-value">{supervisorSignature || " "}</p><p className="mt-1 italic">(Signature over printed name of the Supervisor)</p></div>
              </div>
            </article>
          </Panel>
        </div>
      )}
    </div>
  );
}
