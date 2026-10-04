import { Trash2 } from "lucide-react";
import { addSchedule, deleteSchedule } from "@/app/actions/schedules";
import { ActionForm, Field } from "@/components/action-form";
import { Empty, Panel, TableWrap } from "@/components/ui";
import { DAYS, fmtClock } from "@/lib/format";

type Student = { id: string; full_name: string };
type Row = {
  id: string; day_of_week: number; start_time: string; end_time: string; label: string | null;
  student: { full_name: string } | null;
};

export function ScheduleManager({ students, schedules }: { students: Student[]; schedules: Row[] }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <Panel title="Weekly shifts">
        {schedules.length === 0 ? <Empty>No shifts yet. Add one using the form.</Empty> : (
          <TableWrap>
            <thead><tr><th className="th">Student</th><th className="th">Day</th><th className="th">Time</th><th className="th"><span className="sr-only">Remove</span></th></tr></thead>
            <tbody className="divide-y divide-border">
              {schedules.map((s) => (
                <tr key={s.id}>
                  <td className="td font-medium">{s.student?.full_name}{s.label && <span className="block text-xs font-normal text-muted-foreground">{s.label}</span>}</td>
                  <td className="td">{DAYS[s.day_of_week]}</td>
                  <td className="td">{fmtClock(s.start_time)} to {fmtClock(s.end_time)}</td>
                  <td className="td text-right">
                    <ActionForm action={deleteSchedule} submit={<Trash2 size={16} />} buttonContainerClassName="" buttonClassName="btn btn-danger h-8 px-2" buttonAriaLabel="Remove shift">
                      <input type="hidden" name="id" value={s.id} />
                    </ActionForm>
                  </td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </Panel>

      <Panel title="Add a shift" description="Repeats every week.">
        <ActionForm action={addSchedule} submit="Add shift" className="space-y-4 p-5">
          <Field label="Student">
            <select className="input" name="student_id" required defaultValue="">
              <option value="" disabled>Choose a student</option>
              {students.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
            </select>
          </Field>
          <Field label="Day">
            <select className="input" name="day_of_week" defaultValue="1">
              {DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Starts"><input className="input" type="time" name="start_time" required /></Field>
            <Field label="Ends"><input className="input" type="time" name="end_time" required /></Field>
          </div>
          <Field label="Note"><input className="input" name="label" placeholder="Front desk" /></Field>
        </ActionForm>
      </Panel>
    </div>
  );
}
