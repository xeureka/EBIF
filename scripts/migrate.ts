import fs from "node:fs";
import path from "node:path";
import { Client } from "pg";
import { parse } from "pg-connection-string";

function loadEnv(): string {
  const envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) {
    throw new Error("No .env file found");
  }
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("DATABASE_URL=")) {
      return trimmed.slice("DATABASE_URL=".length).trim().replace(/^["']|["']$/g, "");
    }
  }
  throw new Error("No DATABASE_URL in .env");
}

const MIGRATION_SQL = `
-- 1. Users table (Admins)
CREATE TABLE IF NOT EXISTS public."user" (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  email_verified BOOLEAN NOT NULL DEFAULT false,
  image TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  role TEXT NOT NULL DEFAULT 'user',
  banned BOOLEAN NOT NULL DEFAULT false,
  ban_reason TEXT,
  ban_expires TIMESTAMP WITH TIME ZONE
);
CREATE UNIQUE INDEX IF NOT EXISTS user_email_unique ON public."user" (email);

-- 2. Sessions table
CREATE TABLE IF NOT EXISTS public."session" (
  id TEXT PRIMARY KEY,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  user_id TEXT NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  impersonated_by TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS session_token_unique ON public."session" (token);
CREATE INDEX IF NOT EXISTS session_user_id_idx ON public."session" (user_id);

-- 3. Accounts table (Credentials)
CREATE TABLE IF NOT EXISTS public."account" (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  access_token TEXT,
  refresh_token TEXT,
  id_token TEXT,
  access_token_expires_at TIMESTAMP WITH TIME ZONE,
  refresh_token_expires_at TIMESTAMP WITH TIME ZONE,
  scope TEXT,
  password TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS account_user_id_idx ON public."account" (user_id);

-- 4. Verification table
CREATE TABLE IF NOT EXISTS public."verification" (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS verification_identifier_idx ON public."verification" (identifier);

-- 5. Rate limit table
CREATE TABLE IF NOT EXISTS public."rate_limit" (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL,
  count INTEGER NOT NULL,
  last_request BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS rate_limit_key_idx ON public."rate_limit" (key);

-- 6. Login attempts table
CREATE TABLE IF NOT EXISTS public."login_attempts" (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL,
  success INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 7. Registrations table (Forum Attendees)
CREATE TABLE IF NOT EXISTS public."registrations" (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  organization TEXT NOT NULL,
  job_title TEXT NOT NULL,
  attendee_type TEXT NOT NULL,
  attending_days TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reference TEXT NOT NULL UNIQUE
);
CREATE UNIQUE INDEX IF NOT EXISTS registrations_email_lower_unique ON public."registrations" (lower(email));
CREATE UNIQUE INDEX IF NOT EXISTS registrations_reference_unique ON public."registrations" (reference);
CREATE INDEX IF NOT EXISTS registrations_created_at_idx ON public."registrations" (created_at);

-- 8. Audit logs table
CREATE TABLE IF NOT EXISTS public."audit_logs" (
  id TEXT PRIMARY KEY,
  actor_admin_id TEXT,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  ip TEXT,
  user_agent TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON public."audit_logs" (created_at);
CREATE INDEX IF NOT EXISTS audit_logs_action_idx ON public."audit_logs" (action);
`;

async function main() {
  const dbUrl = loadEnv();
  const config = parse(dbUrl);
  config.ssl = { rejectUnauthorized: false };

  console.log("Connecting to target database for migration...");
  const client = new Client(config);
  await client.connect();

  try {
    const targetArg = process.argv[2];
    if (targetArg) {
      let migrationPath = path.resolve(process.cwd(), targetArg);
      if (!fs.existsSync(migrationPath)) {
        // Check in migrations directory
        const candidate = path.resolve(process.cwd(), "migrations", targetArg.endsWith(".sql") ? targetArg : `${targetArg}.sql`);
        if (fs.existsSync(candidate)) {
          migrationPath = candidate;
        } else {
          // Check for prefix match like 0001
          const migrationsDir = path.resolve(process.cwd(), "migrations");
          const files = fs.readdirSync(migrationsDir);
          const matched = files.find((f) => f.startsWith(targetArg));
          if (matched) {
            migrationPath = path.join(migrationsDir, matched);
          } else {
            throw new Error(`Migration file not found: ${targetArg}`);
          }
        }
      }

      console.log(`Applying migration file: ${path.basename(migrationPath)}...`);
      const sqlContent = fs.readFileSync(migrationPath, "utf-8");
      await client.query(sqlContent);
      console.log(`✓ Migration ${path.basename(migrationPath)} applied successfully.`);
    } else {
      console.log("Applying schema migrations...");
      await client.query(MIGRATION_SQL);
      console.log("✓ All tables, constraints, and indexes successfully created.");
    }

    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    console.log("Verified tables in database:", res.rows.map((r) => r.table_name));
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
