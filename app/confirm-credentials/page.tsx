import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { TemporaryCredentialsForm } from "@/components/temporary-credentials-form";
import { ThemeToggle } from "@/components/theme-toggle";
import { getSessionProfile, homeFor } from "@/lib/auth";

export const metadata = { title: "Confirm account details" };

export default async function ConfirmCredentialsPage() {
  const profile = await getSessionProfile();
  if (!profile?.is_active) redirect("/login");
  if (profile.role !== "supervisor" || !profile.temporary_credentials) redirect(homeFor(profile.role));

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <div className="absolute right-4 top-4"><ThemeToggle /></div>
      <section className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="mb-6"><Logo /></div>
        <p className="text-sm font-medium text-primary">Welcome, {profile.full_name}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Confirm your account details</h1>
        <p className="mb-6 mt-2 text-sm text-muted-foreground">
          An administrator created this account for you. You can update the email or choose a new password, or keep the provided credentials and continue.
        </p>
        <TemporaryCredentialsForm email={profile.email} />
      </section>
    </main>
  );
}
