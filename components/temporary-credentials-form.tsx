"use client";

import { useActionState, useEffect } from "react";
import { confirmTemporarySupervisorCredentials } from "@/app/actions/users";
import { Field } from "@/components/action-form";
import { showToast } from "@/lib/toast";
import type { ActionState } from "@/lib/types";

export function TemporaryCredentialsForm({ email }: { email: string }) {
  const [state, formAction, pending] = useActionState(confirmTemporarySupervisorCredentials, null as ActionState);

  useEffect(() => {
    if (state?.error) showToast(state.error, "error");
  }, [state]);

  return (
    <form action={formAction} className="space-y-4">
      <Field label="Account email">
        <input className="input" type="email" name="email" defaultValue={email} autoComplete="email" />
      </Field>
      <Field label="New password (optional)">
        <input className="input" type="password" name="password" minLength={8} autoComplete="new-password" />
      </Field>
      <Field label="Confirm new password">
        <input className="input" type="password" name="password_confirmation" autoComplete="new-password" />
      </Field>
      <button type="submit" name="mode" value="update" className="btn btn-primary w-full" disabled={pending}>
        {pending ? "Saving..." : "Save details and continue"}
      </button>
      <div className="relative py-1 text-center text-xs text-muted-foreground"><span className="bg-card px-2">or</span><span className="absolute inset-x-0 top-1/2 -z-10 border-t border-border" /></div>
      <button type="submit" name="mode" value="accept" className="btn btn-outline w-full" disabled={pending}>
        Keep the credentials provided by the administrator
      </button>
    </form>
  );
}
