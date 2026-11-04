import { auditLogs } from "../db/schema";
import type { AppDb } from "../db/client";

export interface LogAuditParams {
  db: AppDb;
  actorAdminId?: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
}

export async function recordAuditLog({
  db,
  actorAdminId = null,
  action,
  targetType,
  targetId = null,
  ip = null,
  userAgent = null,
  metadata = {},
}: LogAuditParams): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      actorAdminId,
      action,
      targetType,
      targetId,
      ip,
      userAgent,
      metadata,
    });
  } catch (error) {
    // Audit logging failure should not abort the primary transaction, but report to stderr
    console.error("Failed to record audit log:", error);
  }
}
