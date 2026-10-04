import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { ProfileAvatar } from "@/components/profile-avatar";
import { Shell } from "@/components/shell";
import { Badge, Panel } from "@/components/ui";
import { getSessionProfile } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/nav";
import { query } from "@/lib/db";
import type { ProfileWithDept } from "@/lib/types";

export default async function MemberProfilePage({ params }: { params: Promise<{ userId: string }> }) {
  const viewer = await getSessionProfile();
  if (!viewer?.is_active) redirect("/login");
  const { userId } = await params;
  const { rows } = await query<ProfileWithDept>(
    `select p.*, case when d.id is null then null else json_build_object('id', d.id, 'name', d.name) end as department
       from profiles p left join departments d on d.id = p.department_id
      where p.id = $1 and p.is_active = true limit 1`,
    [userId],
  );
  const target = rows[0];
  if (!target) notFound();

  const sameDepartment = !!viewer.department_id && target.department_id === viewer.department_id;
  const self = viewer.id === target.id;
  const departmentMember = ["student", "supervisor"].includes(target.role) && ["student", "supervisor"].includes(viewer.role);
  if (!self && viewer.role !== "admin" && !(sameDepartment && departmentMember)) notFound();

  const profile = target as ProfileWithDept;
  return (
    <Shell profile={viewer}>
      <section className="card overflow-hidden">
        <div className="relative h-44 bg-gradient-to-br from-primary/80 via-accent to-muted sm:h-60">
          {profile.cover_path && <Image src={`/profile-image/${profile.id}/cover?rev=${encodeURIComponent(profile.cover_path)}`} alt="Cover photo" fill unoptimized sizes="(max-width: 768px) 100vw, 1152px" className="object-cover" />}
        </div>
        <div className="flex flex-col gap-4 px-5 pb-6 sm:flex-row sm:items-end sm:px-8">
          <ProfileAvatar profile={profile} size="lg" className="-mt-12 border-4 border-card shadow-md sm:-mt-16" />
          <div className="min-w-0 pb-1">
            <h1 className="truncate text-2xl font-semibold tracking-tight">{profile.full_name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Badge tone={profile.role === "supervisor" ? "primary" : "default"}>{ROLE_LABEL[profile.role]}</Badge>
              {profile.department && <span>{profile.department.name}</span>}
              {profile.work_assignment && <span>· {profile.work_assignment}</span>}
            </div>
            {profile.bio && <p className="mt-3 max-w-2xl whitespace-pre-wrap text-sm">{profile.bio}</p>}
          </div>
        </div>
      </section>
      {profile.work_assignment && <div className="mt-6"><Panel title="Work assignment"><p className="p-5 text-sm">{profile.work_assignment}</p></Panel></div>}
    </Shell>
  );
}
