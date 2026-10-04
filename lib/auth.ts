import { createHash, randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { resolveCookieSecurity } from "@/lib/cookie-security";
import { query } from "@/lib/db";
import type { ProfileWithDept, Role } from "@/lib/types";

export const SESSION_COOKIE = "aupws_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

export const homeFor = (role: Role) => `/${role}`;
const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");

export async function currentSessionTokenHash() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? tokenHash(token) : null;
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  await query(
    "insert into sessions (profile_id, token_hash, expires_at) values ($1, $2, now() + interval '7 days')",
    [userId, tokenHash(token)],
  );

  const store = await cookies();
  let forwardedProto: string | null = null;
  try {
    forwardedProto = (await headers()).get("x-forwarded-proto");
  } catch {
    // Some server contexts, such as tests or non-request execution, do not have request headers.
  }

  const secure = resolveCookieSecurity({
    nodeEnv: process.env.NODE_ENV,
    forwardedProto,
    appUrl: process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL,
  });

  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function destroyCurrentSession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await query("delete from sessions where token_hash = $1", [tokenHash(token)]);
  store.delete(SESSION_COOKIE);
}

export async function getSessionProfile(): Promise<ProfileWithDept | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const result = await query<ProfileWithDept>(
    `select p.*, case when d.id is null then null else json_build_object('id', d.id, 'name', d.name) end as department
       from sessions s
       join profiles p on p.id = s.profile_id
       left join departments d on d.id = p.department_id
      where s.token_hash = $1 and s.expires_at > now()
      limit 1`,
    [tokenHash(token)],
  );
  return result.rows[0] ?? null;
}

export async function requireRole(role: Role): Promise<ProfileWithDept> {
  const profile = await getSessionProfile();
  if (!profile) redirect("/login");
  if (!profile.is_active) redirect(profile.role === "student" ? "/account-disabled" : "/login");
  if (profile.role !== role) redirect(homeFor(profile.role));
  return profile;
}

export const requireAdmin = () => requireRole("admin");
