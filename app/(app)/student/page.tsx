import { CalendarClock, Clock, Wallet, TrendingUp, Banknote } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createPostgresClient } from "@/lib/postgres-client";
import { ClockCard } from "@/components/clock-card";
import { Badge, Empty, HoursChart, PageHeader, Panel, StatCard, TableWrap } from "@/components/ui";
import { DAYS, fmtClock, fmtDate, fmtHours, fmtTime, peso } from "@/lib/format";
import { hoursInLastDays, lastDays, logHours } from "@/lib/stats";
import { summarizeStudentFinance } from "@/lib/finance";
import type { Payout, Schedule, TimeLog, WalletTransfer } from "@/lib/types";

export const metadata = { title: "Overview" };

export default async function StudentOverview() {
  const me = await requireRole("student");
  const dbClient = await createPostgresClient();
  const [{ data: logs }, { data: payouts }, { data: shifts }, { data: transfers }] = await Promise.all([
    dbClient.from("time_logs").select("*").eq("student_id", me.id).order("time_in", { ascending: false }).limit(1000),
    dbClient.from("payouts").select("*").eq("student_id", me.id),
    dbClient.from("schedules").select("*").eq("student_id", me.id).order("start_time"),
    dbClient.from("wallet_transfers").select("*").eq("student_id", me.id),
  ]);
  const L = (logs ?? []) as TimeLog[];
  const stats = summarizeStudentFinance(me, L, (transfers ?? []) as WalletTransfer[], (payouts ?? []) as Payout[]);
  const totalHours = L.reduce((sum, log) => sum + logHours(log), 0);
  const open = L.find((l) => !l.time_out) ?? null;
  const todayDow = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" })).getDay();
  const todayShifts = ((shifts ?? []) as Schedule[]).filter((s) => s.day_of_week === todayDow);

  return (
    <>
      <PageHeader title={`Hello, ${me.full_name.split(" ")[0]}`} description={me.department ? `Work scholar in ${me.department.name}` : "You are not assigned to a department yet."} />

      <ClockCard openSince={open?.time_in ?? null} />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard tone="primary" label={stats.tuitionBalance < 0 ? "Tuition credit" : "School tuition owed"} value={peso(Math.abs(stats.tuitionBalance))} hint={stats.tuitionBalance < 0 ? "Available to move to your wallet" : "Work earnings reduce this amount"} icon={Wallet} />
        <StatCard label="Earned toward tuition" value={peso(stats.earned)} hint={`${peso(Number(me.hourly_rate))} per hour`} icon={TrendingUp} />
        <StatCard label="Personal wallet" value={peso(stats.personalWallet)} hint="Available to withdraw" icon={Banknote} />
        <StatCard label="Hours worked" value={fmtHours(totalHours)} hint="All time" icon={Clock} />
        <StatCard label="Last 7 days" value={fmtHours(hoursInLastDays(L, 7))} icon={CalendarClock} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Panel title="Hours this week">
          <HoursChart data={lastDays(L, 7)} />
        </Panel>
        <Panel title="Today's shifts">
          {todayShifts.length === 0 ? (
            <Empty>No shifts scheduled on {DAYS[todayDow]}s.</Empty>
          ) : (
            <ul className="divide-y divide-border">
              {todayShifts.map((s) => (
                <li key={s.id} className="px-5 py-3 text-sm">
                  <span className="font-medium">{fmtClock(s.start_time)} to {fmtClock(s.end_time)}</span>
                  {s.label && <span className="block text-xs text-muted-foreground">{s.label}</span>}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel title="Recent time records" className="mt-6">
        {L.length === 0 ? (
          <Empty>No records yet. Use Time in when you start your shift.</Empty>
        ) : (
          <TableWrap>
            <thead><tr><th className="th">Date</th><th className="th">Time in</th><th className="th">Time out</th><th className="th">Hours</th></tr></thead>
            <tbody className="divide-y divide-border">
              {L.slice(0, 6).map((l) => (
                <tr key={l.id}>
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
