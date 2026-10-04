import { requireAdmin } from "@/lib/auth";
import { createPostgresClient } from "@/lib/postgres-client";
import { createUserAccount, deleteUserAccount, setUserActive, updateUserAssignment } from "@/app/actions/users";
import { ActionForm, Field } from "@/components/action-form";
import { Badge, Empty, PageHeader, Panel } from "@/components/ui";
import { ROLE_LABEL } from "@/lib/nav";
import { ProfileAvatar } from "@/components/profile-avatar";
import { ChangeCredentialsDialog } from "@/components/change-credentials-dialog";
import type { Department, ProfileWithDept } from "@/lib/types";

export const metadata = { title: "Users and assignments" };

export default async function UsersPage() {
  const me = await requireAdmin();
  const dbClient = await createPostgresClient();
  const [{ data: users }, { data: depts }] = await Promise.all([
    dbClient.from("profiles").select("*, department:departments(id, name)").order("role").order("full_name"),
    dbClient.from("departments").select("*").order("name"),
  ]);
  const U = (users ?? []) as ProfileWithDept[];
  const D = (depts ?? []) as Department[];

  return (
    <>
      <PageHeader title="Users and assignments" description="Assign supervisors and work scholars to departments. Changing a department here overrides the current assignment." />
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <Panel title={`All accounts (${U.length})`}>
          {U.length === 0 ? <Empty>No accounts yet.</Empty> : (
            <ul className="divide-y divide-border">
              {U.map((u) => (
                <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div className="flex min-w-[180px] items-center gap-3">
                    <ProfileAvatar profile={u} size="md" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{u.full_name}</p>
                      <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                      <div className="mt-1.5 flex gap-1.5">
                        <Badge tone={u.role === "admin" ? "primary" : "default"}>{ROLE_LABEL[u.role]}</Badge>
                        {!u.is_active && <Badge tone="danger">Deactivated</Badge>}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <ChangeCredentialsDialog scope="admin" userId={u.id} currentEmail={u.email} />
                    {u.role !== "admin" && (
                      <ActionForm action={updateUserAssignment} submit="Save" className="flex flex-wrap items-center gap-2" buttonContainerClassName="" buttonClassName="btn btn-outline">
                        <input type="hidden" name="user_id" value={u.id} />
                        <select name="department_id" className="input w-44" defaultValue={u.department_id ?? ""} aria-label={`Department for ${u.full_name}`}>
                          <option value="">No department</option>
                          {D.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                        {u.role === "student" && (
                          <>
                            <input name="hourly_rate" type="number" min={0} step="0.01" defaultValue={Number(u.hourly_rate)} className="input w-24" aria-label={`Hourly rate for ${u.full_name}`} />
                            <input name="work_assignment" defaultValue={u.work_assignment ?? ""} className="input w-36" aria-label={`Work assignment for ${u.full_name}`} placeholder="Work assignment" />
                          </>
                        )}
                      </ActionForm>
                    )}
                    {u.id !== me.id && (
                      <>
                        <ActionForm action={setUserActive} submit={u.is_active ? "Deactivate" : "Reactivate"} buttonContainerClassName="" buttonClassName={u.is_active ? "btn btn-danger" : "btn btn-outline"}>
                          <input type="hidden" name="user_id" value={u.id} />
                          <input type="hidden" name="active" value={String(!u.is_active)} />
                        </ActionForm>
                        <ActionForm action={deleteUserAccount} submit="Delete permanently" buttonContainerClassName="" buttonClassName="btn btn-danger">
                          <input type="hidden" name="user_id" value={u.id} />
                        </ActionForm>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="New account">
          <ActionForm action={createUserAccount} submit="Create account" className="space-y-4 p-5">
            <Field label="Role">
              <select className="input" name="role" defaultValue="student">
                <option value="student">Work scholar</option>
                <option value="supervisor">Supervisor</option>
                <option value="admin">Administrator</option>
              </select>
            </Field>
            <Field label="Full name"><input className="input" name="full_name" required /></Field>
            <Field label="Email"><input className="input" type="email" name="email" required /></Field>
            <Field label="Temporary password"><input className="input" name="password" minLength={8} required autoComplete="off" /></Field>
            <Field label="Department (not used for administrators)">
              <select className="input" name="department_id" defaultValue="">
                <option value="">No department</option>
                {D.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Student ID"><input className="input" name="student_id" /></Field>
              <Field label="Rate per hour"><input className="input" type="number" name="hourly_rate" min={0} step="0.01" defaultValue={0} /></Field>
            </div>
            <Field label="Work assignment (students)"><input className="input" name="work_assignment" placeholder="e.g. Library assistant" /></Field>
          </ActionForm>
        </Panel>
      </div>
    </>
  );
}
