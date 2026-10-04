import Image from "next/image";
import type { Profile } from "@/lib/types";

export function ProfileAvatar({ profile, size = "md", className = "", imageUrl }: {
  profile: Pick<Profile, "id" | "full_name" | "avatar_path">;
  size?: "sm" | "md" | "lg";
  className?: string;
  imageUrl?: string | null;
}) {
  const dimensions = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-32 w-32 text-3xl",
  }[size];
  const initials = profile.full_name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase();
  const photoUrl = imageUrl ?? (profile.avatar_path ? `/profile-image/${profile.id}/avatar?rev=${encodeURIComponent(profile.avatar_path)}` : null);

  return (
    <span className={`relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full bg-accent font-semibold text-accent-foreground ${dimensions} ${className}`}>
      {photoUrl ? (
        <Image
          src={photoUrl}
          alt={`${profile.full_name}'s profile photo`}
          fill
          unoptimized
          sizes={size === "lg" ? "128px" : size === "md" ? "40px" : "32px"}
          className="object-cover"
        />
      ) : initials}
    </span>
  );
}
