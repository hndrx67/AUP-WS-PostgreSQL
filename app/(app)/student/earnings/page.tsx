import { Banknote, Wallet, TrendingUp, GraduationCap } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createPostgresClient } from "@/lib/postgres-client";
import { Empty, PageHeader, Panel, StatCard, TableWrap } from "@/components/ui";
import { dayKey, fmtDate, fmtHours, peso } from "@/lib/format";
import { summarizeStudentFinance } from "@/lib/finance";
import type { Payout, TimeLog, WalletTransfer } from "@/lib/types";

export const metadata = { title: "Earnings" };

export default async function Earnings() {
  const me = await requireRole("student");
  const dbClient = await createPostgresClient();
  const [{ data: logs }, { data: payouts }, { data: transfers }] = await Promise.all([
    dbClient.from("time_logs").select("*").eq("student_id", me.id),
    dbClient.from("payouts").select("*").eq("student_id", me.id).order("paid_at", { ascending: false }),
    dbClient.from("wallet_transfers").select("*").eq("student_id", me.id).order("allocated_at", { ascending: false }),
  ]);
  const L = (logs ?? []) as TimeLog[];
  const P = (payouts ?? []) as Payout[];
  const T = (transfers ?? []) as WalletTransfer[];
  const rate = Number(me.hourly_rate);
  const stats = summarizeStudentFinance(me, L, T, P);

  const byMonth = new Map<string, { hours: number; earned: number }>();
  const financeStart = new Date(me.financials_started_at).getTime();
  let earnedHours = 0;
  for (const l of L) {
    if (!l.time_out || new Date(l.time_out).getTime() <= financeStart) continue;
    const workedHours = Math.max(0, (new Date(l.time_out).getTime() - Math.max(new Date(l.time_in).getTime(), financeStart)) / 3_600_000);
    const key = dayKey(l.time_in).slice(0, 7);
    const month = byMonth.get(key) ?? { hours: 0, earned: 0 };
    month.hours += workedHours;
    month.earned += workedHours * Number(l.earning_rate ?? rate);
    byMonth.set(key, month);
    earnedHours += workedHours;
  }
  const months = [...byMonth.entries()].sort((a, b) => b[0].localeCompare(a[0]));

  return (
    <>
      <PageHeader title="Earnings and balances" description="Your work earnings pay school tuition first. Tuition credit can be moved into your personal wallet by your administrator or supervisor." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard tone="primary" label={stats.tuitionBalance < 0 ? "Tuition credit" : "School tuition owed"} value={peso(Math.abs(stats.tuitionBalance))} icon={GraduationCap} />
        <StatCard label="Earned since balance set" value={peso(stats.earned)} hint={`${fmtHours(earnedHours)} at ${peso(rate)} per hour`} icon={TrendingUp} />
        <StatCard label="Personal wallet" value={peso(stats.personalWallet)} hint="Available to withdraw" icon={Wallet} />
        <StatCard label="Credit not yet transferred" value={peso(stats.availableCredit)} icon={Banknote} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Earnings by month">
          {months.length === 0 ? <Empty>Nothing earned yet.</Empty> : (
            <TableWrap>
              <thead><tr><th className="th">Month</th><th className="th">Hours</th><th className="th">Earned</th></tr></thead>
              <tbody className="divide-y divide-border">
                {months.map(([m, totals]) => (
                  <tr key={m}>
                    <td className="td">{new Date(`${m}-01T00:00:00+08:00`).toLocaleDateString("en-PH", { month: "long", year: "numeric", timeZone: "Asia/Manila" })}</td>
                    <td className="td">{fmtHours(totals.hours)}</td>
                    <td className="td font-medium">{peso(totals.earned)}</td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          )}
        </Panel>
        <Panel title="Personal wallet withdrawals">
          {P.length === 0 ? <Empty>No withdrawals have been recorded.</Empty> : (
            <TableWrap>
              <thead><tr><th className="th">Date</th><th className="th">Amount</th><th className="th">Note</th></tr></thead>
              <tbody className="divide-y divide-border">
                {P.map((p) => (
                  <tr key={p.id}>
                    <td className="td">{fmtDate(p.paid_at)}</td>
                    <td className="td font-medium">{peso(Number(p.amount))}</td>
                    <td className="td text-muted-foreground">{p.note ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          )}
        </Panel>
        <Panel title="Tuition credit moved to personal wallet">
          {T.length === 0 ? <Empty>No tuition credit has been moved to your wallet.</Empty> : (
            <TableWrap>
              <thead><tr><th className="th">Date</th><th className="th">Amount</th><th className="th">Note</th></tr></thead>
              <tbody className="divide-y divide-border">
                {T.map((entry) => (
                  <tr key={entry.id}>
                    <td className="td">{fmtDate(entry.allocated_at)}</td>
                    <td className="td font-medium">{peso(Number(entry.amount))}</td>
                    <td className="td text-muted-foreground">{entry.note ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          )}
        </Panel>
      </div>
    </>
  );
}
