import { LogIn, LogOut } from "lucide-react";
import { clockIn, clockOut } from "@/app/actions/time";
import { ActionForm } from "@/components/action-form";
import { fmtTime } from "@/lib/format";
import { Elapsed } from "./elapsed";

export function ClockCard({ openSince }: { openSince: string | null }) {
  return (
    <section className="card flex flex-wrap items-center justify-between gap-4 p-5">
      <div>
        <p className="text-sm text-muted-foreground">{openSince ? "You are clocked in" : "You are clocked out"}</p>
        {openSince ? (
          <>
            <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight"><Elapsed since={openSince} /></p>
            <p className="mt-1 text-xs text-muted-foreground">Since {fmtTime(openSince)}</p>
          </>
        ) : (
          <p className="mt-1 text-lg font-medium">Ready when you are</p>
        )}
      </div>
      {openSince ? (
        <ActionForm action={clockOut} submit={<><LogOut size={18} />Time out</>} buttonContainerClassName="" buttonClassName="btn btn-primary px-5 py-2.5" className="m-0" />
      ) : (
        <ActionForm action={clockIn} submit={<><LogIn size={18} />Time in</>} buttonContainerClassName="" buttonClassName="btn btn-primary px-5 py-2.5" className="m-0" />
      )}
    </section>
  );
}
