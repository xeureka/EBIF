import { Client, ClientConfig } from "pg";
import { parse } from "pg-connection-string";
import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";
import { dbSchema, DatabaseSchema } from "./schema";

export type AppDb = NodePgDatabase<DatabaseSchema>;

export interface DbContext {
  client: Client;
  db: AppDb;
}

/**
 * Creates a per-request PostgreSQL client and Drizzle instance.
 * No global connection pool is used, ensuring compatibility with Cloudflare Workers.
 * SSL is strictly kept enabled for the hosted database with rejectUnauthorized: false.
 */
export async function createDbContext(connectionString: string): Promise<DbContext> {
  const parsed = parse(connectionString);

  const clientConfig: ClientConfig = {
    user: parsed.user ?? undefined,
    password: parsed.password ?? undefined,
    host: parsed.host ?? undefined,
    port: parsed.port ? parseInt(parsed.port, 10) : undefined,
    database: parsed.database ?? undefined,
    ssl: { rejectUnauthorized: false },
  };

  const client = new Client(clientConfig);
  await client.connect();
  const db = drizzle(client, { schema: dbSchema });

  return { client, db };
}

/**
 * Closes the per-request PostgreSQL client safely.
 */
export async function closeDbContext(context?: DbContext | null): Promise<void> {
  if (!context?.client) return;
  try {
    await context.client.end();
  } catch {
    // Ignore error if connection is already closed
  }
}
