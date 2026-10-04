import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";

if (!process.env.DATABASE_URL) throw new Error("Set DATABASE_URL in .env.local before running migrations.");

const here = dirname(fileURLToPath(import.meta.url));
const schema = await readFile(resolve(here, "../database/schema.sql"), "utf8");
const migrations = [
  { version: "002_rfid", file: "../database/migrations/002_rfid.sql" },
  { version: "003_temporary_supervisor_credentials", file: "../database/migrations/003_temporary_supervisor_credentials.sql" },
];
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
  const initialApplied = await client.query("SELECT 1 FROM schema_migrations WHERE version = '001_initial' LIMIT 1");
  if (!initialApplied.rowCount && present === requiredTables.length) {
    // The first schema was installed before the migration ledger existed.
    await client.query("INSERT INTO schema_migrations (version) VALUES ('001_initial') ON CONFLICT DO NOTHING");
  } else if (!initialApplied.rowCount && present === 0) {
    await client.query(schema);
    await client.query("INSERT INTO schema_migrations (version) VALUES ('001_initial')");
  }

  const appliedMigrations = [];
  for (const migration of migrations) {
    const applied = await client.query("SELECT 1 FROM schema_migrations WHERE version = $1 LIMIT 1", [migration.version]);
    if (applied.rowCount) continue;
    const sql = await readFile(resolve(here, migration.file), "utf8");
    await client.query(sql);
    await client.query("INSERT INTO schema_migrations (version) VALUES ($1)", [migration.version]);
    appliedMigrations.push(migration.version);
  }

  await client.query("COMMIT");
  if (appliedMigrations.length) console.log(`PostgreSQL migrations applied: ${appliedMigrations.join(", ")}.`);
  else console.log("PostgreSQL schema is up to date; nothing to do.");
} catch (error) {
  await client.query("ROLLBACK").catch(() => undefined);
  throw error;
} finally {
  client.release();
  await pool.end();
}
