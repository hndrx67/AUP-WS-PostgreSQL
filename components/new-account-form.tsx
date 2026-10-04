"use client";

import { useState } from "react";
import { createUserAccount } from "@/app/actions/users";
import { ActionForm, Field } from "@/components/action-form";
import type { Department } from "@/lib/types";

export function NewAccountForm({ departments }: { departments: Department[] }) {
  const [role, setRole] = useState("student");

  return (
    <ActionForm action={createUserAccount} submit="Create account" className="space-y-4 p-5">
      <Field label="Role">
        <select className="input" name="role" value={role} onChange={(event) => setRole(event.target.value)}>
          <option value="student">Work scholar</option>
          <option value="supervisor">Supervisor</option>
          <option value="admin">Administrator</option>
        </select>
      </Field>
      {role === "supervisor" && (
        <label className="flex items-start gap-2 text-sm">
          <input className="mt-0.5 h-4 w-4 accent-primary" type="checkbox" name="temporary_credentials" value="true" />
          <span><span className="font-medium">Temporary Credentials</span><span className="mt-0.5 block text-xs text-muted-foreground">Require this supervisor to confirm, change, or accept these credentials at first sign-in.</span></span>
        </label>
      )}
      <Field label="Full name"><input className="input" name="full_name" required /></Field>
      <Field label="Email"><input className="input" type="email" name="email" required /></Field>
      <Field label="Temporary password"><input className="input" name="password" minLength={8} required autoComplete="off" /></Field>
      <Field label="Department (not used for administrators)">
        <select className="input" name="department_id" defaultValue="">
          <option value="">No department</option>
          {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Student ID"><input className="input" name="student_id" /></Field>
        <Field label="Rate per hour"><input className="input" type="number" name="hourly_rate" min={0} step="0.01" defaultValue={0} /></Field>
      </div>
      <Field label="Work assignment (students)"><input className="input" name="work_assignment" placeholder="e.g. Library assistant" /></Field>
    </ActionForm>
  );
}
