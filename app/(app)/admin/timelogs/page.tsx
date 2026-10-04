import { Trash2 } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { createPostgresClient } from "@/lib/postgres-client";
import { addManualTimeLog, deleteTimeLog, overrideTimeLog } from "@/app/actions/timelogs";
import { ActionForm, Field } from "@/components/action-form";
import { Badge, Empty, PageHeader, Panel } from "@/components/ui";
import { fmtDate, fmtHours, fmtTime, toManilaInput } from "@/lib/format";
import { logHours } from "@/lib/stats";
import type { TimeLog } from "@/lib/types";
import { ProfileAvatar } from "@/components/profile-avatar";

export const metadata = { title: "Time records" };

type Row = TimeLog & { student: { id: string; full_name: string; avatar_path: string | null } | null };

export default async function AdminTimelogs() {
  await requireAdmin();
  const dbClient = await createPostgresClient();
  const [{ data }, { data: students }] = await Promise.all([
    dbClient.from("time_logs").select("*, student:profiles!student_id(id, full_name, avatar_path)").order("time_in", { ascending: false }).limit(200),
    dbClient.from("profiles").select("id, full_name").eq("role", "student").order("full_name"),
  ]);
  const logs = (data ?? []) as unknown as Row[];

  return (
    <>
      <PageHeader title="Time records" description="Correct any record or add a missing one. Every override needs a reason, and students can see that their record was adjusted." />

      <Panel title="Add a missing record" className="mb-6">
        <ActionForm action={addManualTimeLog} submit="Add record" className="grid gap-4 p-5 md:grid-cols-2 lg:grid-cols-4">
          <Field label="Student">
            <select className="input" name="student_id" required defaultValue="">
              <option value="" disabled>Choose a student</option>
              {(students ?? []).map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
            </select>
          </Field>
          <Field label="Time in"><input className="input" type="datetime-local" name="time_in" required /></Field>
          <Field label="Time out"><input className="input" type="datetime-local" name="time_out" required /></Field>
          <Field label="Reason"><input className="input" name="reason" required placeholder="Forgot to clock in" /></Field>
        </ActionForm>
      </Panel>

      <Panel title="Latest 200 records">
        {logs.length === 0 ? <Empty>No time records yet.</Empty> : (
          <ul className="divide-y divide-border">
            {logs.map((l) => (
              <li key={l.id}>
                <details className="group">
                  <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm hover:bg-muted/50">
                    <span className="flex min-w-[160px] items-center gap-3 font-medium">{l.student && <ProfileAvatar profile={l.student} size="sm" />}{l.student?.full_name}</span>
                    <span>{fmtDate(l.time_in)}, {fmtTime(l.time_in)} to {l.time_out ? fmtTime(l.time_out) : "now"}</span>
                    <span className="flex items-center gap-2 text-muted-foreground">
                      {l.time_out ? fmtHours(logHours(l)) : <Badge tone="success">In progress</Badge>}
                      {l.override_reason && <Badge tone="warning">Adjusted</Badge>}
                    </span>
                  </summary>
                  <div className="border-t border-border bg-muted/40 px-5 py-4">
                    {l.override_reason && <p className="mb-3 text-sm text-muted-foreground">Last adjustment: {l.override_reason}</p>}
                    <ActionForm action={overrideTimeLog} submit="Save override" resetOnSuccess={false} className="grid gap-4 md:grid-cols-3">
                      <input type="hidden" name="id" value={l.id} />
                      <Field label="Time in"><input className="input" type="datetime-local" name="time_in" defaultValue={toManilaInput(l.time_in)} required /></Field>
                      <Field label="Time out"><input className="input" type="datetime-local" name="time_out" defaultValue={toManilaInput(l.time_out)} /></Field>
                      <Field label="Reason"><input className="input" name="reason" required /></Field>
                    </ActionForm>
                    <ActionForm action={deleteTimeLog} submit={<><Trash2 size={16} />Delete record</>} buttonContainerClassName="mt-3" buttonClassName="btn btn-danger px-2">
                      <input type="hidden" name="id" value={l.id} />
                    </ActionForm>
                  </div>
                </details>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
