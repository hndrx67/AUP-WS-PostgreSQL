import type { Payout, Profile, TimeLog, WalletTransfer } from "./types";

export function summarizeStudentFinance(
  student: Pick<Profile, "id" | "hourly_rate" | "school_tuition_balance" | "financials_started_at" | "personal_wallet_opening_balance">,
  logs: TimeLog[],
  transfers: WalletTransfer[],
  payouts: Payout[],
) {
  const startedAt = new Date(student.financials_started_at).getTime();
  const rate = Number(student.hourly_rate);
  const eligibleLogs = logs.filter((log) => log.student_id === student.id && log.time_out);
  const earned = eligibleLogs.reduce((sum, log) => {
    const inAt = Math.max(new Date(log.time_in).getTime(), startedAt);
    const outAt = new Date(log.time_out as string).getTime();
    return sum + Math.max(0, outAt - inAt) / 3_600_000 * Number(log.earning_rate ?? rate);
  }, 0);
  const studentTransfers = transfers.filter((transfer) => transfer.student_id === student.id);
  const studentPayouts = payouts.filter((payout) => payout.student_id === student.id);
  const appliedTransfers = studentTransfers
    .filter((transfer) => new Date(transfer.allocated_at).getTime() >= startedAt)
    .reduce((sum, transfer) => sum + Number(transfer.amount), 0);
  const totalTransfers = studentTransfers.reduce((sum, transfer) => sum + Number(transfer.amount), 0);
  const totalPayouts = studentPayouts.reduce((sum, payout) => sum + Number(payout.amount), 0);
  const tuitionBalance = Number(student.school_tuition_balance) - earned + appliedTransfers;
  const availableCredit = Math.max(0, earned - Number(student.school_tuition_balance) - appliedTransfers);
  const personalWallet = Number(student.personal_wallet_opening_balance) + totalTransfers - totalPayouts;

  return { earned, tuitionBalance, availableCredit, personalWallet, totalTransfers, totalPayouts };
}
