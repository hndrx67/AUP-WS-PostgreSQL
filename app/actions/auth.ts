"use server";

import { redirect } from "next/navigation";
import { createSession, destroyCurrentSession, homeFor } from "@/lib/auth";
import { verifyPassword } from "@/lib/auth/password";
import { query } from "@/lib/db";
import type { ActionState, Role } from "@/lib/types";

export async function signIn(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password." };

  const result = await query<{ id: string; role: Role; is_active: boolean; password_hash: string }>(
    "select id, role, is_active, password_hash from profiles where lower(email) = lower($1) limit 1",
    [email],
  );
  const profile = result.rows[0];
  if (!profile || !(await verifyPassword(password, profile.password_hash))) return { error: "Email or password is incorrect." };
  await createSession(profile.id);
  if (!profile.is_active) {
    if (profile.role === "student") redirect("/account-disabled");
    await destroyCurrentSession();
    return { error: "This account is deactivated. Contact an administrator." };
  }
  redirect(homeFor(profile.role as Role));
}

export async function signOut(): Promise<void> {
  await destroyCurrentSession();
  redirect("/");
}
