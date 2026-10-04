"use server";

import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { revalidatePath } from "next/cache";
import { currentSessionTokenHash, getSessionProfile } from "@/lib/auth";
import { hashPassword } from "@/lib/auth/password";
import { query, transaction } from "@/lib/db";
import { profileUploadDirectory, resolveProfileImage } from "@/lib/profile-storage";
import type { ActionState } from "@/lib/types";

export async function updateMyProfile(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const me = await getSessionProfile();
  if (!me?.is_active) return { error: "Sign in to edit your profile." };

  const fullName = String(fd.get("full_name") ?? "").trim();
  const bio = String(fd.get("bio") ?? "").trim();
  if (fullName.length < 2 || fullName.length > 80) return { error: "Name must be between 2 and 80 characters." };
  if (bio.length > 240) return { error: "Bio must be 240 characters or fewer." };

  try {
    await query("update profiles set full_name = $2, bio = $3 where id = $1", [me.id, fullName, bio]);
  } catch {
    return { error: "Could not save your profile. Please try again." };
  }

  revalidatePath("/profile");
  revalidatePath("/", "layout");
  return { ok: "Profile updated." };
}

export async function changeMyPassword(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const me = await getSessionProfile();
  if (!me?.is_active) return { error: "Sign in to change your password." };
  const password = String(fd.get("password") ?? "");
  const confirmation = String(fd.get("password_confirmation") ?? "");
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  if (password !== confirmation) return { error: "The passwords do not match." };

  const passwordHash = await hashPassword(password);
  const currentTokenHash = await currentSessionTokenHash();
  if (!currentTokenHash) return { error: "Your session expired. Sign in and try again." };
  try {
    await transaction(async (client) => {
      await client.query("update profiles set password_hash = $2 where id = $1", [me.id, passwordHash]);
      await client.query("delete from sessions where profile_id = $1 and token_hash <> $2", [me.id, currentTokenHash]);
    });
  } catch {
    return { error: "Could not update your password. Please try again." };
  }
  return { ok: "Password changed successfully." };
}

export async function uploadProfileImage(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const me = await getSessionProfile();
  if (!me?.is_active) return { error: "Sign in to edit your profile." };

  const kind = String(fd.get("kind") ?? "");
  if (kind !== "avatar" && kind !== "cover") return { error: "Choose a profile or cover photo." };
  const upload = fd.get("image");
  if (!upload || typeof upload === "string" || upload.size === 0) return { error: "Choose an image to upload." };
  if (upload.size > 10 * 1024 * 1024) return { error: "Images must be 10 MB or smaller." };
  if (!["image/jpeg", "image/png", "image/webp"].includes(upload.type)) {
    return { error: "Upload a JPG, PNG, or WebP image." };
  }

  const oldPath = kind === "avatar" ? me.avatar_path : me.cover_path;
  const filename = `${randomUUID()}.webp`;
  const destination = resolveProfileImage(filename);
  if (!destination) return { error: "Could not prepare the image." };

  try {
    const input = Buffer.from(await upload.arrayBuffer());
    const processor = sharp(input, { limitInputPixels: 40_000_000 }).rotate();
    const metadata = await processor.metadata();
    if (!["jpeg", "png", "webp"].includes(metadata.format ?? "")) {
      return { error: "The selected file is not a supported image." };
    }
    const output = await processor
      .resize(kind === "avatar" ? 512 : 1600, kind === "avatar" ? 512 : 640, { fit: "cover", position: "attention", withoutEnlargement: true })
      .webp({ quality: 82, effort: 4 })
      .toBuffer();

    await mkdir(profileUploadDirectory(), { recursive: true });
    await writeFile(destination, output, { flag: "wx" });

    const field = kind === "avatar" ? "avatar_path" : "cover_path";
    try {
      await query(`update profiles set ${field} = $2 where id = $1`, [me.id, filename]);
    } catch {
      await unlink(destination).catch(() => undefined);
      return { error: "Could not save your photo. Please try again." };
    }

    if (oldPath) {
      const oldFile = resolveProfileImage(path.basename(oldPath));
      if (oldFile) await unlink(oldFile).catch(() => undefined);
    }
  } catch {
    return { error: "Could not process this image. Try another JPG, PNG, or WebP file." };
  }

  revalidatePath("/profile");
  revalidatePath("/", "layout");
  return { ok: kind === "avatar" ? "Profile photo updated." : "Cover photo updated." };
}

export async function removeMyProfileImage(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const me = await getSessionProfile();
  if (!me?.is_active) return { error: "Sign in to edit your profile." };
  if (String(fd.get("kind") ?? "") !== "avatar") return { error: "Only profile photos can be removed here." };
  if (!me.avatar_path) return { error: "You do not have a custom profile photo." };

  try {
    const result = await query(
      "update profiles set avatar_path = null where id = $1 and avatar_path = $2",
      [me.id, me.avatar_path],
    );
    if (!result.rowCount) return { error: "Your profile photo has already changed. Refresh and try again." };

    const oldFile = resolveProfileImage(path.basename(me.avatar_path));
    if (oldFile) await unlink(oldFile).catch(() => undefined);
  } catch {
    return { error: "Could not remove your profile photo. Please try again." };
  }

  revalidatePath("/profile");
  revalidatePath("/", "layout");
  return { ok: "Profile photo removed." };
}
