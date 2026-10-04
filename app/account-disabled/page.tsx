import { redirect } from "next/navigation";
import { signOut } from "@/app/actions/auth";
import { getSessionProfile } from "@/lib/auth";

export const metadata = { title: "Account disabled" };

export default async function AccountDisabledPage() {
  const profile = await getSessionProfile();
  if (!profile) redirect("/login");
  if (profile.is_active) redirect(`/${profile.role}`);

  return (
    <main className="grid min-h-screen place-items-center bg-background p-5">
      <section className="card w-full max-w-md p-7 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-danger/10 text-danger" aria-hidden="true">!</div>
        <h1 className="mt-4 text-xl font-semibold">Your account has been disabled</h1>
        <p className="mt-2 text-sm text-muted-foreground">Your supervisor has disabled your AUP Work Scholars account. Please contact your supervisor for help.</p>
        <form action={signOut} className="mt-6"><button className="btn btn-primary w-full">Sign out</button></form>
      </section>
    </main>
  );
}
