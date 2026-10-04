import { requireRole } from "@/lib/auth";
import { createPostgresClient } from "@/lib/postgres-client";
import { Badge, Empty, PageHeader, Panel, TableWrap } from "@/components/ui";
import { fmtDate, fmtHours, fmtTime } from "@/lib/format";
import { logHours } from "@/lib/stats";
import type { TimeLog } from "@/lib/types";
import { ProfileAvatar } from "@/components/profile-avatar";

export const metadata = { title: "Time records" };

type Row = TimeLog & { student: { id: string; full_name: string; student_id: string | null; avatar_path: string | null } | null };

export default async function SupervisorTimesheets() {
  await requireRole("supervisor");
  const dbClient = await createPostgresClient();
  const { data } = await dbClient
    .from("time_logs").select("*, student:profiles!student_id(id, full_name, student_id, avatar_path)")
    .order("time_in", { ascending: false }).limit(300);
  const logs = (data ?? []) as unknown as Row[];

  return (
    <>
      <PageHeader title="Time records" description="The latest 300 records from your department. Contact an administrator to correct a record." />
      <Panel>
        {logs.length === 0 ? <Empty>No time records yet.</Empty> : (
          <TableWrap>
            <thead><tr><th className="th">Student</th><th className="th">Date</th><th className="th">In</th><th className="th">Out</th><th className="th">Hours</th><th className="th">Notes</th></tr></thead>
            <tbody className="divide-y divide-border">
              {logs.map((l) => (
                <tr key={l.id}>
                  <td className="td font-medium">{l.student && <span className="flex items-center gap-3"><ProfileAvatar profile={l.student} size="sm" />{l.student.full_name}</span>}</td>
                  <td className="td">{fmtDate(l.time_in)}</td>
                  <td className="td">{fmtTime(l.time_in)}</td>
                  <td className="td">{l.time_out ? fmtTime(l.time_out) : <Badge tone="success">In progress</Badge>}</td>
                  <td className="td">{l.time_out ? fmtHours(logHours(l)) : "-"}</td>
                  <td className="td">{l.override_reason ? <Badge tone="warning">Adjusted</Badge> : "-"}</td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </Panel>
    </>
  );
}
