import { requireRole } from "@/lib/auth";
import { query } from "@/lib/db";
import { PageHeader, Panel } from "@/components/ui";
import { RfidAssignmentList } from "@/components/rfid-assignment-list";
import type { Profile } from "@/lib/types";

export const metadata = { title: "Assign RFID" };

type Student = Pick<Profile, "id" | "full_name" | "student_id" | "rfid_code" | "avatar_path" | "is_active">;

export default async function SupervisorAssignRfidPage() {
  const me = await requireRole("supervisor");
  const { rows } = me.department_id
    ? await query<Student>(
      "select id, full_name, student_id, rfid_code, avatar_path, is_active from profiles where role = 'student' and department_id = $1 order by lower(full_name)",
      [me.department_id],
    )
    : { rows: [] as Student[] };

  return (
    <>
      <PageHeader title="Assign RFID" description="Link students in your department to their RFID card codes. Scan a card into its field, then save." />
      <Panel title={`Department students (${rows.length})`}>
        <RfidAssignmentList students={rows} />
      </Panel>
    </>
  );
}
