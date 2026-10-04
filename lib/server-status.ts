import "server-only";
import { transaction } from "@/lib/db";

const processStartedAt = new Date(Date.now() - process.uptime() * 1000);
const DOWNTIME_GAP_SECONDS = 120;

type Downtime = { id: string; started_at: Date | string; ended_at: Date | string; duration_seconds: number };

export type PublicServerStatus = {
  application: "operational" | "degraded";
  database: "connected" | "unavailable";
  uptimeSeconds: number;
  processStartedAt: string;
  checkedAt: string;
  runtime: string;
  downtimes: { id: string; startedAt: string; endedAt: string; durationSeconds: number }[];
  downtimeNote: string;
};

export async function getPublicServerStatus(): Promise<PublicServerStatus> {
  const checkedAt = new Date();
  try {
    const downtimes = await transaction(async (client) => {
      await client.query(
        `insert into server_monitor_state (singleton, last_check_at, process_started_at)
         values (true, $1, $2) on conflict (singleton) do nothing`,
        [checkedAt, processStartedAt],
      );
      const state = await client.query<{ last_check_at: Date | string }>(
        "select last_check_at from server_monitor_state where singleton = true for update",
      );
      const lastCheckAt = new Date(state.rows[0].last_check_at);
      const gapSeconds = Math.floor((checkedAt.getTime() - lastCheckAt.getTime()) / 1000);
      if (gapSeconds > DOWNTIME_GAP_SECONDS) {
        await client.query(
          "insert into server_downtimes (started_at, ended_at, duration_seconds) values ($1, $2, $3)",
          [lastCheckAt, checkedAt, gapSeconds],
        );
      }
      await client.query(
        "update server_monitor_state set last_check_at = $1, process_started_at = $2 where singleton = true",
        [checkedAt, processStartedAt],
      );
      const result = await client.query<Downtime>(
        "select id, started_at, ended_at, duration_seconds from server_downtimes order by detected_at desc limit 20",
      );
      return result.rows;
    });
    return {
      application: "operational",
      database: "connected",
      uptimeSeconds: Math.floor(process.uptime()),
      processStartedAt: processStartedAt.toISOString(),
      checkedAt: checkedAt.toISOString(),
      runtime: process.version,
      downtimes: downtimes.map((item) => ({
        id: item.id,
        startedAt: new Date(item.started_at).toISOString(),
        endedAt: new Date(item.ended_at).toISOString(),
        durationSeconds: item.duration_seconds,
      })),
      downtimeNote: "Downtime entries are estimated from gaps longer than two minutes between successful status checks.",
    };
  } catch {
    return {
      application: "degraded",
      database: "unavailable",
      uptimeSeconds: Math.floor(process.uptime()),
      processStartedAt: processStartedAt.toISOString(),
      checkedAt: checkedAt.toISOString(),
      runtime: process.version,
      downtimes: [],
      downtimeNote: "Downtime history is temporarily unavailable while the database connection is down.",
    };
  }
}
