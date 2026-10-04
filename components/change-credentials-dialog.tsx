"use client";

import { useActionState, useEffect, useRef } from "react";
import { changeMyPassword } from "@/app/actions/profile";
import { updateAccountCredentials } from "@/app/actions/users";
import { showToast } from "@/lib/toast";
import type { ActionState } from "@/lib/types";

type CredentialAction = (prev: ActionState, fd: FormData) => Promise<ActionState>;

export function ChangeCredentialsDialog({
  scope,
  userId,
  currentEmail,
}: {
  scope: "self" | "admin";
  userId?: string;
  currentEmail?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const action: CredentialAction = scope === "self" ? changeMyPassword : updateAccountCredentials;
  const [state, formAction, pending] = useActionState(action, null);
  const isAdmin = scope === "admin";

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
      <button type="button" className="btn btn-outline" onClick={() => dialogRef.current?.showModal()}>
        Change credentials
      </button>
      <dialog
        ref={dialogRef}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border border-border bg-card p-0 text-card-foreground shadow-xl backdrop:bg-black/60"
        aria-labelledby={`credentials-title-${userId ?? "self"}`}
      >
        <div className="border-b border-border px-5 py-4">
          <h2 id={`credentials-title-${userId ?? "self"}`} className="font-semibold">Change Credentials</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {isAdmin
              ? `Update the assigned email or set a new password${currentEmail ? ` for ${currentEmail}` : ""}.`
              : "Change your password. Your assigned email address cannot be changed here."}
          </p>
        </div>
        <form ref={formRef} action={formAction} className="space-y-4 p-5">
          {isAdmin ? (
            <>
              <input type="hidden" name="user_id" value={userId ?? ""} />
              <label className="block">
                <span className="label">New assigned email <span className="font-normal text-muted-foreground">(optional)</span></span>
                <input className="input" type="email" name="email" autoComplete="off" placeholder={currentEmail || "name@example.com"} />
              </label>
            </>
          ) : null}
          <label className="block">
            <span className="label">{isAdmin ? "New password (optional)" : "New password"}</span>
            <input className="input" type="password" name="password" minLength={isAdmin ? undefined : 8} autoComplete="new-password" required={!isAdmin} />
            {!isAdmin && <span className="mt-1 block text-xs text-muted-foreground">Use at least 8 characters.</span>}
          </label>
          <label className="block">
            <span className="label">Confirm new password{isAdmin ? " (required when changing password)" : ""}</span>
            <input className="input" type="password" name="password_confirmation" autoComplete="new-password" required={!isAdmin} />
          </label>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" className="btn btn-ghost" onClick={() => dialogRef.current?.close()}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={pending}>{pending ? "Saving..." : "Save credentials"}</button>
          </div>
        </form>
      </dialog>
    </>
  );
}
