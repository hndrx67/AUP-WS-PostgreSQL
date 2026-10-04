"use server";

import { revalidatePath } from "next/cache";
import type { PoolClient } from "pg";
import { getSessionProfile } from "@/lib/auth";
import { verifyCurrentPassword } from "@/lib/auth/verify-current-password";
import { query, transaction } from "@/lib/db";
import type { ActionState } from "@/lib/types";

function inputAmount(fd: FormData) {
  const amount = Number(fd.get("amount"));
  return Number.isFinite(amount) ? amount : Number.NaN;
}

async function authorizedManager() {
  const me = await getSessionProfile();
  if (!me?.is_active || (me.role !== "admin" && me.role !== "supervisor")) return null;
  return me;
}

async function lockStudent(client: PoolClient, studentId: string, actor: NonNullable<Awaited<ReturnType<typeof authorizedManager>>>) {
  const { rows } = await client.query<{ id: string; role: string; department_id: string | null }>(
    "select id, role, department_id from profiles where id = $1 for update",
    [studentId],
  );
  const student = rows[0];
  if (!student || student.role !== "student") throw new Error("Student not found.");
  if (actor.role === "supervisor" && (!actor.department_id || student.department_id !== actor.department_id)) {
    throw new Error("That student is outside your department.");
  }
  return student;
}

async function financeValues(client: PoolClient, studentId: string) {
  const { rows } = await client.query<{ available_credit: string; personal_wallet: string }>(
    `select
       greatest(0, coalesce((select sum(greatest(0, extract(epoch from (t.time_out - greatest(t.time_in, p.financials_started_at))) / 3600 * coalesce(t.earning_rate, p.hourly_rate)))
         from time_logs t where t.student_id = p.id and t.time_out is not null and t.time_out > p.financials_started_at), 0)
         - p.school_tuition_balance
         - coalesce((select sum(w.amount) from wallet_transfers w where w.student_id = p.id and w.allocated_at >= p.financials_started_at), 0)) as available_credit,
       p.personal_wallet_opening_balance
         + coalesce((select sum(w.amount) from wallet_transfers w where w.student_id = p.id), 0)
         - coalesce((select sum(o.amount) from payouts o where o.student_id = p.id), 0) as personal_wallet
       from profiles p where p.id = $1`,
    [studentId],
  );
  if (!rows[0]) throw new Error("Student not found.");
  return { availableCredit: Number(rows[0].available_credit), personalWallet: Number(rows[0].personal_wallet) };
}

function refreshFinancePages() {
  revalidatePath("/admin/payouts");
  revalidatePath("/supervisor/finances");
  revalidatePath("/student");
  revalidatePath("/student/earnings");
}

export async function setSchoolTuitionBalance(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const me = await authorizedManager();
  if (!me) return { error: "Only active administrators and supervisors can manage student finances." };
  const studentId = String(fd.get("student_id") ?? "");
  const amount = inputAmount(fd);
  if (!studentId) return { error: "Choose a student." };
  if (!Number.isFinite(amount) || amount < 0 || Math.round(amount * 100) !== amount * 100) return { error: "Enter a tuition balance of zero or more with up to two decimals." };
  try {
    await transaction(async (client) => {
      await lockStudent(client, studentId, me);
      await client.query("update profiles set school_tuition_balance = $2, financials_started_at = now() where id = $1", [studentId, amount]);
    });
  } catch (error) { return { error: (error as Error).message }; }
  refreshFinancePages();
  return { ok: "School tuition balance updated." };
}

export async function allocateToPersonalWallet(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const me = await authorizedManager();
  if (!me) return { error: "Only active administrators and supervisors can manage student finances." };
  const studentId = String(fd.get("student_id") ?? "");
  const amount = inputAmount(fd);
  const note = String(fd.get("note") ?? "").trim() || null;
  if (!studentId) return { error: "Choose a student." };
  if (!Number.isFinite(amount) || amount <= 0 || Math.round(amount * 100) !== amount * 100) return { error: "Enter an amount greater than zero with up to two decimals." };
  try {
    await transaction(async (client) => {
      await lockStudent(client, studentId, me);
      const { availableCredit } = await financeValues(client, studentId);
      if (amount > availableCredit) throw new Error("Allocation exceeds the available tuition credit.");
      await client.query("insert into wallet_transfers (student_id, amount, note, created_by) values ($1, $2, $3, $4)", [studentId, amount, note, me.id]);
    });
  } catch (error) { return { error: (error as Error).message }; }
  refreshFinancePages();
  return { ok: "Earned money allocated to the personal wallet." };
}

export async function recordStudentWithdrawal(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const me = await authorizedManager();
  if (!me) return { error: "Only active administrators and supervisors can record a withdrawal." };
  const studentId = String(fd.get("student_id") ?? "");
  const amount = inputAmount(fd);
  const note = String(fd.get("note") ?? "").trim() || null;
  if (!studentId) return { error: "Choose a student." };
  if (!Number.isFinite(amount) || amount <= 0 || Math.round(amount * 100) !== amount * 100) return { error: "Enter an amount greater than zero with up to two decimals." };
  try {
    await transaction(async (client) => {
      await lockStudent(client, studentId, me);
      const { personalWallet } = await financeValues(client, studentId);
      if (amount > personalWallet) throw new Error("Withdrawal exceeds the available personal wallet balance.");
      await client.query("insert into payouts (student_id, amount, note, created_by) values ($1, $2, $3, $4)", [studentId, amount, note, me.id]);
    });
  } catch (error) { return { error: (error as Error).message }; }
  refreshFinancePages();
  return { ok: "Personal wallet withdrawal recorded." };
}

export async function deleteStudentWithdrawal(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const me = await getSessionProfile();
  if (!me?.is_active || me.role !== "admin") return { error: "Only active administrators can delete withdrawals." };
  if (!(await verifyCurrentPassword(me.id, String(fd.get("confirmation_password") ?? "")))) return { error: "Your password is incorrect." };
  try {
    await transaction(async (client) => {
      const { rows } = await client.query<{ student_id: string; amount: string; legacy_wallet_settled: boolean }>("select student_id, amount, legacy_wallet_settled from payouts where id = $1 for update", [String(fd.get("id") ?? "")]);
      const payout = rows[0];
      if (!payout) throw new Error("Withdrawal not found.");
      if (payout.legacy_wallet_settled) {
        await client.query("update profiles set personal_wallet_opening_balance = greatest(0, personal_wallet_opening_balance - $2) where id = $1", [payout.student_id, payout.amount]);
      }
      await client.query("delete from payouts where id = $1", [String(fd.get("id") ?? "")]);
    });
  } catch (error) { return { error: (error as Error).message }; }
  refreshFinancePages();
  return { ok: "Withdrawal record deleted." };
}
