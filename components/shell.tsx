import { LogOut } from "lucide-react";
import Link from "next/link";
import { signOut } from "@/app/actions/auth";
import { NAV, ROLE_LABEL } from "@/lib/nav";
import type { ProfileWithDept } from "@/lib/types";
import { Logo } from "./logo";
import { Sidebar } from "./sidebar";
import { ThemeToggle } from "./theme-toggle";
import { ProfileAvatar } from "./profile-avatar";

export function Shell({ profile, children }: { profile: ProfileWithDept; children: React.ReactNode }) {
  const nav = NAV[profile.role];
  return (
    <div className="min-h-screen md:flex">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-card md:flex">
        <div className="p-5"><Logo /></div>
        <Sidebar items={nav} />
        <div className="mt-auto border-t border-border p-4">
          <Link href="/profile" className="mb-3 flex items-center gap-3 rounded-lg p-1 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            <ProfileAvatar profile={profile} size="sm" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{profile.full_name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {ROLE_LABEL[profile.role]}{profile.department ? `, ${profile.department.name}` : ""}
              </p>
            </div>
          </Link>
          <form action={signOut}>
            <button className="btn btn-ghost w-full justify-start"><LogOut size={18} />Sign out</button>
          </form>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between gap-3 border-b border-border bg-background/85 px-4 backdrop-blur md:px-8">
          <div className="md:hidden"><Logo compact /></div>
          <p className="hidden text-sm text-muted-foreground md:block">
            {ROLE_LABEL[profile.role]}
            {profile.department ? ` in ${profile.department.name}` : ""}
          </p>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Link href="/profile" className="md:hidden" aria-label="Open profile"><ProfileAvatar profile={profile} size="sm" /></Link>
            <form action={signOut} className="md:hidden">
              <button className="btn btn-ghost h-9 w-9 p-0" aria-label="Sign out"><LogOut size={18} /></button>
            </form>
          </div>
        </header>
        <div className="border-b border-border md:hidden"><Sidebar items={nav} horizontal /></div>
        <main className="mx-auto w-full max-w-6xl p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
