import { requireAdmin } from "@/lib/auth";
import { query } from "@/lib/db";
import { PageHeader, Panel } from "@/components/ui";
import { RfidAssignmentList } from "@/components/rfid-assignment-list";
import type { Profile } from "@/lib/types";

export const metadata = { title: "Assign RFID" };

type Student = Pick<Profile, "id" | "full_name" | "student_id" | "rfid_code" | "avatar_path" | "is_active">;

export default async function AdminAssignRfidPage() {
  await requireAdmin();
  const { rows } = await query<Student>(
    "select id, full_name, student_id, rfid_code, avatar_path, is_active from profiles where role = 'student' order by lower(full_name)",
  );

  return (
    <>
      <PageHeader title="Assign RFID" description="Link each student's RFID card code to their student account. Scan a card into its field, then save." />
      <Panel title={`All students (${rows.length})`}>
        <RfidAssignmentList students={rows} />
      </Panel>
    </>
  );
}
