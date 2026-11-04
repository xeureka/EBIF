import fs from "node:fs";
import path from "node:path";
import { Client } from "pg";
import { parse } from "pg-connection-string";

function loadEnv(): string {
  const envPath = path.resolve(process.cwd(), ".env");
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("DATABASE_URL=")) {
      return trimmed.slice("DATABASE_URL=".length).trim().replace(/^["']|["']$/g, "");
    }
  }
  throw new Error("No DATABASE_URL found");
}

async function main() {
  const dbUrl = loadEnv();
  const config = parse(dbUrl);
  config.ssl = { rejectUnauthorized: false };
  const client = new Client(config);

  await client.connect();
  console.log("Connected successfully to Neon database.");

  const tablesRes = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `);

  console.log("\nTables in database:");
  for (const row of tablesRes.rows) {
    const countRes = await client.query(`SELECT COUNT(*) FROM public."${row.table_name}"`);
    console.log(`- ${row.table_name}: ${countRes.rows[0].count} rows`);
  }

  const usersRes = await client.query(`SELECT id, name, email, role, banned FROM public."user"`);
  console.log("\nUsers in database:", usersRes.rows);

  const regRes = await client.query(`SELECT id, full_name, email, organization, attendee_type FROM public."registrations" LIMIT 5`);
  console.log("\nSample registrations:", regRes.rows);

  await client.end();
}

main().catch((err) => {
  console.error("Check failed:", err);
  process.exit(1);
});
