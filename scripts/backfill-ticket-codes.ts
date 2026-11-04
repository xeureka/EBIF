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

  const client = new Client(config);
  await client.connect();

  try {
    // 1. Check if ticket_code column exists
    const colCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'registrations' 
        AND column_name = 'ticket_code';
    `);

    if (colCheck.rows.length === 0) {
      throw new Error("Column 'ticket_code' does not exist on table 'registrations'. Apply migration 1 first.");
    }

    // 2. Query initial counts
    const skippedRes = await client.query(`SELECT count(*)::int as count FROM public."registrations" WHERE ticket_code IS NOT NULL;`);
    const initialSkipped: number = skippedRes.rows[0].count;

    const unassignedRes = await client.query(`SELECT count(*)::int as count FROM public."registrations" WHERE ticket_code IS NULL;`);
    const toBackfill: number = unassignedRes.rows[0].count;

    if (toBackfill === 0) {
      console.log(`Backfill summary: updated=0, skipped=${initialSkipped}, remaining=0`);
      return;
    }

    // 3. Track existing ticket codes to prevent collisions
    const assignedCodes = new Set<string>();
    const existingCodesRes = await client.query(`
      SELECT ticket_code FROM public."registrations" WHERE ticket_code IS NOT NULL;
    `);
    for (const row of existingCodesRes.rows) {
      if (row.ticket_code) {
        assignedCodes.add(normalizeTicketCode(row.ticket_code));
      }
    }

    // 4. Fetch IDs of rows requiring backfill
    const rowsRes = await client.query(`
      SELECT id FROM public."registrations" 
      WHERE ticket_code IS NULL
      ORDER BY created_at ASC;
    `);
    const rows = rowsRes.rows;

    const BATCH_SIZE = 50;
    let updatedCount = 0;

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      await client.query("BEGIN");
      try {
        for (const row of batch) {
          let code = generateTicketCode();
          let normalized = normalizeTicketCode(code);
          let retries = 0;

          while (assignedCodes.has(normalized) && retries < 15) {
            code = generateTicketCode();
            normalized = normalizeTicketCode(code);
            retries++;
          }

          if (assignedCodes.has(normalized)) {
            throw new Error("Collision threshold reached while generating ticket code");
          }

          assignedCodes.add(normalized);

          await client.query(
            `UPDATE public."registrations" SET ticket_code = $1 WHERE id = $2 AND ticket_code IS NULL;`,
            [code, row.id],
          );
          updatedCount++;
        }
        await client.query("COMMIT");
      } catch (batchErr) {
        await client.query("ROLLBACK");
        throw batchErr;
      }
    }

    // 5. Query final remaining count
    const remainingRes = await client.query(`SELECT count(*)::int as count FROM public."registrations" WHERE ticket_code IS NULL;`);
    const remainingCount: number = remainingRes.rows[0].count;

    console.log(`Backfill summary: updated=${updatedCount}, skipped=${initialSkipped}, remaining=${remainingCount}`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("Backfill failed:", err.message);
  process.exit(1);
});
