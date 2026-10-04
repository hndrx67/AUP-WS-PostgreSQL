import { randomBytes, scrypt as scryptCallback } from "node:crypto";
import { promisify } from "node:util";
import { Pool } from "pg";
import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline/promises";

const scrypt = promisify(scryptCallback);
const rl = createInterface({ input: stdin, output: stdout });
const fullName = (await rl.question("Administrator full name: ")).trim();
const email = (await rl.question("Administrator email: ")).trim().toLowerCase();
const password = await rl.question("Password (at least 12 characters): ");
rl.close();
if (!fullName || !email.includes("@") || password.length < 12) throw new Error("Enter a name, valid email, and password of at least 12 characters.");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL must be set in .env.local.");
const salt = randomBytes(16).toString("hex");
const key = await scrypt(password, salt, 64);
const passwordHash = `scrypt$${salt}$${key.toString("hex")}`;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
try {
  await pool.query("INSERT INTO profiles (email, password_hash, full_name, role) VALUES ($1, $2, $3, 'admin')", [email, passwordHash, fullName]);
  console.log(`Created administrator ${email}`);
} finally { await pool.end(); }
