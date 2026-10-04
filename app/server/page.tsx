import { ServerStatusDashboard } from "@/components/server-status-dashboard";
import { getPublicServerStatus } from "@/lib/server-status";

export const metadata = { title: "Server status" };
export const dynamic = "force-dynamic";

export default async function ServerPage() {
  const status = await getPublicServerStatus();
  return <ServerStatusDashboard initialStatus={status} />;
}
