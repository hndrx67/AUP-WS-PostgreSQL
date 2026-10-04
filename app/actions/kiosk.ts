"use server";

import { transaction } from "@/lib/db";
import { createKioskAvatarToken } from "@/lib/profile-storage";

export type KioskState = {
  error?: string;
  result?: {
    studentProfileId: string;
    studentName: string;
    studentNumber: string;
    action: "clocked_in" | "clocked_out";
    timeIn: string;
    timeOut: string | null;
    avatarUrl: string | null;
  };
} | null;

/** Keyboard-emulating RFID scanners submit the card code into the focused field. */
export async function toggleKioskTime(_prev: KioskState, formData: FormData): Promise<KioskState> {
  const identifier = String(formData.get("identifier") ?? "").trim();
  if (!identifier) return { error: "Enter a student ID or scan an RFID card." };
  if (identifier.length > 100) return { error: "That ID or RFID code is too long." };

  let row: { id: string; student_name: string; student_number: string; avatar_path: string | null; action: "clocked_in" | "clocked_out"; time_in: string; time_out: string | null };
  try {
    row = await transaction(async (client) => {
      const people = await client.query<{ id: string; full_name: string; student_id: string; avatar_path: string | null }>(
        "select id, full_name, student_id, avatar_path from profiles where (student_id = $1 or rfid_code = $1) and role = 'student' and is_active = true for update",
        [identifier],
      );
      if (!people.rows.length) throw new Error("STUDENT_NOT_FOUND");
      if (people.rows.length > 1) throw new Error("IDENTIFIER_NOT_UNIQUE");
      const profile = people.rows[0];
      const open = await client.query<{ id: string; time_in: string }>("select id, time_in from time_logs where student_id = $1 and time_out is null for update", [profile.id]);
      if (open.rows[0]) {
        const { rows } = await client.query<{ time_in: string; time_out: string }>("update time_logs set time_out = now() where id = $1 returning time_in, time_out", [open.rows[0].id]);
        return { id: profile.id, student_name: profile.full_name, student_number: profile.student_id, avatar_path: profile.avatar_path, action: "clocked_out", ...rows[0] };
      }
      const { rows } = await client.query<{ time_in: string; time_out: string | null }>("insert into time_logs (student_id, time_in) values ($1, now()) returning time_in, time_out", [profile.id]);
      return { id: profile.id, student_name: profile.full_name, student_number: profile.student_id, avatar_path: profile.avatar_path, action: "clocked_in", ...rows[0] };
    });
  } catch (error) {
    const message = (error as Error).message;
    if (message === "STUDENT_NOT_FOUND") return { error: "No active work scholar was found for that student ID or RFID code. Check it and try again." };
    if (message === "IDENTIFIER_NOT_UNIQUE") return { error: "This student ID or RFID code matches multiple accounts. Contact an administrator." };
    return { error: "Could not record your time right now. Please try again or contact staff." };
  }

  let avatarUrl: string | null = null;
  if (row.avatar_path) {
    const { expires, token } = createKioskAvatarToken(row.id, row.avatar_path);
    avatarUrl = `/profile-image/${row.id}/avatar?expires=${expires}&token=${encodeURIComponent(token)}`;
  }

  return {
    result: {
      studentProfileId: row.id,
      studentName: row.student_name,
      studentNumber: row.student_number,
      action: row.action,
      timeIn: row.time_in,
      timeOut: row.time_out,
      avatarUrl,
    },
  };
}
