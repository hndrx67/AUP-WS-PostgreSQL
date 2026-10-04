"use client";

import { useActionState, useEffect, useRef } from "react";
import type { ActionState } from "@/lib/types";
import { showToast } from "@/lib/toast";

export function ActionForm({
  action,
  submit,
  children,
  className,
  resetOnSuccess = true,
  buttonClassName,
  buttonContainerClassName,
  buttonAriaLabel,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  submit: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  buttonClassName?: string;
  buttonContainerClassName?: string;
  buttonAriaLabel?: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.error) showToast(state.error, "error");
    if (state?.ok) showToast(state.ok, "success");
    if (state?.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);

  return (
    <form ref={ref} action={formAction} className={className}>
      {children}
      <div className={buttonContainerClassName ?? "flex flex-wrap items-center gap-3"}>
        <button type="submit" className={buttonClassName ?? "btn btn-primary"} aria-label={buttonAriaLabel} disabled={pending}>
          {pending ? "Working..." : submit}
        </button>
      </div>
    </form>
  );
}

export function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={className}>
      <span className="label">{label}</span>
      {children}
    </label>
  );
}
