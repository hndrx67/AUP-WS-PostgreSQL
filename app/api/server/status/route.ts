import { getPublicServerStatus } from "@/lib/server-status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const status = await getPublicServerStatus();
  return Response.json(status, {
    headers: { "Cache-Control": "no-store, max-age=0" },
    status: status.application === "operational" ? 200 : 503,
  });
}
