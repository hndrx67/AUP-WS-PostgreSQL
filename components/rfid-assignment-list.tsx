import { assignStudentRfid } from "@/app/actions/users";
import { ActionForm } from "@/components/action-form";
import { ProfileAvatar } from "@/components/profile-avatar";
import { Badge, Empty } from "@/components/ui";
import type { Profile } from "@/lib/types";

type Student = Pick<Profile, "id" | "full_name" | "student_id" | "rfid_code" | "avatar_path" | "is_active">;

export function RfidAssignmentList({ students }: { students: Student[] }) {
  if (!students.length) return <Empty>No students found.</Empty>;

  return (
    <ul className="divide-y divide-border">
      {students.map((student) => (
        <li key={student.id} className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <ProfileAvatar profile={student} size="md" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{student.full_name}</p>
              <p className="truncate text-xs text-muted-foreground">Student ID: {student.student_id || "Not assigned"}</p>
              {!student.is_active && <Badge tone="danger">Deactivated</Badge>}
            </div>
          </div>
          <ActionForm action={assignStudentRfid} submit="Save RFID" className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto lg:min-w-[380px]" buttonContainerClassName="" buttonClassName="btn btn-primary">
            <input type="hidden" name="student_id" value={student.id} />
            <label className="flex-1">
              <span className="sr-only">RFID code for {student.full_name}</span>
              <input
                className="input w-full"
                name="rfid_code"
                type="text"
                defaultValue={student.rfid_code ?? ""}
                maxLength={100}
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                placeholder="Scan or enter RFID code"
                aria-label={`RFID code for ${student.full_name}`}
              />
            </label>
          </ActionForm>
        </li>
      ))}
    </ul>
  );
}
