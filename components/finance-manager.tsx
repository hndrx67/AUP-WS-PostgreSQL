import { ActionForm, Field } from "@/components/action-form";
import { TableWrap, Empty, Panel } from "@/components/ui";
import { allocateToPersonalWallet, deleteStudentWithdrawal, recordStudentWithdrawal, setSchoolTuitionBalance } from "@/app/actions/finances";
import { fmtDate, peso } from "@/lib/format";
import type { Payout, Profile, WalletTransfer } from "@/lib/types";
import { ProfileAvatar } from "@/components/profile-avatar";

export type FinanceRow = {
  student: Profile;
  earned: number;
  tuitionBalance: number;
  availableCredit: number;
  personalWallet: number;
};

export function FinanceManager({ rows, transfers, payouts, canWithdraw = true, canDelete = false }: {
  rows: FinanceRow[];
  transfers: WalletTransfer[];
  payouts: Payout[];
  canWithdraw?: boolean;
  canDelete?: boolean;
}) {
  const studentNames = new Map(rows.map((row) => [row.student.id, row.student.full_name]));
  const activity = [
    ...transfers.map((entry) => ({ id: entry.id, studentId: entry.student_id, amount: Number(entry.amount), note: entry.note, date: entry.allocated_at, kind: "Wallet allocation" })),
    ...payouts.map((entry) => ({ id: entry.id, studentId: entry.student_id, amount: Number(entry.amount), note: entry.note, date: entry.paid_at, kind: "Wallet withdrawal" })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <>
      <Panel title="Student financial balances" description="Work earnings reduce school tuition first. Setting a tuition balance starts a new balance period; any later tuition credit can be transferred to the student's personal wallet.">
        {rows.length === 0 ? <Empty>No students are assigned to this department.</Empty> : (
          <TableWrap>
            <thead><tr><th className="th">Student</th><th className="th">Earned since balance set</th><th className="th">School tuition balance</th><th className="th">Credit available to transfer</th><th className="th">Personal wallet</th><th className="th">Set tuition balance</th><th className="th">Allocate to wallet</th></tr></thead>
            <tbody className="divide-y divide-border">
              {rows.map(({ student, earned, tuitionBalance, availableCredit, personalWallet }) => (
                <tr key={student.id}>
                  <td className="td font-medium"><span className="flex items-center gap-3"><ProfileAvatar profile={student} size="sm" />{student.full_name}</span></td>
                  <td className="td">{peso(earned)}</td>
                  <td className="td font-medium">
                    {tuitionBalance >= 0 ? `${peso(tuitionBalance)} owed` : `${peso(Math.abs(tuitionBalance))} credit`}
                  </td>
                  <td className="td">{peso(availableCredit)}</td>
                  <td className="td font-medium">{peso(personalWallet)}</td>
                  <td className="td min-w-56">
                    <ActionForm action={setSchoolTuitionBalance} submit="Set" className="flex items-start gap-2" resetOnSuccess={false}>
                      <input type="hidden" name="student_id" value={student.id} />
                      <input aria-label={`School tuition balance for ${student.full_name}`} className="input w-28" type="number" name="amount" min={0} step="0.01" defaultValue={Math.max(0, tuitionBalance)} required />
                    </ActionForm>
                  </td>
                  <td className="td min-w-56">
                    <ActionForm action={allocateToPersonalWallet} submit="Allocate" className="flex items-start gap-2">
                      <input type="hidden" name="student_id" value={student.id} />
                      <input aria-label={`Amount to allocate for ${student.full_name}`} className="input w-28" type="number" name="amount" min={0.01} max={availableCredit} step="0.01" required disabled={availableCredit <= 0} />
                    </ActionForm>
                  </td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </Panel>

      {canWithdraw && (
        <Panel title="Record a personal wallet withdrawal" description="Record money actually paid to a student. Withdrawals cannot exceed the available personal wallet." className="mt-6">
          <ActionForm action={recordStudentWithdrawal} submit="Record withdrawal" className="grid gap-4 p-5 sm:grid-cols-3">
            <Field label="Student">
              <select className="input" name="student_id" required defaultValue="">
                <option value="" disabled>Choose a student</option>
                {rows.filter((row) => row.personalWallet > 0).map((row) => (
                  <option key={row.student.id} value={row.student.id}>{row.student.full_name} - {peso(row.personalWallet)} available</option>
                ))}
              </select>
            </Field>
            <Field label="Amount (PHP)"><input className="input" type="number" name="amount" min={0.01} step="0.01" required /></Field>
            <Field label="Note"><input className="input" name="note" placeholder="Withdrawal date or reference" /></Field>
          </ActionForm>
        </Panel>
      )}

      <Panel title="Wallet activity" className="mt-6">
        {activity.length === 0 ? <Empty>No wallet allocations or withdrawals yet.</Empty> : (
          <TableWrap>
            <thead><tr><th className="th">Date</th><th className="th">Student</th><th className="th">Type</th><th className="th">Amount</th><th className="th">Note</th>{canDelete && <th className="th"><span className="sr-only">Actions</span></th>}</tr></thead>
            <tbody className="divide-y divide-border">
              {activity.map((entry) => (
                <tr key={`${entry.kind}-${entry.id}`}>
                  <td className="td">{fmtDate(entry.date)}</td>
                  <td className="td font-medium">{studentNames.get(entry.studentId) ?? "Former student"}</td>
                  <td className="td">{entry.kind}</td>
                  <td className="td">{peso(entry.amount)}</td>
                  <td className="td text-muted-foreground">{entry.note ?? "-"}</td>
                  {canDelete && <td className="td text-right">{entry.kind === "Wallet withdrawal" && (
                    <ActionForm action={deleteStudentWithdrawal} submit="Delete" buttonContainerClassName="" buttonClassName="btn btn-danger h-8 px-2">
                      <input type="hidden" name="id" value={entry.id} />
                    </ActionForm>
                  )}</td>}
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </Panel>
    </>
  );
}
