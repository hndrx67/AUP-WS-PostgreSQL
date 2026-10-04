import { Building2, Clock, GraduationCap, ShieldCheck, UserX } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { createPostgresClient } from "@/lib/postgres-client";
import { Badge, Empty, PageHeader, Panel, StatCard, TableWrap } from "@/components/ui";
import { fmtDate, fmtHours, fmtTime } from "@/lib/format";
import { hoursInLastDays, logHours } from "@/lib/stats";
import type { Profile, TimeLog } from "@/lib/types";
import { ProfileAvatar } from "@/components/profile-avatar";

export const metadata = { title: "Overview" };

type Row = TimeLog & { student: { id: string; full_name: string; avatar_path: string | null } | null };

export default async function AdminOverview() {
  await requireAdmin();
  const dbClient = await createPostgresClient();
  const [{ data: people }, { count: deptCount }, { data: logData }] = await Promise.all([
    dbClient.from("profiles").select("id, role, department_id, is_active"),
    dbClient.from("departments").select("id", { count: "exact", head: true }),
    dbClient.from("time_logs").select("*, student:profiles!student_id(id, full_name, avatar_path)").order("time_in", { ascending: false }).limit(400),
  ]);
  const P = (people ?? []) as Pick<Profile, "id" | "role" | "department_id" | "is_active">[];
  const logs = (logData ?? []) as unknown as Row[];
  const students = P.filter((p) => p.role === "student");
  const unassigned = students.filter((s) => !s.department_id).length;

  return (
    <>
      <PageHeader title="Administration" description="Everything happening across all departments." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Work scholars" value={String(students.length)} hint={unassigned ? `${unassigned} without a department` : "All assigned"} icon={GraduationCap} />
        <StatCard label="Supervisors" value={String(P.filter((p) => p.role === "supervisor").length)} icon={ShieldCheck} />
        <StatCard label="Departments" value={String(deptCount ?? 0)} icon={Building2} />
        <StatCard label="Clocked in now" value={String(logs.filter((l) => !l.time_out).length)} icon={Clock} />
        <StatCard label="Hours, last 7 days" value={fmtHours(hoursInLastDays(logs, 7))} icon={Clock} />
        <StatCard label="Deactivated accounts" value={String(P.filter((p) => !p.is_active).length)} icon={UserX} />
      </div>

      <Panel title="Latest activity" className="mt-6">
        {logs.length === 0 ? <Empty>No time records yet.</Empty> : (
          <TableWrap>
            <thead><tr><th className="th">Student</th><th className="th">Date</th><th className="th">In</th><th className="th">Out</th><th className="th">Hours</th></tr></thead>
            <tbody className="divide-y divide-border">
              {logs.slice(0, 10).map((l) => (
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
