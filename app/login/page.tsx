import { redirect } from "next/navigation";
import { getSessionProfile, homeFor } from "@/lib/auth";
import { signIn } from "@/app/actions/auth";
import { ActionForm, Field } from "@/components/action-form";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata = { title: "Sign in" };

export default async function LoginPage() {
  const profile = await getSessionProfile();
  if (profile?.is_active) redirect(homeFor(profile.role));

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="absolute right-4 top-4"><ThemeToggle /></div>
      <div className="w-full max-w-sm">
        <div className="mb-8"><Logo /></div>
        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="mb-6 mt-1 text-sm text-muted-foreground">Use the email and password given to you by your supervisor.</p>
        <ActionForm action={signIn} submit="Sign in" className="space-y-4" resetOnSuccess={false}>
          <Field label="Email"><input className="input" name="email" type="email" autoComplete="email" required /></Field>
          <Field label="Password"><input className="input" name="password" type="password" autoComplete="current-password" required /></Field>
        </ActionForm>
      </div>
    </div>
  );
}
