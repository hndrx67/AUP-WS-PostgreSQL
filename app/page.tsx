import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, Clock, Wallet } from "lucide-react";
import { getSessionProfile, homeFor } from "@/lib/auth";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function Home() {
  const profile = await getSessionProfile();
  if (profile?.is_active) redirect(homeFor(profile.role));

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
        <Logo />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/login" className="btn btn-primary">Sign in</Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 pb-20 pt-16 md:pt-24">
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight md:text-5xl">
          Your work scholar hours, schedule and pay in one place.
        </h1>
        <p className="mt-5 max-w-xl text-lg text-muted-foreground">
          Clock in and out, check your shifts on the calendar, and see exactly what you have earned and what is still owed to you.
        </p>
        <div className="mt-8 flex gap-3">
          <Link href="/login" className="btn btn-primary px-5 py-2.5">Sign in to your account</Link>
          <Link href="/time-in-out" className="btn btn-outline px-5 py-2.5">Work scholar time clock</Link>
        </div>

        <div className="mt-16 grid gap-4 md:grid-cols-3">
          {[
            { icon: Clock, title: "Time records", text: "Every time in and time out is saved the moment you record it." },
            { icon: CalendarDays, title: "Work calendar", text: "See your weekly shifts next to the hours you actually worked." },
            { icon: Wallet, title: "Earnings and balance", text: "Track what you have earned, what was paid, and what remains." },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="card p-5">
              <Icon size={20} className="text-primary" />
              <h2 className="mt-3 font-semibold">{title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>
        <p className="mt-10 text-sm text-muted-foreground">
          Accounts are created by your department supervisor or an administrator.
        </p>
      </main>
    </div>
  );
}
