import { requireRole } from "@/lib/auth";
import { createPostgresClient } from "@/lib/postgres-client";
import { createStudentAccount, updateDepartmentStudent } from "@/app/actions/users";
import { ActionForm, Field } from "@/components/action-form";
import { Badge, Empty, PageHeader, Panel } from "@/components/ui";
import type { Profile } from "@/lib/types";
import { ProfileAvatar } from "@/components/profile-avatar";

export const metadata = { title: "Students" };

export default async function StudentsPage() {
  const me = await requireRole("supervisor");
  const dbClient = await createPostgresClient();
  const { data } = await dbClient.from("profiles").select("*").eq("role", "student").eq("department_id", me.department_id ?? "00000000-0000-0000-0000-000000000000").order("full_name");
  const students = (data ?? []) as Profile[];

  return (
    <>
      <PageHeader title="Students" description="Create accounts for work scholars in your department." />
      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Panel title={`Department students (${students.length})`}>
          {students.length === 0 ? <Empty>No students yet. Create the first account using the form.</Empty> : (
            <ul className="divide-y divide-border">
                {students.map((s) => (
                  <li key={s.id} className="flex min-w-0 flex-wrap items-center justify-between gap-3 px-5 py-4">
                    <div className="flex min-w-[180px] flex-1 items-center gap-3">
                      <ProfileAvatar profile={s} size="sm" />
                      <div className="min-w-0"><p className="truncate text-sm font-medium">{s.full_name}</p><p className="truncate text-xs text-muted-foreground">{s.email}</p></div>
                    </div>
                    <ActionForm action={updateDepartmentStudent} submit="Save" className="grid w-full min-w-0 grid-cols-2 gap-2 sm:flex sm:flex-1 sm:flex-wrap sm:items-center" buttonContainerClassName="">
                        <input type="hidden" name="user_id" value={s.id} />
                        <input className="input min-w-0 sm:w-28" name="student_id" defaultValue={s.student_id ?? ""} aria-label={`Student ID for ${s.full_name}`} placeholder="Student ID" />
                        <input className="input min-w-0 sm:w-36" name="work_assignment" defaultValue={s.work_assignment ?? ""} aria-label={`Work assignment for ${s.full_name}`} placeholder="Work assignment" />
                        <input className="input min-w-0 sm:w-24" name="hourly_rate" type="number" min={0} step="0.01" defaultValue={Number(s.hourly_rate)} aria-label={`Hourly rate for ${s.full_name}`} />
                    </ActionForm>
                    <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
                      {s.is_active ? <Badge tone="success">Active</Badge> : <Badge tone="danger">Disabled</Badge>}
                      {s.is_active && <ActionForm action={updateDepartmentStudent} submit="Disable" buttonContainerClassName="" buttonClassName="btn btn-danger"><input type="hidden" name="user_id" value={s.id} /><input type="hidden" name="disable" value="true" /></ActionForm>}
                    </div>
                  </li>
                ))}
            </ul>
          )}
        </Panel>

        <Panel title="New student account" description={me.department ? `Added to ${me.department.name}.` : "You need a department before you can add students."}>
          <ActionForm action={createStudentAccount} submit="Create account" className="space-y-4 p-5">
            <Field label="Full name"><input className="input" name="full_name" required /></Field>
            <Field label="Student ID"><input className="input" name="student_id" /></Field>
            <Field label="Work assignment"><input className="input" name="work_assignment" placeholder="e.g. Library assistant" /></Field>
            <Field label="Email"><input className="input" type="email" name="email" required /></Field>
            <Field label="Temporary password"><input className="input" type="text" name="password" minLength={8} required autoComplete="off" /></Field>
            <Field label="Hourly rate (PHP)"><input className="input" type="number" name="hourly_rate" min={0} step="0.01" defaultValue={0} /></Field>
          </ActionForm>
        </Panel>
      </div>
    </>
  );
}
