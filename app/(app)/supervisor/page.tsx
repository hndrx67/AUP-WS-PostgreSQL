import { ClipboardList, Clock, UserCheck, Users } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createPostgresClient } from "@/lib/postgres-client";
import { Badge, Empty, PageHeader, Panel, StatCard, TableWrap } from "@/components/ui";
import { fmtDate, fmtHours, fmtTime } from "@/lib/format";
import { hoursInLastDays, logHours } from "@/lib/stats";
import type { TimeLog } from "@/lib/types";
import { ProfileAvatar } from "@/components/profile-avatar";

export const metadata = { title: "Overview" };

type Row = TimeLog & { student: { id: string; full_name: string; avatar_path: string | null } | null };

export default async function SupervisorOverview() {
  const me = await requireRole("supervisor");
  const dbClient = await createPostgresClient();
  const [{ count: studentCount }, { data }] = await Promise.all([
    dbClient.from("profiles").select("id", { count: "exact", head: true }).eq("role", "student"),
    dbClient.from("time_logs").select("*, student:profiles!student_id(id, full_name, avatar_path)")
      .order("time_in", { ascending: false }).limit(300),
  ]);
  const logs = (data ?? []) as unknown as Row[];
  const active = logs.filter((l) => !l.time_out);

  return (
    <>
      <PageHeader
        title={me.department ? me.department.name : "Supervisor"}
        description={me.department ? "Work scholars in your department." : "You are not assigned to a department yet. Ask an administrator to assign you."}
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Work scholars" value={String(studentCount ?? 0)} icon={Users} />
        <StatCard label="Clocked in now" value={String(active.length)} icon={UserCheck} />
        <StatCard label="Hours, last 7 days" value={fmtHours(hoursInLastDays(logs, 7))} icon={Clock} />
        <StatCard label="Records, last 7 days" value={String(logs.filter((l) => Date.now() - new Date(l.time_in).getTime() < 7 * 864e5).length)} icon={ClipboardList} />
      </div>

      <Panel title="Currently on duty" className="mt-6">
        {active.length === 0 ? <Empty>Nobody is clocked in right now.</Empty> : (
          <ul className="divide-y divide-border">
            {active.map((l) => (
              <li key={l.id} className="flex items-center justify-between px-5 py-3 text-sm">
                <span className="flex items-center gap-3 font-medium">{l.student && <ProfileAvatar profile={l.student} size="sm" />}{l.student?.full_name}</span>
                <span className="text-muted-foreground">since {fmtTime(l.time_in)}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Latest records" className="mt-6">
        {logs.length === 0 ? <Empty>No time records yet.</Empty> : (
          <TableWrap>
            <thead><tr><th className="th">Student</th><th className="th">Date</th><th className="th">In</th><th className="th">Out</th><th className="th">Hours</th></tr></thead>
            <tbody className="divide-y divide-border">
              {logs.slice(0, 8).map((l) => (
                <tr key={l.id}>
                  <td className="td font-medium">{l.student && <span className="flex items-center gap-3"><ProfileAvatar profile={l.student} size="sm" />{l.student.full_name}</span>}</td>
                  <td className="td">{fmtDate(l.time_in)}</td>
                  <td className="td">{fmtTime(l.time_in)}</td>
                  <td className="td">{l.time_out ? fmtTime(l.time_out) : <Badge tone="success">In progress</Badge>}</td>
                  <td className="td">{l.time_out ? fmtHours(logHours(l)) : "-"}</td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </Panel>
    </>
  );
}
