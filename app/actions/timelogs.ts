"use server";

import { revalidatePath } from "next/cache";
import { getSessionProfile } from "@/lib/auth";
import { query } from "@/lib/db";
import { verifyCurrentPassword } from "@/lib/auth/verify-current-password";
import { fromManilaInput } from "@/lib/format";
import type { ActionState } from "@/lib/types";

function readTimes(fd: FormData) {
  const rawIn = String(fd.get("time_in") ?? "");
  const rawOut = String(fd.get("time_out") ?? "");
  if (!rawIn) throw new Error("Enter a time in.");
  const time_in = fromManilaInput(rawIn);
  const time_out = rawOut ? fromManilaInput(rawOut) : null;
  if (time_out && new Date(time_out) < new Date(time_in)) {
    throw new Error("Time out must be after time in.");
  }
  return { time_in, time_out };
}

/** Admins can edit any record; supervisors are limited to students in their department. */
export async function overrideTimeLog(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const me = await getSessionProfile();
  if (!me?.is_active || (me.role !== "admin" && me.role !== "supervisor")) return { error: "Only active administrators and supervisors can edit time records." };
  if (me.role === "supervisor" && !me.department_id) return { error: "You must be assigned to a department to edit its time records." };
  const reason = String(fd.get("reason") ?? "").trim();
  if (!reason) return { error: "Enter a reason for the override." };
  try {
    const times = readTimes(fd);
    const { rowCount } = await query(
      `update time_logs set time_in = $2, time_out = $3, overridden_by = $4, override_reason = $5
        where id = $1 and ($6 = 'admin' or exists (
          select 1 from profiles p where p.id = time_logs.student_id and p.role = 'student' and p.department_id = $7
        ))`,
      [String(fd.get("id") ?? ""), times.time_in, times.time_out, me.id, reason, me.role, me.department_id],
    );
    if (!rowCount) return { error: "Time record not found or outside your department." };
  } catch (e) {
    return { error: (e as Error).message };
  }
  revalidatePath(me.role === "admin" ? "/admin" : "/supervisor", "layout");
  return { ok: "Record updated." };
}

export async function addManualTimeLog(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const me = await getSessionProfile();
  if (!me?.is_active || (me.role !== "admin" && me.role !== "supervisor")) return { error: "Only active administrators and supervisors can add time records." };
  if (me.role === "supervisor" && !me.department_id) return { error: "You must be assigned to a department to add time records." };
  const studentId = String(fd.get("student_id") ?? "");
  const reason = String(fd.get("reason") ?? "").trim();
  if (!studentId) return { error: "Choose a student." };
  if (!reason) return { error: "Enter a reason for the entry." };
  try {
    const times = readTimes(fd);
    if (!times.time_out) return { error: "Enter a time out." };
    const result = await query(
      `insert into time_logs (student_id, time_in, time_out, overridden_by, override_reason)
       select p.id, $2, $3, $4, $5 from profiles p
       where p.id = $1 and p.role = 'student' and ($6 = 'admin' or p.department_id = $7)`,
      [studentId, times.time_in, times.time_out, me.id, reason, me.role, me.department_id],
    );
    if (!result.rowCount) return { error: "Student not found or outside your department." };
  } catch (e) {
    return { error: (e as Error).message };
  }
  revalidatePath(me.role === "admin" ? "/admin" : "/supervisor", "layout");
  return { ok: "Entry added." };
}

export async function deleteTimeLogs(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const me = await getSessionProfile();
  if (!me?.is_active || (me.role !== "admin" && me.role !== "supervisor")) return { error: "Only active administrators and supervisors can delete time records." };
  if (me.role === "supervisor" && !me.department_id) return { error: "You must be assigned to a department to delete its time records." };
  const ids = [...new Set(fd.getAll("ids").map(String).filter(Boolean))];
  const password = String(fd.get("confirmation_password") ?? "");
  if (!ids.length || ids.length > 200 || ids.some((id) => !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))) {
    return { error: "Select valid time records to delete." };
  }
  if (!password) return { error: "Enter your password to confirm deletion." };
  try {
    if (!(await verifyCurrentPassword(me.id, password))) return { error: "Your password is incorrect." };
    const result = await query(
      `with allowed as materialized (
         select tl.id from time_logs tl
         where tl.id = any($1::uuid[]) and ($2 = 'admin' or exists (
           select 1 from profiles p where p.id = tl.student_id and p.role = 'student' and p.department_id = $3
         ))
       ), deleted as (
         delete from time_logs where id in (select id from allowed)
           and (select count(*) from allowed) = cardinality($1::uuid[])
         returning id
       ) select count(*)::int as count from deleted`,
      [ids, me.role, me.department_id],
    );
    if (result.rows[0]?.count !== ids.length) return { error: "One or more records were not found or are outside your department. Nothing was deleted." };
  } catch { return { error: "Could not delete the selected time records." }; }
  revalidatePath(me.role === "admin" ? "/admin" : "/supervisor", "layout");
  return { ok: ids.length === 1 ? "Time record deleted." : `${ids.length} time records deleted.` };
}
