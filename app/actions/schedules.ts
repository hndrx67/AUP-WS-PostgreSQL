"use server";

import { revalidatePath } from "next/cache";
import { getSessionProfile } from "@/lib/auth";
import { query } from "@/lib/db";
import type { ActionState } from "@/lib/types";

export async function addSchedule(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const me = await getSessionProfile();
  if (!me?.is_active || (me.role !== "supervisor" && me.role !== "admin")) {
    return { error: "Only supervisors and administrators can do this." };
  }
  const student_id = String(fd.get("student_id") ?? "");
  const day_of_week = Number(fd.get("day_of_week"));
  const start_time = String(fd.get("start_time") ?? "");
  const end_time = String(fd.get("end_time") ?? "");
  const label = String(fd.get("label") ?? "").trim() || null;

  if (!student_id) return { error: "Choose a student." };
  if (!(day_of_week >= 0 && day_of_week <= 6)) return { error: "Choose a day." };
  if (!start_time || !end_time) return { error: "Enter a start and end time." };
  if (end_time <= start_time) return { error: "End time must be after start time." };

  try {
    const values: unknown[] = [student_id];
    let departmentCheck = "";
    if (me.role === "supervisor") { values.push(me.department_id); departmentCheck = `and department_id = $${values.length}`; }
    const allowed = await query(`select id from profiles where id = $1 and role = 'student' and is_active = true ${departmentCheck}`, values);
    if (!allowed.rows.length) return { error: "You can only schedule active students in your department." };
    await query("insert into schedules (student_id, day_of_week, start_time, end_time, label) values ($1, $2, $3, $4, $5)", [student_id, day_of_week, start_time, end_time, label]);
  } catch { return { error: "Could not add this shift." }; }
  revalidatePath("/", "layout");
  return { ok: "Shift added." };
}

export async function deleteSchedule(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const me = await getSessionProfile();
  if (!me?.is_active || (me.role !== "supervisor" && me.role !== "admin")) return { error: "Only active supervisors and administrators can remove shifts." };
  try {
    const values: unknown[] = [String(fd.get("id") ?? "")];
    let scope = "";
    if (me.role === "supervisor") { values.push(me.id); scope = `and student_id in (select id from profiles where department_id = (select department_id from profiles where id = $${values.length}))`; }
    const result = await query(`delete from schedules where id = $1 ${scope} returning id`, values);
    if (!result.rowCount) return { error: "Shift not found in your department." };
  } catch { return { error: "Could not remove this shift." }; }
  revalidatePath("/", "layout");
  return { ok: "Shift removed." };
}
