import { DepartmentDirectory } from "@/components/department-directory";
import { requireRole } from "@/lib/auth";
import { createPostgresClient } from "@/lib/postgres-client";
import type { Department, Profile } from "@/lib/types";

export const metadata = { title: "My Department" };

export default async function StudentDepartmentPage() {
  const me = await requireRole("student");
  const dbClient = await createPostgresClient();
  const memberClient = await createPostgresClient();
  let department: Department | null = null;
  let members: Profile[] = [];
  if (me.department_id) {
    const [{ data: d }, { data: people }] = await Promise.all([
      dbClient.from("departments").select("*").eq("id", me.department_id).maybeSingle(),
      memberClient.from("profiles").select("id, full_name, avatar_path, role, work_assignment").eq("department_id", me.department_id).in("role", ["student", "supervisor"]).eq("is_active", true).order("role").order("full_name"),
    ]);
    department = (d as Department | null) ?? null;
    members = (people ?? []) as Profile[];
  }
  return <DepartmentDirectory department={department} members={members} />;
}
