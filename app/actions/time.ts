"use server";

import { revalidatePath } from "next/cache";
import { getSessionProfile } from "@/lib/auth";
import { query } from "@/lib/db";
import type { ActionState } from "@/lib/types";

export async function clockIn(_prev: ActionState, _fd: FormData): Promise<ActionState> {
  const me = await getSessionProfile();
  if (!me?.is_active || me.role !== "student") return { error: "Only active work scholars can clock in." };
  try {
    await query("insert into time_logs (student_id, time_in) values ($1, now())", [me.id]);
  } catch (error) {
    if ((error as { code?: string }).code === "23505") return { error: "You are already clocked in." };
    return { error: "Could not record your time in. Please try again." };
  }
  revalidatePath("/student", "layout");
  return { ok: "Time in recorded." };
}

export async function clockOut(_prev: ActionState, _fd: FormData): Promise<ActionState> {
  const me = await getSessionProfile();
  if (!me?.is_active || me.role !== "student") return { error: "Only active work scholars can clock out." };
  const { rows } = await query("update time_logs set time_out = now() where student_id = $1 and time_out is null returning id", [me.id]);
  if (!rows.length) return { error: "You are not currently clocked in." };
  revalidatePath("/student", "layout");
  return { ok: "Time out recorded." };
}
