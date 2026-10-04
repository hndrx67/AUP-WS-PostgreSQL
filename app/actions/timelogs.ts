"use server";

import { revalidatePath } from "next/cache";
import { getSessionProfile } from "@/lib/auth";
import { query } from "@/lib/db";
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

/** Admin override of an existing record. A reason is required and stored with the record. */
export async function overrideTimeLog(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const me = await getSessionProfile();
  if (!me?.is_active || me.role !== "admin") return { error: "Only active administrators can edit time records." };
  const reason = String(fd.get("reason") ?? "").trim();
  if (!reason) return { error: "Enter a reason for the override." };
  try {
    const times = readTimes(fd);
    const { rowCount } = await query(
      "update time_logs set time_in = $2, time_out = $3, overridden_by = $4, override_reason = $5 where id = $1",
      [String(fd.get("id") ?? ""), times.time_in, times.time_out, me.id, reason],
    );
    if (!rowCount) return { error: "Time record not found." };
  } catch (e) {
    return { error: (e as Error).message };
  }
  revalidatePath("/admin", "layout");
  return { ok: "Record updated." };
}

export async function addManualTimeLog(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const me = await getSessionProfile();
  if (!me?.is_active || me.role !== "admin") return { error: "Only active administrators can add time records." };
  const studentId = String(fd.get("student_id") ?? "");
  const reason = String(fd.get("reason") ?? "").trim();
  if (!studentId) return { error: "Choose a student." };
  if (!reason) return { error: "Enter a reason for the entry." };
  try {
    const times = readTimes(fd);
    if (!times.time_out) return { error: "Enter a time out." };
    await query(
      "insert into time_logs (student_id, time_in, time_out, overridden_by, override_reason) values ($1, $2, $3, $4, $5)",
      [studentId, times.time_in, times.time_out, me.id, reason],
    );
  } catch (e) {
    return { error: (e as Error).message };
  }
  revalidatePath("/admin", "layout");
  return { ok: "Entry added." };
}

export async function deleteTimeLog(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const me = await getSessionProfile();
  if (!me?.is_active || me.role !== "admin") return { error: "Only active administrators can delete time records." };
  try {
    const result = await query("delete from time_logs where id = $1", [String(fd.get("id") ?? "")]);
    if (!result.rowCount) return { error: "Time record not found." };
  } catch { return { error: "Could not delete this time record." }; }
  revalidatePath("/admin", "layout");
  return { ok: "Time record deleted." };
}
