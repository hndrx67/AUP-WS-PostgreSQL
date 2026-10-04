import { Trash2 } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { createPostgresClient } from "@/lib/postgres-client";
import { createDepartment, deleteDepartment } from "@/app/actions/departments";
import { ActionForm, Field } from "@/components/action-form";
import { Empty, PageHeader, Panel, TableWrap } from "@/components/ui";
import type { Department, Profile } from "@/lib/types";

export const metadata = { title: "Departments" };

export default async function DepartmentsPage() {
  await requireAdmin();
  const dbClient = await createPostgresClient();
  const [{ data: depts }, { data: people }] = await Promise.all([
    dbClient.from("departments").select("*").order("name"),
    dbClient.from("profiles").select("id, full_name, role, department_id"),
  ]);
  const D = (depts ?? []) as Department[];
  const P = (people ?? []) as Pick<Profile, "id" | "full_name" | "role" | "department_id">[];

  return (
    <>
      <PageHeader title="Departments" description="Create departments, then assign supervisors and work scholars under Users and assignments." />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Panel title={`All departments (${D.length})`}>
          {D.length === 0 ? <Empty>No departments yet. Create the first one.</Empty> : (
            <TableWrap>
              <thead><tr><th className="th">Department</th><th className="th">Supervisors</th><th className="th">Students</th><th className="th"><span className="sr-only">Delete</span></th></tr></thead>
              <tbody className="divide-y divide-border">
                {D.map((d) => {
                  const sups = P.filter((p) => p.department_id === d.id && p.role === "supervisor");
                  const studs = P.filter((p) => p.department_id === d.id && p.role === "student");
                  return (
                    <tr key={d.id}>
                      <td className="td"><span className="font-medium">{d.name}</span>{d.description && <span className="block text-xs text-muted-foreground">{d.description}</span>}</td>
                      <td className="td">{sups.length ? sups.map((s) => s.full_name).join(", ") : <span className="text-muted-foreground">None</span>}</td>
                      <td className="td">{studs.length}</td>
                      <td className="td text-right">
                        <ActionForm action={deleteDepartment} submit={<Trash2 size={16} />} buttonContainerClassName="" buttonClassName="btn btn-danger h-8 px-2" buttonAriaLabel={`Delete ${d.name}`}>
                          <input type="hidden" name="id" value={d.id} />
                        </ActionForm>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </TableWrap>
          )}
        </Panel>

        <Panel title="New department">
          <ActionForm action={createDepartment} submit="Create department" className="space-y-4 p-5">
            <Field label="Name"><input className="input" name="name" required /></Field>
            <Field label="Description"><input className="input" name="description" /></Field>
          </ActionForm>
        </Panel>
      </div>
    </>
  );
}
