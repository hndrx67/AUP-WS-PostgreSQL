import { readFile } from "node:fs/promises";
import path from "node:path";
import { getSessionProfile } from "@/lib/auth";
import { query } from "@/lib/db";
import { buildLaborReportDocumentXml, type DocxLaborReport, type DocxReportDay, type DocxReportSlot } from "@/lib/labor-report-docx";
import { readDocxEntry, replaceDocxDocumentXml } from "@/lib/docx-package";

export const runtime = "nodejs";

const validDate = (value: unknown): value is string => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};
const textField = (value: unknown, max: number) => typeof value === "string" ? value.slice(0, max) : "";

function reportSlot(value: unknown): DocxReportSlot {
  const slot = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    timeIn: textField(slot.timeIn, 20),
    timeOut: textField(slot.timeOut, 20),
    hours: textField(slot.hours, 20),
    accomplishments: textField(slot.accomplishments, 2000),
    remarks: textField(slot.remarks, 1000),
    signature: textField(slot.signature, 200),
  };
}

function parseReport(value: unknown): DocxLaborReport | null {
  if (!value || typeof value !== "object") return null;
  const source = value as Record<string, unknown>;
  if (!validDate(source.periodFrom) || !validDate(source.periodTo) || !Array.isArray(source.days) || source.days.length < 1 || source.days.length > 7) return null;
  const days: DocxReportDay[] = [];
  for (const item of source.days) {
    if (!item || typeof item !== "object") return null;
    const day = item as Record<string, unknown>;
    if (!validDate(day.date) || days.some((existing) => existing.date === day.date)) return null;
    days.push({ date: day.date, am: reportSlot(day.am), pm: reportSlot(day.pm) });
  }
  return {
    name: textField(source.name, 200),
    workAssignment: textField(source.workAssignment, 200),
    department: textField(source.department, 200),
    periodFrom: source.periodFrom,
    periodTo: source.periodTo,
    scholarSignature: textField(source.scholarSignature, 200),
    supervisorSignature: textField(source.supervisorSignature, 200),
    days,
  };
}

export async function POST(request: Request) {
  const me = await getSessionProfile();
  if (!me?.is_active || (me.role !== "admin" && me.role !== "supervisor")) {
    return Response.json({ error: "Sign in with an administrator or supervisor account." }, { status: 401 });
  }
  if (me.role === "supervisor" && !me.department_id) {
    return Response.json({ error: "You must be assigned to a department to export labor reports." }, { status: 403 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 200_000) return Response.json({ error: "The report is too large to export." }, { status: 413 });
  let payload: Record<string, unknown>;
  try {
    const text = await request.text();
    if (text.length > 200_000) return Response.json({ error: "The report is too large to export." }, { status: 413 });
    const parsed: unknown = JSON.parse(text);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return Response.json({ error: "The report data is invalid." }, { status: 400 });
    payload = parsed as Record<string, unknown>;
  } catch {
    return Response.json({ error: "The report data is invalid." }, { status: 400 });
  }
  const studentId = typeof payload.studentId === "string" ? payload.studentId : "";
  if (!studentId) return Response.json({ error: "Choose a student before exporting." }, { status: 400 });
  const scope = me.role === "admin" ? "" : "and department_id = $2";
  const studentParams = me.role === "admin" ? [studentId] : [studentId, me.department_id];
  const student = await query<{ id: string }>(`select id from profiles where id = $1 and role = 'student' ${scope} limit 1`, studentParams);
  if (!student.rowCount) return Response.json({ error: "That student is outside your account's access." }, { status: 403 });

  const report = parseReport(payload.report);
  if (!report) return Response.json({ error: "Select at least one valid report day." }, { status: 400 });

  try {
    const template = await readFile(path.join(process.cwd(), "public", "templates", "work-scholar-labor-report.docx"));
    const originalXml = readDocxEntry(template, "word/document.xml").toString("utf8");
    const documentXml = buildLaborReportDocumentXml(originalXml, report);
    const document = replaceDocxDocumentXml(template, documentXml);
    const file = `Work-Scholar-Labor-Report-${report.name.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "Student"}.docx`;
    return new Response(new Uint8Array(document), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${file}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Labor report DOCX export failed", error);
    return Response.json({ error: "Could not create the Word report. Please try again." }, { status: 500 });
  }
}
