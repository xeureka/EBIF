import fs from "node:fs";
import path from "node:path";
import { Client } from "pg";
import { parse } from "pg-connection-string";
import { generateTicketCode, normalizeTicketCode } from "../src/server/modules/tickets/code";

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

async function main() {
  const dbUrl = loadEnv();
  const config = parse(dbUrl);
  config.ssl = { rejectUnauthorized: false };

  console.log("Connecting to database for ticket code backfill...");
  const client = new Client(config);
  await client.connect();

  try {
    // Check if column exists first
    const colCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'registrations' 
        AND column_name = 'ticket_code';
    `);

    if (colCheck.rows.length === 0) {
      console.error("Column 'ticket_code' does not exist on table 'registrations'. Please run migration 1 first.");
      process.exit(1);
    }

    // Fetch existing registrations without ticket codes
    const res = await client.query(`
      SELECT id FROM public."registrations" 
      WHERE ticket_code IS NULL
      ORDER BY created_at ASC;
    `);

    const unbackfilled = res.rows;
    console.log(`Found ${unbackfilled.length} registrations requiring ticket codes.`);

    if (unbackfilled.length === 0) {
      console.log("All registrations already have ticket codes. Nothing to backfill.");
      return;
    }

    // Set of allocated codes in this run to avoid collisions
    const assignedCodes = new Set<string>();

    // Fetch existing non-null codes to avoid collisions
    const existingCodesRes = await client.query(`
      SELECT ticket_code FROM public."registrations" WHERE ticket_code IS NOT NULL;
    `);
    for (const row of existingCodesRes.rows) {
      assignedCodes.add(normalizeTicketCode(row.ticket_code));
    }

    let updatedCount = 0;
    await client.query("BEGIN");

    try {
      for (const row of unbackfilled) {
        let code = generateTicketCode();
        let normalized = normalizeTicketCode(code);
        let retries = 0;

        while (assignedCodes.has(normalized) && retries < 10) {
          code = generateTicketCode();
          normalized = normalizeTicketCode(code);
          retries++;
        }

        if (assignedCodes.has(normalized)) {
          throw new Error("Failed to generate unique ticket code during backfill");
        }

        assignedCodes.add(normalized);

        await client.query(
          `UPDATE public."registrations" SET ticket_code = $1 WHERE id = $2;`,
          [code, row.id],
        );
        updatedCount++;
      }

      await client.query("COMMIT");
      console.log(`✓ Successfully backfilled ${updatedCount} registrations with unique ticket codes.`);
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
