import { requireRole } from "@/lib/auth";
import { Shell } from "@/components/shell";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole("student");
  return <Shell profile={profile}>{children}</Shell>;
}
