"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { hashPassword } from "@/lib/auth/password";
import { verifyCurrentPassword } from "@/lib/auth/verify-current-password";
import { query, transaction } from "@/lib/db";
import type { ActionState, Role } from "@/lib/types";

type NewAccount = {
  email: string;
  password: string;
  full_name: string;
  role: Role;
  department_id: string | null;
  student_id: string | null;
  work_assignment: string | null;
  hourly_rate: number;
  temporary_credentials?: boolean;
};

async function createAccount(a: NewAccount): Promise<ActionState> {
  if (!a.full_name) return { error: "Enter the full name." };
  if (!/^\S+@\S+\.\S+$/.test(a.email)) return { error: "Enter a valid email address." };
  if (a.password.length < 8) return { error: "Password must be at least 8 characters." };
  if (!(a.hourly_rate >= 0)) return { error: "Hourly rate must be zero or more." };
  if (a.role === "student" && a.student_id) {
    const collision = await query("select 1 from profiles where student_id = $1 or rfid_code = $1 limit 1", [a.student_id]);
    if (collision.rowCount) return { error: "That student ID is already assigned as a student ID or RFID code." };
  }

  try {
    const passwordHash = await hashPassword(a.password);
    await query(
      `insert into profiles (email, password_hash, full_name, role, department_id, student_id, work_assignment, hourly_rate, temporary_credentials)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [a.email, passwordHash, a.full_name, a.role, a.department_id, a.student_id, a.work_assignment, a.hourly_rate, a.role === "supervisor" && a.temporary_credentials === true],
    );
    return { ok: `Created ${a.full_name}.` };
  } catch (error) {
    if ((error as { code?: string }).code === "23505") return { error: "That email or student ID is already assigned to an account." };
    return { error: "Could not create the account. Check the account details and try again." };
  }
}

function readAccount(fd: FormData) {
  return {
    email: String(fd.get("email") ?? "").trim().toLowerCase(),
    password: String(fd.get("password") ?? ""),
    full_name: String(fd.get("full_name") ?? "").trim(),
    student_id: String(fd.get("student_id") ?? "").trim() || null,
    work_assignment: String(fd.get("work_assignment") ?? "").trim() || null,
    hourly_rate: Number(fd.get("hourly_rate") ?? 0) || 0,
  };
}

/** Supervisors create work scholar accounts inside their own department only. */
export async function createStudentAccount(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const me = await getSessionProfile();
  if (!me?.is_active || me.role !== "supervisor") return { error: "Only active supervisors can create student accounts." };
  if (!me.department_id) {
    return { error: "You are not assigned to a department yet. Ask an administrator." };
  }
  const result = await createAccount({
    ...readAccount(fd),
    role: "student",
    department_id: me.department_id,
  });
  revalidatePath("/supervisor", "layout");
  return result;
}

/** Administrators create any kind of account. */
export async function createUserAccount(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const me = await getSessionProfile();
  if (!me?.is_active || me.role !== "admin") return { error: "Only active administrators can create accounts." };
  const role = String(fd.get("role") ?? "student") as Role;
  if (!["student", "supervisor", "admin"].includes(role)) return { error: "Choose a role." };
  const departmentId = String(fd.get("department_id") ?? "") || null;
  const result = await createAccount({
    ...readAccount(fd),
    role,
    department_id: role === "admin" ? null : departmentId,
    temporary_credentials: role === "supervisor" && String(fd.get("temporary_credentials") ?? "") === "true",
  });
  revalidatePath("/admin", "layout");
  return result;
}

/** A temporary supervisor must accept the supplied credentials or replace them before continuing. */
export async function confirmTemporarySupervisorCredentials(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const me = await getSessionProfile();
  if (!me?.is_active || me.role !== "supervisor" || !me.temporary_credentials) {
    return { error: "This account does not need credential confirmation." };
  }

  const mode = String(fd.get("mode") ?? "");
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  const confirmation = String(fd.get("password_confirmation") ?? "");
  let passwordHash: string | null = null;

  if (mode === "update") {
    if (!email && !password) return { error: "Enter a new email or password, or keep the provided credentials." };
    if (email && !/^\S+@\S+\.\S+$/.test(email)) return { error: "Enter a valid email address." };
    if (password && password.length < 8) return { error: "Your new password must be at least 8 characters." };
    if (password !== confirmation) return { error: "The passwords do not match." };
    if (password) passwordHash = await hashPassword(password);
  } else if (mode !== "accept") {
    return { error: "Choose whether to update or keep the provided credentials." };
  }

  try {
    const result = await query(
      `update profiles set
         email = case when $2::text is null then email else $2 end,
         password_hash = case when $3::text is null then password_hash else $3 end,
         temporary_credentials = false
       where id = $1 and role = 'supervisor' and temporary_credentials = true`,
      [me.id, mode === "update" && email ? email : null, passwordHash],
    );
    if (!result.rowCount) return { error: "Credential confirmation is no longer required. Sign in again." };
  } catch (error) {
    if ((error as { code?: string }).code === "23505") return { error: "That email address is already assigned to another account." };
    return { error: "Could not confirm your account details. Please try again." };
  }

  revalidatePath("/", "layout");
  redirect("/supervisor");
}

/** Admin override: move a user to another department and/or change a student's hourly rate. */
export async function updateUserAssignment(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const me = await getSessionProfile();
  if (!me?.is_active || me.role !== "admin") return { error: "Only active administrators can edit account assignments." };
  const userId = String(fd.get("user_id") ?? "");
  const departmentId = String(fd.get("department_id") ?? "") || null;
  const studentId = String(fd.get("student_id") ?? "").trim() || null;
  if (fd.has("student_id") && studentId && studentId.length > 100) return { error: "Student ID must be 100 characters or fewer." };
  if (fd.has("student_id") && studentId) {
    const collision = await query("select 1 from profiles where id <> $1 and rfid_code = $2 limit 1", [userId, studentId]);
    if (collision.rowCount) return { error: "That student ID is already assigned as another student's RFID code." };
  }
  const update: Record<string, unknown> = { department_id: departmentId };
  const rate = fd.get("hourly_rate");
  if (rate !== null && String(rate) !== "") update.hourly_rate = Math.max(0, Number(rate) || 0);
  if (fd.has("work_assignment")) update.work_assignment = String(fd.get("work_assignment") ?? "").trim() || null;
  try {
    await query(
      `update profiles set department_id = $2,
         hourly_rate = case when $3::numeric is null then hourly_rate else $3 end,
         work_assignment = case when $4::boolean then $5 else work_assignment end,
         student_id = case when $6::boolean then $7 else student_id end
       where id = $1`,
      [userId, departmentId, rate !== null && String(rate) !== "" ? Math.max(0, Number(rate) || 0) : null, fd.has("work_assignment"), String(fd.get("work_assignment") ?? "").trim() || null, fd.has("student_id"), studentId],
    );
  } catch {
    return { error: "Could not update this account." };
  }
  revalidatePath("/admin", "layout");
  return { ok: "Student assignment updated." };
}

/** Assign an RFID code to a student; supervisors are restricted to their department. */
export async function assignStudentRfid(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const me = await getSessionProfile();
  if (!me?.is_active || (me.role !== "admin" && me.role !== "supervisor")) {
    return { error: "Only active administrators and supervisors can assign RFID codes." };
  }
  if (me.role === "supervisor" && !me.department_id) {
    return { error: "You must be assigned to a department to assign RFID codes." };
  }

  const studentId = String(fd.get("student_id") ?? "");
  const rfidCode = String(fd.get("rfid_code") ?? "").trim() || null;
  if (!studentId) return { error: "Choose a student." };
  if (rfidCode && rfidCode.length > 100) return { error: "RFID codes must be 100 characters or fewer." };

  try {
    await transaction(async (client) => {
      const scope = me.role === "admin" ? "" : "and department_id = $2";
      const student = await client.query<{ id: string; student_id: string | null }>(
        `select id, student_id from profiles where id = $1 and role = 'student' ${scope} for update`,
        me.role === "admin" ? [studentId] : [studentId, me.department_id],
      );
      if (!student.rowCount) throw new Error("STUDENT_NOT_IN_SCOPE");
      if (!student.rows[0].student_id) throw new Error("STUDENT_ID_REQUIRED");

      if (rfidCode) {
        await client.query("select pg_advisory_xact_lock(hashtextextended($1, 0))", [rfidCode]);
        const collision = await client.query(
          "select 1 from profiles where id <> $1 and (rfid_code = $2 or student_id = $2) limit 1",
          [studentId, rfidCode],
        );
        if (collision.rowCount) throw new Error("RFID_ALREADY_USED");
      }

      await client.query("update profiles set rfid_code = $2 where id = $1", [studentId, rfidCode]);
    });
  } catch (error) {
    const code = (error as { code?: string }).code;
    const message = (error as Error).message;
    if (message === "STUDENT_NOT_IN_SCOPE") return { error: "That student is not in your department." };
    if (message === "STUDENT_ID_REQUIRED") return { error: "Assign a student ID before linking an RFID code." };
    if (message === "RFID_ALREADY_USED" || code === "23505") return { error: "That RFID code is already assigned to another student or student ID." };
    return { error: "Could not save the RFID assignment." };
  }

  revalidatePath(me.role === "admin" ? "/admin" : "/supervisor", "layout");
  return { ok: rfidCode ? "RFID code assigned." : "RFID assignment removed." };
}

export async function setUserActive(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const me = await getSessionProfile();
  if (!me?.is_active || me.role !== "admin") return { error: "Only active administrators can change account status." };
  const userId = String(fd.get("user_id") ?? "");
  if (userId === me.id) return { error: "You cannot deactivate your own account." };
  const active = String(fd.get("active")) === "true";
  if (!active && !(await verifyCurrentPassword(me.id, String(fd.get("confirmation_password") ?? "")))) return { error: "Your password is incorrect." };
  try {
    await transaction(async (client) => {
      await client.query("update profiles set is_active = $2 where id = $1", [userId, active]);
      if (!active) await client.query("delete from sessions where profile_id = $1", [userId]);
    });
  } catch {
    return { error: "Could not update the account status." };
  }
  revalidatePath("/admin", "layout");
  return { ok: active ? "Account reactivated." : "Account deactivated." };
}

/** Supervisors can edit scholars in their own department and disable them. */
export async function updateDepartmentStudent(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const me = await getSessionProfile();
  if (!me?.is_active || me.role !== "supervisor" || !me.department_id) return { error: "Only active supervisors can edit department students." };
  const userId = String(fd.get("user_id") ?? "");
  const { rows: students } = await query<{ id: string; role: Role; department_id: string | null }>("select id, role, department_id from profiles where id = $1 limit 1", [userId]);
  const student = students[0];
  if (student?.role !== "student" || student.department_id !== me.department_id) return { error: "That student is not in your department." };

  const update: Record<string, unknown> = {};
  if (fd.has("student_id")) update.student_id = String(fd.get("student_id") ?? "").trim() || null;
  if (fd.has("student_id") && update.student_id) {
    if (String(update.student_id).length > 100) return { error: "Student ID must be 100 characters or fewer." };
    const collision = await query("select 1 from profiles where id <> $1 and rfid_code = $2 limit 1", [userId, update.student_id]);
    if (collision.rowCount) return { error: "That student ID is already assigned as another student's RFID code." };
  }
  if (fd.has("work_assignment")) update.work_assignment = String(fd.get("work_assignment") ?? "").trim() || null;
  if (fd.has("hourly_rate")) {
    const rate = Number(fd.get("hourly_rate"));
    if (Number.isFinite(rate) && rate >= 0) update.hourly_rate = rate;
  }
  if (String(fd.get("disable") ?? "") === "true") update.is_active = false;
  try {
    await query(
      `update profiles set
         student_id = case when $2::boolean then $3 else student_id end,
         work_assignment = case when $4::boolean then $5 else work_assignment end,
         hourly_rate = case when $6::numeric is null then hourly_rate else $6 end,
         is_active = case when $7::boolean then false else is_active end
       where id = $1`,
      [userId, fd.has("student_id"), String(fd.get("student_id") ?? "").trim() || null,
        fd.has("work_assignment"), String(fd.get("work_assignment") ?? "").trim() || null,
        fd.has("hourly_rate") && Number.isFinite(Number(fd.get("hourly_rate"))) && Number(fd.get("hourly_rate")) >= 0 ? Number(fd.get("hourly_rate")) : null,
        String(fd.get("disable") ?? "") === "true"],
    );
  } catch (error) {
    if ((error as { code?: string }).code === "23505") return { error: "That student ID is already assigned to another work scholar." };
    return { error: "Could not save this student entry." };
  }
  revalidatePath("/supervisor/students");
  revalidatePath("/supervisor/department");
  return { ok: update.is_active === false ? "Student account disabled." : "Student entry saved." };
}

/** Only administrators can permanently remove an account. */
export async function deleteUserAccount(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const me = await getSessionProfile();
  if (!me?.is_active || me.role !== "admin") return { error: "Only active administrators can delete accounts." };
  if (!(await verifyCurrentPassword(me.id, String(fd.get("confirmation_password") ?? "")))) return { error: "Your password is incorrect." };
  const userId = String(fd.get("user_id") ?? "");
  if (!userId || userId === me.id) return { error: "You cannot delete your own account." };
  try {
    await query("delete from profiles where id = $1", [userId]);
  } catch {
    return { error: "Could not permanently delete this account." };
  }
  revalidatePath("/admin", "layout");
  return { ok: "Account permanently deleted." };
}

/** Administrators can override the auth email and/or password for any account. */
export async function updateAccountCredentials(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const me = await getSessionProfile();
  if (!me?.is_active || me.role !== "admin") return { error: "Only active administrators can change account credentials." };
  const userId = String(fd.get("user_id") ?? "");
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  const confirmation = String(fd.get("password_confirmation") ?? "");
  if (!userId) return { error: "Choose an account." };
  if (!email && !password) return { error: "Enter a new email address or password." };
  if (email && !/^\S+@\S+\.\S+$/.test(email)) return { error: "Enter a valid email address." };
  if (password && password.length < 8) return { error: "Password must be at least 8 characters." };
  if (password !== confirmation) return { error: "The passwords do not match." };

  let passwordHash: string | null = null;
  if (password) passwordHash = await hashPassword(password);
  try {
    await transaction(async (client) => {
      await client.query(
        `update profiles set email = case when $2::text is null then email else $2 end,
           password_hash = case when $3::text is null then password_hash else $3 end
         where id = $1`,
        [userId, email || null, passwordHash],
      );
      if (password) await client.query("delete from sessions where profile_id = $1", [userId]);
    });
  } catch (error) {
    if ((error as { code?: string }).code === "23505") return { error: "That email address is already assigned to another account." };
    return { error: "Could not update the account credentials." };
  }
  revalidatePath("/admin", "layout");
  return { ok: email && password ? "Account email and password updated." : email ? "Account email updated." : "Account password updated." };
}
