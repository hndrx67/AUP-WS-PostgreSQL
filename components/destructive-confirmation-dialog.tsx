"use client";

import { useActionState, useEffect, useId, useRef } from "react";
import type { ActionState } from "@/lib/types";
import { showToast } from "@/lib/toast";

export function DestructiveConfirmationDialog({
  ids,
  fields = {},
  action,
  trigger,
  title = "Confirm deletion",
  description: customDescription,
  buttonClassName = "btn btn-danger",
  buttonAriaLabel,
}: {
  ids?: string[];
  fields?: Record<string, string>;
  action: (previous: ActionState, formData: FormData) => Promise<ActionState>;
  trigger: React.ReactNode;
  title?: string;
  description?: string;
  buttonClassName?: string;
  buttonAriaLabel?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const titleId = useId();
  const [state, formAction, pending] = useActionState(action, null);
  const selectedIds = ids ?? [];
  const description = customDescription ?? (selectedIds.length
    ? `This permanently deletes ${selectedIds.length === 1 ? "this time record" : `${selectedIds.length} time records`}. Enter your account password to continue.`
    : "This action permanently deletes this item. Enter your account password to continue.");

  useEffect(() => {
    if (state?.error) showToast(state.error, "error");
    if (state?.ok) {
      showToast(state.ok, "success");
      dialogRef.current?.close();
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <>
      <button type="button" className={buttonClassName} disabled={ids !== undefined && ids.length === 0} aria-label={buttonAriaLabel} onClick={() => dialogRef.current?.showModal()}>
        {trigger}
      </button>
      <dialog
        ref={dialogRef}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border border-border bg-card p-0 text-card-foreground shadow-xl backdrop:bg-black/35 backdrop:backdrop-blur-sm"
        aria-labelledby={titleId}
      >
        <div className="border-b border-border px-5 py-4">
          <h2 id={titleId} className="font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {description}
          </p>
        </div>
        <form ref={formRef} action={formAction} className="space-y-4 p-5">
          {selectedIds.map((id) => <input key={id} type="hidden" name="ids" value={id} />)}
          {Object.entries(fields).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
          <label className="block">
            <span className="label">Password</span>
            <input className="input" type="password" name="confirmation_password" autoComplete="current-password" required />
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-ghost" onClick={() => dialogRef.current?.close()}>Cancel</button>
            <button type="submit" className="btn btn-danger" disabled={pending}>{pending ? "Deleting..." : "Delete permanently"}</button>
          </div>
        </form>
      </dialog>
    </>
  );
}
