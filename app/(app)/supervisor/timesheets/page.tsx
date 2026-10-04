import { requireRole } from "@/lib/auth";
import { query } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { TimeRecordsWorkspace } from "@/components/time-records-workspace";
import type { Profile, TimeLog } from "@/lib/types";

export const metadata = { title: "Time records" };

type Student = Pick<Profile, "id" | "full_name" | "student_id" | "avatar_path" | "is_active">;

export default async function SupervisorTimesheets({ searchParams }: { searchParams?: Promise<{ student?: string }> }) {
  const me = await requireRole("supervisor");
  const params = (await searchParams) ?? {};
  const selectedStudentId = params.student ?? null;
  const studentsResult = me.department_id
    ? await query<Student>("select id, full_name, student_id, avatar_path, is_active from profiles where role = 'student' and department_id = $1 order by lower(full_name)", [me.department_id])
    : { rows: [] as Student[] };
  const students = studentsResult.rows;
  const selectedStudent = students.some((student) => student.id === selectedStudentId);
  const logsResult = selectedStudent
    ? await query<TimeLog>("select * from time_logs where student_id = $1 order by time_in desc", [selectedStudentId])
    : { rows: [] as TimeLog[] };

  return (
    <>
      <PageHeader title="Time records" description="Choose a student to review or correct time records from your department. Every override needs a reason." />
      <TimeRecordsWorkspace students={students} selectedStudentId={selectedStudent ? selectedStudentId : null} logs={logsResult.rows} editable basePath="/supervisor/timesheets" />
    </>
  );
}
