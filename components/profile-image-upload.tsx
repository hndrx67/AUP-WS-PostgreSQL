"use client";

import { useActionState, useEffect, useRef } from "react";
import { uploadProfileImage } from "@/app/actions/profile";
import { showToast } from "@/lib/toast";

export function ProfileImageUpload({
  kind,
  label,
  className,
}: {
  kind: "avatar" | "cover";
  label: string;
  className?: string;
}) {
  const [state, formAction, pending] = useActionState(uploadProfileImage, null);
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state?.error) showToast(state.error, "error");
    if (state?.ok) showToast(state.ok, "success");
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className={className}>
      <input type="hidden" name="kind" value={kind} />
      <input
        ref={inputRef}
        className="sr-only"
        type="file"
        name="image"
        accept="image/jpeg,image/png,image/webp"
        aria-label={kind === "avatar" ? "Choose profile photo" : "Choose cover photo"}
        onChange={() => {
          if (inputRef.current?.files?.length) formRef.current?.requestSubmit();
        }}
      />
      <button
        type="button"
        className="btn btn-primary"
        disabled={pending}
        onClick={() => inputRef.current?.click()}
      >
        {pending ? "Uploading..." : label}
      </button>
    </form>
  );
}
