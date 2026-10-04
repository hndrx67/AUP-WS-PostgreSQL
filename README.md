# AUP Work Scholars - PGSQL ver 1.3

Next.js 15, React 19, TypeScript, Tailwind CSS, and PostgreSQL. Supabase is no longer part of the runtime or authentication flow. The app owns password hashing and cookie sessions; PostgreSQL stores app accounts, sessions, departments, schedules, time logs, and financial records.

## Fresh PostgreSQL setup (Windows)

1. Install PostgreSQL for Windows. In pgAdmin or `psql` as the PostgreSQL administrator, create a dedicated app role and empty database (replace the example password):

   ```sql
   CREATE ROLE aupws_app LOGIN PASSWORD 'use-a-long-unique-password';
   CREATE DATABASE aup_work_scholars OWNER aupws_app;
   ```

   Keep PostgreSQL bound to localhost; expose the Next.js web server through the Cloudflare Tunnel, never the database port.
2. Copy `.env.example` to `.env.local`, set `DATABASE_URL` to the local app role connection string, and set `SESSION_SECRET` to a random secret of at least 32 bytes. Set `PROFILE_UPLOAD_DIR` to persistent writable storage on the web server.
3. Install packages and apply the fresh schema once:

   ```powershell
   npm install
   npm run db:migrate
   ```

   This applies [`database/schema.sql`](database/schema.sql) and any pending files in `database/migrations/` inside a transaction. The command records applied versions in `schema_migrations`, so rerunning it is safe. If it detects a partial schema, it stops for inspection instead of trying to recreate tables. Run `npm run db:migrate` after deploying schema updates.
4. Create the first administrator:

   ```powershell
   npm run create-admin
   ```

   The command prompts for the first administrator name, email, and password (minimum 12 characters). Additional users are created inside the app.

5. Start locally with `npm run dev`, or build and run for production with `npm run build` and `npm start`.

The initial schema is intentionally fresh: previous Supabase users and records are not imported. Keep a backup of the existing Supabase project separately if it may be needed later. Back up this PostgreSQL database regularly with `pg_dump`; also back up the profile upload directory.

## App behavior

- `lib/db.ts` owns the server-only PostgreSQL pool. `lib/auth.ts` uses salted scrypt password hashes and opaque, hashed session tokens stored in PostgreSQL.
- Server actions verify the active account and role before changing data. Supervisor reads are constrained to their assigned department.
- The `/time-in-out` kiosk accepts a student ID or keyboard-emulating RFID scan, toggles time-in/time-out, and shows the student's profile photo when available.
- Administrators can assign RFID codes to all students; supervisors can assign codes to students in their department. Student IDs and RFID codes are unique and either identifier can be scanned at the kiosk.
- Work earnings reduce school tuition first. A negative tuition balance represents credit owed to the student; authorized staff can transfer that credit to the personal wallet. Recorded payouts reduce the wallet balance.
- Profile images are converted to WebP and saved on the app server. Use persistent disk for `PROFILE_UPLOAD_DIR`, especially when running the app as a Windows service.
- Displayed dates use Philippine time (`Asia/Manila`); currency is PHP.
