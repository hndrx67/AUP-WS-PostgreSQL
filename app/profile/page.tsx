import Image from "next/image";
import { redirect } from "next/navigation";
import { ActionForm, Field } from "@/components/action-form";
import { ProfileAvatar } from "@/components/profile-avatar";
import { ProfileImageUpload } from "@/components/profile-image-upload";
import { ChangeCredentialsDialog } from "@/components/change-credentials-dialog";
import { Shell } from "@/components/shell";
import { PageHeader, Panel } from "@/components/ui";
import { updateMyProfile } from "@/app/actions/profile";
import { ROLE_LABEL } from "@/lib/nav";
import { getSessionProfile } from "@/lib/auth";

export const metadata = { title: "My profile" };

export default async function ProfilePage() {
  const profile = await getSessionProfile();
  if (!profile?.is_active) redirect("/login");

  return (
    <Shell profile={profile}>
      <PageHeader
        title="My profile"
        description="Personalize how your account appears in AUP Work Scholars."
        actions={profile.role !== "admin" ? <ChangeCredentialsDialog scope="self" /> : undefined}
      />

      <section className="card overflow-hidden">
        <div className="relative h-44 bg-gradient-to-br from-primary/80 via-accent to-muted sm:h-60">
          {profile.cover_path && (
            <Image
              src={`/profile-image/${profile.id}/cover?rev=${encodeURIComponent(profile.cover_path)}`}
              alt="Profile cover photo"
              fill
              unoptimized
              sizes="(max-width: 768px) 100vw, 1152px"
              className="object-cover"
            />
          )}
          <div className="absolute right-3 top-3">
            <ProfileImageUpload kind="cover" label="Change cover photo" className="rounded-lg bg-card/95 p-2 shadow-sm" />
          </div>
        </div>

        <div className="flex flex-col gap-4 px-5 pb-6 sm:flex-row sm:items-end sm:px-8">
          <div className="-mt-12 flex shrink-0 items-end gap-3 sm:-mt-16">
            <ProfileAvatar profile={profile} size="lg" className="border-4 border-card shadow-md" />
          </div>
          <div className="min-w-0 pb-1">
            <h1 className="truncate text-2xl font-semibold tracking-tight">{profile.full_name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {ROLE_LABEL[profile.role]}{profile.department ? ` · ${profile.department.name}` : ""}
            </p>
            {profile.bio && <p className="mt-3 max-w-2xl whitespace-pre-wrap text-sm">{profile.bio}</p>}
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Edit profile" description="Your name and bio appear alongside your profile photo throughout the app.">
          <ActionForm action={updateMyProfile} submit="Save profile" className="space-y-4 p-5">
            <Field label="Name"><input className="input" name="full_name" defaultValue={profile.full_name} maxLength={80} required /></Field>
            <Field label="Bio"><textarea className="input min-h-28 resize-y" name="bio" defaultValue={profile.bio ?? ""} maxLength={240} placeholder="A little about you" /></Field>
          </ActionForm>
        </Panel>

        <Panel title="Profile photo" description="Upload a JPG, PNG, or WebP image. Images are converted to WebP and saved on the app server.">
          <div className="flex items-center gap-4 p-5">
            <ProfileAvatar profile={profile} size="md" />
            <ProfileImageUpload kind="avatar" label="Upload photo" />
          </div>
        </Panel>
      </div>
    </Shell>
  );
}
