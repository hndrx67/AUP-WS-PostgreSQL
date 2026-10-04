import { requireRole } from "@/lib/auth";
import { createPostgresClient } from "@/lib/postgres-client";
import { FinanceManager } from "@/components/finance-manager";
import { PageHeader } from "@/components/ui";
import { summarizeStudentFinance } from "@/lib/finance";
import type { Payout, Profile, TimeLog, WalletTransfer } from "@/lib/types";

export const metadata = { title: "Student finances" };

export default async function SupervisorFinancesPage() {
  const me = await requireRole("supervisor");
  const dbClient = await createPostgresClient();
  const [{ data: students }, { data: logs }, { data: transfers }, { data: payouts }] = await Promise.all([
    dbClient.from("profiles").select("*").eq("role", "student").order("full_name"),
    dbClient.from("time_logs").select("*"),
    dbClient.from("wallet_transfers").select("*"),
    dbClient.from("payouts").select("*").order("paid_at", { ascending: false }),
  ]);
  const S = (students ?? []) as Profile[];
  const L = (logs ?? []) as TimeLog[];
  const T = (transfers ?? []) as WalletTransfer[];
  const P = (payouts ?? []) as Payout[];
  const rows = S.map((student) => ({
    student,
    ...summarizeStudentFinance(student, L, T, P),
  }));

  return (
    <>
      <PageHeader title="Student finances" description={me.department ? `Set tuition balances and manage the personal wallet for ${me.department.name}.` : "You are not assigned to a department."} />
      <FinanceManager rows={rows} transfers={T} payouts={P} />
    </>
  );
}
