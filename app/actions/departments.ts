"use server";

import { revalidatePath } from "next/cache";
import { query } from "@/lib/db";
import { getSessionProfile } from "@/lib/auth";
import type { ActionState } from "@/lib/types";

export async function createDepartment(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const me = await getSessionProfile();
  if (!me?.is_active || me.role !== "admin") return { error: "Only active administrators can create departments." };
  const name = String(fd.get("name") ?? "").trim();
  const description = String(fd.get("description") ?? "").trim() || null;
  if (!name) return { error: "Enter a department name." };

  try { await query("insert into departments (name, description) values ($1, $2)", [name, description]); }
  catch (error) { return { error: (error as { code?: string }).code === "23505" ? "A department with that name already exists." : "Could not create this department." }; }
  revalidatePath("/admin", "layout");
  return { ok: `Created ${name}.` };
}

export async function deleteDepartment(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const me = await getSessionProfile();
  if (!me?.is_active || me.role !== "admin") return { error: "Only active administrators can delete departments." };
  // Members are kept and become unassigned (on delete set null).
  try { await query("delete from departments where id = $1", [String(fd.get("id") ?? "")]); }
  catch { return { error: "Could not delete this department." }; }
  revalidatePath("/admin", "layout");
  return { ok: "Department deleted." };
}
