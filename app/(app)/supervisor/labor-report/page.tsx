import { requireRole } from "@/lib/auth";
import { query } from "@/lib/db";
import { LaborReportWorkspace } from "@/components/labor-report-workspace";
import { PageHeader } from "@/components/ui";
import { normalizeWeekStart, weekBoundsUtc } from "@/lib/labor-report-date";
import type { Profile, TimeLog } from "@/lib/types";

export const metadata = { title: "Labor Report" };

type Student = Pick<Profile, "id" | "full_name" | "student_id" | "avatar_path" | "is_active" | "work_assignment" | "department_id"> & { department_name: string | null };
type LaborLog = Pick<TimeLog, "id" | "student_id" | "time_in" | "time_out">;

export default async function SupervisorLaborReportPage({ searchParams }: { searchParams?: Promise<{ student?: string; week?: string }> }) {
  const me = await requireRole("supervisor");
  const params = (await searchParams) ?? {};
  const weekStart = normalizeWeekStart(params.week);
  const { rows: students } = me.department_id
    ? await query<Student>(
      `select p.id, p.full_name, p.student_id, p.avatar_path, p.is_active, p.work_assignment,
              p.department_id, d.name as department_name
         from profiles p left join departments d on d.id = p.department_id
        where p.role = 'student' and p.department_id = $1 order by lower(p.full_name)`,
      [me.department_id],
    )
    : { rows: [] as Student[] };
  const selected = students.some((student) => student.id === params.student);
  const bounds = weekBoundsUtc(weekStart);
  const { rows: logs } = selected
    ? await query<LaborLog>(
      "select id, student_id, time_in, time_out from time_logs where student_id = $1 and time_in >= $2 and time_in < $3 order by time_in",
      [params.student, bounds.start, bounds.end],
    )
    : { rows: [] as LaborLog[] };

  return (
    <>
      <PageHeader title="Labor Report" description="Select a student and workdays to prepare and export a weekly labor report." />
      <LaborReportWorkspace key={`${params.student ?? "none"}:${weekStart}`} students={students} selectedStudentId={selected ? params.student! : null} logs={logs} weekStart={weekStart} basePath="/supervisor/labor-report" />
    </>
  );
}
