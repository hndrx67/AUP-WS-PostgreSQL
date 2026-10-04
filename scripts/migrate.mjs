import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";

if (!process.env.DATABASE_URL) throw new Error("Set DATABASE_URL in .env.local before running migrations.");

const here = dirname(fileURLToPath(import.meta.url));
const schema = await readFile(resolve(here, "../database/schema.sql"), "utf8");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const client = await pool.connect();
const requiredTables = ["departments", "profiles", "sessions", "time_logs", "schedules", "payouts", "wallet_transfers"];
try {
  await client.query("BEGIN");
  const existing = await client.query(
    "SELECT required.name, to_regclass('public.' || required.name) IS NOT NULL AS present FROM unnest($1::text[]) AS required(name)",
    [requiredTables],
  );
  const present = existing.rows.filter((row) => row.present).length;
  if (present > 0 && present < requiredTables.length) {
    throw new Error(`Found a partial AUP Work Scholars schema (${present}/${requiredTables.length} expected tables). Inspect or restore this database before migrating.`);
  }

  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  const applied = await client.query("SELECT 1 FROM schema_migrations WHERE version = '001_initial' LIMIT 1");
  if (applied.rowCount) {
    await client.query("COMMIT");
    console.log("Initial PostgreSQL schema is already applied; nothing to do.");
  } else if (present === requiredTables.length) {
    // The first schema was installed before the migration ledger existed.
    await client.query("INSERT INTO schema_migrations (version) VALUES ('001_initial') ON CONFLICT DO NOTHING");
    await client.query("COMMIT");
    console.log("Existing initial schema found and recorded; nothing to change.");
  } else {
    await client.query(schema);
    await client.query("INSERT INTO schema_migrations (version) VALUES ('001_initial')");
    await client.query("COMMIT");
    console.log("PostgreSQL schema installed successfully.");
  }
} catch (error) {
  await client.query("ROLLBACK").catch(() => undefined);
  throw error;
} finally {
  client.release();
  await pool.end();
}
