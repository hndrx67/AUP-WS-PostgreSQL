import Link from "next/link";
import { Building2 } from "lucide-react";
import { ProfileAvatar } from "@/components/profile-avatar";
import { Badge, Empty, PageHeader, Panel } from "@/components/ui";
import { ROLE_LABEL } from "@/lib/nav";
import type { Department, Profile } from "@/lib/types";

type DepartmentMember = Pick<Profile, "id" | "full_name" | "avatar_path" | "role" | "work_assignment">;

export function DepartmentDirectory({
  department,
  members,
}: {
  department: Department | null;
  members: DepartmentMember[];
}) {
  const scholars = members.filter((member) => member.role === "student");
  const supervisors = members.filter((member) => member.role === "supervisor");

  return (
    <>
      <PageHeader title="My Department" description={department?.description || "Meet the work scholars and supervisors in your department."} />
      {!department ? (
        <Panel><Empty>You are not assigned to a department yet. Contact an administrator.</Empty></Panel>
      ) : (
        <>
          <Panel>
            <div className="flex items-center gap-3 p-5">
              <span className="rounded-xl bg-accent p-3 text-accent-foreground"><Building2 size={22} /></span>
              <div><p className="text-xs text-muted-foreground">Department</p><h2 className="text-lg font-semibold">{department.name}</h2></div>
            </div>
          </Panel>
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <PeoplePanel title={`Work scholars (${scholars.length})`} people={scholars} />
            <PeoplePanel title={`Supervisors (${supervisors.length})`} people={supervisors} />
          </div>
        </>
      )}
    </>
  );
}

function PeoplePanel({ title, people }: { title: string; people: DepartmentMember[] }) {
  return (
    <Panel title={title}>
      {people.length === 0 ? <Empty>No members in this group yet.</Empty> : (
        <ul className="divide-y divide-border">
          {people.map((person) => (
            <li key={person.id}>
              <Link href={`/profile/${person.id}`} className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-muted/60">
                <ProfileAvatar profile={person} size="md" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{person.full_name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{person.work_assignment || ROLE_LABEL[person.role]}</span>
                </span>
                <Badge tone={person.role === "supervisor" ? "primary" : "default"}>{ROLE_LABEL[person.role]}</Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
