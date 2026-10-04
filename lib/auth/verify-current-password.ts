import "server-only";
import { query } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";

export async function verifyCurrentPassword(profileId: string, password: string) {
  if (!password) return false;
  const result = await query<{ password_hash: string }>(
    "select password_hash from profiles where id = $1 and is_active = true limit 1",
    [profileId],
  );
  const hash = result.rows[0]?.password_hash;
  return hash ? verifyPassword(password, hash) : false;
}
