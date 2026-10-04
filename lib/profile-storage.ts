import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import path from "node:path";

export function profileUploadDirectory() {
  return process.env.PROFILE_UPLOAD_DIR || path.join(process.cwd(), "data", "profile-uploads");
}

export function resolveProfileImage(filename: string) {
  if (!/^[a-f0-9-]{36}\.webp$/i.test(filename)) return null;
  return path.join(profileUploadDirectory(), filename);
}

function kioskImageSignature(userId: string, filename: string, expires: number) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not configured.");
  return createHmac("sha256", secret).update(`${userId}:avatar:${filename}:${expires}`).digest("base64url");
}

export function createKioskAvatarToken(userId: string, filename: string) {
  const expires = Math.floor(Date.now() / 1000) + 300;
  return { expires, token: kioskImageSignature(userId, filename, expires) };
}

export function isValidKioskAvatarToken(userId: string, filename: string, expires: number, token: string) {
  if (!Number.isInteger(expires) || expires < Math.floor(Date.now() / 1000) || expires > Math.floor(Date.now() / 1000) + 300) return false;
  const expected = Buffer.from(kioskImageSignature(userId, filename, expires));
  const received = Buffer.from(token);
  return expected.length === received.length && timingSafeEqual(expected, received);
}
