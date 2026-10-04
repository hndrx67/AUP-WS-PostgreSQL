import Link from "next/link";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { TimeInOutKiosk } from "@/components/time-in-out-kiosk";

export const metadata = { title: "Time in / out" };

export default function TimeInOutPage() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/login" className="btn btn-outline">Staff sign in</Link>
        </div>
      </header>
      <TimeInOutKiosk />
    </div>
  );
}
