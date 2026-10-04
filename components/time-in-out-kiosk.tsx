"use client";

import { useActionState, useEffect, useRef } from "react";
import { CheckCircle2, Clock3, CreditCard, LogIn, LogOut, ScanLine } from "lucide-react";
import { toggleKioskTime, type KioskState } from "@/app/actions/kiosk";
import { ProfileAvatar } from "@/components/profile-avatar";
import { fmtDateTime } from "@/lib/format";
import { showToast } from "@/lib/toast";

export function TimeInOutKiosk() {
  const [state, formAction, pending] = useActionState<KioskState, FormData>(toggleKioskTime, null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    if (state?.error) showToast(state.error, "error");
    if (state?.result) {
      const actionText = state.result.action === "clocked_in" ? "timed in" : "timed out";
      showToast(`${state.result.studentName} ${actionText}.`, "success");
    }
  }, [state]);

  const result = state?.result;
  const clockedIn = result?.action === "clocked_in";

  return (
    <main className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl content-center gap-6 px-4 py-8 sm:px-6 lg:grid-cols-2 lg:gap-8">
      <section className="card flex flex-col justify-center p-6 sm:p-8">
        <div className="mb-7 flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-accent-foreground">
          <ScanLine size={24} />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Work scholar time clock</h1>
        <p className="mt-2 text-sm text-muted-foreground">Enter your student ID or tap your RFID card on the scanner.</p>

        <form action={formAction} className="mt-7 space-y-4">
          <label className="block">
            <span className="label">Student ID or RFID card</span>
            <span className="relative block">
              <CreditCard className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <input
                ref={inputRef}
                className="input pl-10 text-lg"
                name="student_id"
                type="text"
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                aria-label="Student ID or RFID card"
                placeholder="Enter or scan your ID"
                maxLength={100}
                required
                disabled={pending}
              />
            </span>
          </label>
          <button className="btn btn-primary min-h-12 w-full text-base" disabled={pending}>
            {pending ? "Recording..." : "Record time in / out"}
          </button>
          <p className="text-center text-xs text-muted-foreground">RFID scanners that act like a keyboard can scan directly into this field.</p>
        </form>
      </section>

      <section className="card flex flex-col justify-center p-6 sm:p-8" aria-live="polite">
        {result ? (
          <>
            <div className="mb-6 flex items-center gap-4">
              <ProfileAvatar
                profile={{ id: result.studentProfileId, full_name: result.studentName, avatar_path: null }}
                imageUrl={result.avatarUrl}
                size="lg"
                className="h-24 w-24 border-4 border-background text-2xl shadow-md"
              />
              <div className={`flex h-14 w-14 items-center justify-center rounded-full ${clockedIn ? "bg-success/10 text-success" : "bg-primary/10 text-primary"}`}>
                {clockedIn ? <LogIn size={27} /> : <LogOut size={27} />}
              </div>
            </div>
            <p className="text-sm font-medium text-muted-foreground">Time {clockedIn ? "in" : "out"} recorded</p>
            <h2 className="mt-1 text-2xl font-semibold">{result.studentName}</h2>
            <p className="mt-1 text-sm text-muted-foreground">Student ID: {result.studentNumber}</p>
            <div className="mt-6 rounded-xl bg-muted p-4">
              <p className={`flex items-center gap-2 font-semibold ${clockedIn ? "text-success" : "text-foreground"}`}>
                <CheckCircle2 size={18} /> {clockedIn ? "You are now clocked in" : "You are now clocked out"}
              </p>
              <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <Clock3 size={16} /> {fmtDateTime(clockedIn ? result.timeIn : result.timeOut ?? result.timeIn)}
              </p>
              {!clockedIn && <p className="mt-1 pl-6 text-xs text-muted-foreground">Shift started {fmtDateTime(result.timeIn)}</p>}
            </div>
            <p className="mt-5 text-sm text-muted-foreground">Ready for the next work scholar.</p>
          </>
        ) : (
          <div className="py-8 text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground"><Clock3 size={26} /></div>
            <h2 className="text-xl font-semibold">Time record status</h2>
            <p className="mt-2 text-sm text-muted-foreground">After a valid ID is entered or scanned, the recorded time and current status will appear here.</p>
          </div>
        )}
      </section>
    </main>
  );
}
