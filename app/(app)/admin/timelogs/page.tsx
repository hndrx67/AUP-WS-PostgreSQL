import { requireAdmin } from "@/lib/auth";
import { query } from "@/lib/db";
import { addManualTimeLog } from "@/app/actions/timelogs";
import { ActionForm, Field } from "@/components/action-form";
import { PageHeader, Panel } from "@/components/ui";
import { TimeRecordsWorkspace } from "@/components/time-records-workspace";
import type { TimeLog, Profile } from "@/lib/types";

export const metadata = { title: "Time records" };

type Student = Pick<Profile, "id" | "full_name" | "student_id" | "avatar_path" | "is_active">;

export default async function AdminTimelogs({ searchParams }: { searchParams?: Promise<{ student?: string }> }) {
  await requireAdmin();
  const params = (await searchParams) ?? {};
  const selectedStudentId = params.student ?? null;
  const { rows: students } = await query<Student>(
    "select id, full_name, student_id, avatar_path, is_active from profiles where role = 'student' order by lower(full_name)",
  );
  const selectedStudent = students.some((student) => student.id === selectedStudentId);
  const { rows: logs } = selectedStudent
    ? await query<TimeLog>("select * from time_logs where student_id = $1 order by time_in desc", [selectedStudentId])
    : { rows: [] as TimeLog[] };

  return (
    <>
      <PageHeader title="Time records" description="Choose a student to review their time records. Adjustments require a reason and are visible to the student." />

      <Panel title="Add a missing record" className="mb-6">
        <ActionForm action={addManualTimeLog} submit="Add record" className="grid gap-4 p-5 md:grid-cols-2 lg:grid-cols-4">
          <Field label="Student">
            <select className="input" name="student_id" required defaultValue="">
              <option value="" disabled>Choose a student</option>
              {students.map((student) => <option key={student.id} value={student.id}>{student.full_name}</option>)}
            </select>
          </Field>
          <Field label="Time in"><input className="input" type="datetime-local" name="time_in" required /></Field>
          <Field label="Time out"><input className="input" type="datetime-local" name="time_out" required /></Field>
          <Field label="Reason"><input className="input" name="reason" required placeholder="Forgot to clock in" /></Field>
        </ActionForm>
      </Panel>

      <TimeRecordsWorkspace students={students} selectedStudentId={selectedStudent ? selectedStudentId : null} logs={logs} editable basePath="/admin/timelogs" />
    </>
  );
}
