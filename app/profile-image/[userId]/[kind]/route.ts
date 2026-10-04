import { readFile } from "node:fs/promises";
import { NextResponse, type NextRequest } from "next/server";
import { getSessionProfile } from "@/lib/auth";
import { query } from "@/lib/db";
import { isValidKioskAvatarToken, resolveProfileImage } from "@/lib/profile-storage";

export const runtime = "nodejs";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ userId: string; kind: string }> }) {
  const { userId, kind } = await params;
  if (!/^[a-f0-9-]{36}$/i.test(userId) || (kind !== "avatar" && kind !== "cover")) {
    return new NextResponse(null, { status: 404 });
  }

  const { rows } = await query<{ id: string; role: string; department_id: string | null; is_active: boolean; avatar_path: string | null; cover_path: string | null }>(
    "select id, role, department_id, is_active, avatar_path, cover_path from profiles where id = $1 limit 1",
    [userId],
  );
  const target = rows[0];
  if (!target?.is_active) return new NextResponse(null, { status: 404 });
  const filename = kind === "avatar" ? target.avatar_path : target.cover_path;
  if (typeof filename !== "string") return new NextResponse(null, { status: 404 });

  const expires = Number(_request.nextUrl.searchParams.get("expires"));
  const token = _request.nextUrl.searchParams.get("token") ?? "";
  const kioskAuthorized = kind === "avatar"
    && target.role === "student"
    && isValidKioskAvatarToken(target.id, filename, expires, token);

  if (!kioskAuthorized) {
    const viewer = await getSessionProfile();
    if (!viewer?.is_active) return new NextResponse(null, { status: 404 });
    const self = viewer.id === target.id;
    const sameDepartment = !!viewer.department_id && viewer.department_id === target.department_id;
    const memberView = ["student", "supervisor"].includes(viewer.role) && ["student", "supervisor"].includes(target.role);
    if (!self && viewer.role !== "admin" && !(sameDepartment && memberView)) return new NextResponse(null, { status: 404 });
  }

  const filePath = resolveProfileImage(filename);
  if (!filePath) return new NextResponse(null, { status: 404 });

  try {
    const image = await readFile(filePath);
    return new NextResponse(new Uint8Array(image), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
