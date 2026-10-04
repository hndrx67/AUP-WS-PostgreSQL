"use client";

import { useEffect, useState } from "react";
import { Activity, Clock3, Database, Server } from "lucide-react";
import { Badge, PageHeader, Panel, StatCard } from "@/components/ui";
import type { PublicServerStatus } from "@/lib/server-status";

function duration(seconds: number) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  return [days ? `${days}d` : "", hours ? `${hours}h` : "", minutes ? `${minutes}m` : "", `${remainingSeconds}s`].filter(Boolean).join(" ");
}

function dateTime(value: string) {
  return new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "medium", timeZone: "Asia/Manila" }).format(new Date(value));
}

export function ServerStatusDashboard({ initialStatus }: { initialStatus: PublicServerStatus }) {
  const [status, setStatus] = useState(initialStatus);
  const [reachable, setReachable] = useState(true);

  useEffect(() => {
    let alive = true;
    const refresh = async () => {
      try {
        const response = await fetch("/api/server/status", { cache: "no-store" });
        const data = await response.json() as PublicServerStatus;
        if (alive) {
          setStatus(data);
          setReachable(true);
        }
      } catch {
        if (alive) setReachable(false);
      }
    };
    const interval = window.setInterval(refresh, 30_000);
    return () => { alive = false; window.clearInterval(interval); };
  }, []);

  const operational = reachable && status.application === "operational";

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:py-12">
      <PageHeader title="Server status" description="Public service health, application instance uptime, and estimated downtime history." />

      <Panel className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div className="flex items-center gap-3">
            <span className={`grid h-11 w-11 place-items-center rounded-full ${operational ? "bg-success/15 text-success" : "bg-danger/15 text-danger"}`}><Activity size={22} /></span>
            <div><h2 className="font-semibold">{operational ? "All monitored systems operational" : reachable ? "Service degraded" : "Unable to reach the server"}</h2><p className="text-sm text-muted-foreground">Status automatically refreshes every 30 seconds.</p></div>
          </div>
          <Badge tone={operational ? "success" : "danger"}>{operational ? "Operational" : "Issue detected"}</Badge>
        </div>
      </Panel>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Instance uptime" value={duration(status.uptimeSeconds)} hint="Time since this application process started" icon={Clock3} />
        <StatCard label="Database" value={status.database === "connected" ? "Connected" : "Unavailable"} hint="PostgreSQL health check" icon={Database} />
        <StatCard label="Runtime" value={status.runtime} hint="Node.js runtime" icon={Server} />
      </div>

      <Panel title="Server information" className="mb-6">
        <dl className="grid gap-4 p-5 sm:grid-cols-2">
          <div><dt className="text-sm text-muted-foreground">Process started</dt><dd className="mt-1 font-medium">{dateTime(status.processStartedAt)}</dd></div>
          <div><dt className="text-sm text-muted-foreground">Last status check</dt><dd className="mt-1 font-medium">{dateTime(status.checkedAt)}</dd></div>
        </dl>
      </Panel>

      <Panel title="Downtime history" description={status.downtimeNote}>
        {status.downtimes.length === 0 ? <p className="p-5 text-sm text-muted-foreground">No downtime gaps have been recorded.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead><tr><th className="th">Estimated start</th><th className="th">Detected again</th><th className="th">Duration</th></tr></thead>
              <tbody className="divide-y divide-border">{status.downtimes.map((event) => (
                <tr key={event.id}><td className="td">{dateTime(event.startedAt)}</td><td className="td">{dateTime(event.endedAt)}</td><td className="td">{duration(event.durationSeconds)}</td></tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </Panel>
      <p className="mt-4 text-center text-xs text-muted-foreground">Times shown in Philippine Standard Time (Asia/Manila).</p>
    </div>
  );
}
