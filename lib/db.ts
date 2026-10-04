import "server-only";
import { Pool, types, type PoolClient, type QueryResultRow } from "pg";

// Keep PostgreSQL timestamptz values as ISO strings, matching the app's data types.
types.setTypeParser(1184, (value) => value);

const globalForPg = globalThis as typeof globalThis & { aupPgPool?: Pool };

export function getPool() {
  if (!globalForPg.aupPgPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL is required to connect to PostgreSQL.");
    globalForPg.aupPgPool = new Pool({
      connectionString,
      max: Number(process.env.DB_POOL_MAX ?? 10),
      connectionTimeoutMillis: 10_000,
      idleTimeoutMillis: 30_000,
      application_name: "aup-work-scholars",
    });
    globalForPg.aupPgPool.on("error", (error) => console.error("Unexpected PostgreSQL pool error", error));
  }
  return globalForPg.aupPgPool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(text: string, values: unknown[] = []) {
  return getPool().query<T>(text, values);
}

export async function transaction<T>(run: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await run(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
