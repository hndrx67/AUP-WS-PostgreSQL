import { requireAdmin } from "@/lib/auth";
import { createPostgresClient } from "@/lib/postgres-client";
import { deleteUserAccount, setUserActive, updateUserAssignment } from "@/app/actions/users";
import { ActionForm } from "@/components/action-form";
import { Badge, Empty, PageHeader, Panel } from "@/components/ui";
import { ROLE_LABEL } from "@/lib/nav";
import { ProfileAvatar } from "@/components/profile-avatar";
import { ChangeCredentialsDialog } from "@/components/change-credentials-dialog";
import { DestructiveConfirmationDialog } from "@/components/destructive-confirmation-dialog";
import { NewAccountForm } from "@/components/new-account-form";
import type { Department, ProfileWithDept } from "@/lib/types";

export const metadata = { title: "Users and assignments" };

export default async function UsersPage({ searchParams }: { searchParams?: Promise<{ q?: string; page?: string }> }) {
  const params = (await searchParams) ?? {};
  const q = String(params.q ?? "").trim();
  const requestedPage = Number(params.page ?? "1") || 1;

  const me = await requireAdmin();
  const dbClient = await createPostgresClient();
  const [{ data: users }, { data: depts }] = await Promise.all([
    dbClient.from("profiles").select("*, department:departments(id, name)").order("role").order("full_name"),
    dbClient.from("departments").select("*").order("name"),
  ]);
  const U = (users ?? []) as ProfileWithDept[];
  const D = (depts ?? []) as Department[];

  const normalizedQuery = q.toLowerCase();
  const filteredUsers = normalizedQuery
    ? U.filter((user) => user.full_name.toLowerCase().includes(normalizedQuery) || user.email.toLowerCase().includes(normalizedQuery))
    : U;

  const pageSize = 5;
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const currentPage = Math.min(Math.max(requestedPage, 1), totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const pageUsers = filteredUsers.slice(startIndex, startIndex + pageSize);

  const makePageHref = (page: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (page > 1) params.set("page", String(page));
    const query = params.toString();
    return query ? `?${query}` : "?";
  };

  return (
    <>
      <PageHeader title="Users and assignments" description="Assign supervisors and work scholars to departments. Changing a department here overrides the current assignment." />
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <Panel title={`All accounts (${filteredUsers.length})`}>
          <div className="mb-4 flex flex-col gap-3 px-5 pt-5 sm:flex-row sm:items-center">
            <form method="get" className="flex w-full max-w-xl items-center gap-2">
              <input
                type="search"
                name="q"
                defaultValue={q}
                placeholder="Search by name or email"
                className="input flex-1"
                aria-label="Search accounts by name or email"
              />
              <button type="submit" className="btn btn-outline">Search</button>
              {q && <a href="?" className="btn btn-ghost">Clear</a>}
            </form>
          </div>

          {filteredUsers.length === 0 ? (
            <div className="px-5 pb-5">
              <Empty>{q ? `No accounts match “${q}”.` : "No accounts yet."}</Empty>
            </div>
          ) : (
            <>
              <ul className="divide-y divide-border">
                {pageUsers.map((u) => (
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
                              <input name="student_id" defaultValue={u.student_id ?? ""} className="input w-32" aria-label={`Student ID for ${u.full_name}`} placeholder="Student ID" />
                              <input name="hourly_rate" type="number" min={0} step="0.01" defaultValue={Number(u.hourly_rate)} className="input w-24" aria-label={`Hourly rate for ${u.full_name}`} />
                              <input name="work_assignment" defaultValue={u.work_assignment ?? ""} className="input w-36" aria-label={`Work assignment for ${u.full_name}`} placeholder="Work assignment" />
                            </>
                          )}
                        </ActionForm>
                      )}
                      {u.id !== me.id && (
                        <>
                          {u.is_active ? (
                            <DestructiveConfirmationDialog action={setUserActive} fields={{ user_id: u.id, active: "false" }} trigger="Deactivate" title={`Deactivate ${u.full_name}`} description="This disables the account and revokes its active sessions. Enter your password to continue." />
                          ) : (
                            <ActionForm action={setUserActive} submit="Reactivate" buttonContainerClassName="" buttonClassName="btn btn-outline">
                              <input type="hidden" name="user_id" value={u.id} />
                              <input type="hidden" name="active" value="true" />
                            </ActionForm>
                          )}
                          <DestructiveConfirmationDialog action={deleteUserAccount} fields={{ user_id: u.id }} trigger="Delete permanently" title={`Delete ${u.full_name}`} />
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>

              {totalPages > 1 && (
                <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-3 text-sm text-muted-foreground">
                  <span>
                    Showing {startIndex + 1}-{Math.min(startIndex + pageSize, filteredUsers.length)} of {filteredUsers.length}
                  </span>
                  <div className="flex items-center gap-2">
                    <a href={makePageHref(currentPage - 1)} aria-disabled={currentPage <= 1} className={currentPage <= 1 ? "pointer-events-none opacity-50" : "btn btn-outline btn-sm"}>
                      Previous
                    </a>
                    <span>
                      Page {currentPage} / {totalPages}
                    </span>
                    <a href={makePageHref(currentPage + 1)} aria-disabled={currentPage >= totalPages} className={currentPage >= totalPages ? "pointer-events-none opacity-50" : "btn btn-outline btn-sm"}>
                      Next
                    </a>
                  </div>
                </div>
              )}
            </>
          )}
        </Panel>

        <Panel title="New account">
          <NewAccountForm departments={D} />
        </Panel>
      </div>
    </>
  );
}
