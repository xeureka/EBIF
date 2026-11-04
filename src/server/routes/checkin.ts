import { Hono } from "hono";
import {
  checkInScanSchema,
  checkInByRegistrationSchema,
  undoCheckInSchema,
  checkInSearchSchema,
  checkInStatsQuerySchema,
  walkInRegistrationSchema,
} from "../../shared/schemas";
import type { AdminContextEnv } from "../middleware/admin";
import { recordAuditLog } from "../utils/audit";
import { getServerEnv } from "../env";
import { ResendEmailProvider } from "../modules/email/resend";
import {
  checkInByCode,
  checkInByRegistration,
  undoCheckIn,
  searchAttendeesForCheckIn,
  getCheckInStats,
  registerWalkIn,
} from "../modules/checkin/service";

export const checkInRouter = new Hono<AdminContextEnv>();

/**
 * POST /api/admin/check-in
 * Check-in by scanned or manually entered ticket code.
 */
checkInRouter.post("/", async (c) => {
  const db = c.get("db");
  const adminUser = c.get("adminUser");

  let rawBody: unknown;
  try {
    rawBody = await c.req.json();
  } catch {
    return c.json(
      { error: { code: "BAD_REQUEST", message: "Invalid JSON payload" } },
      400,
    );
  }

  const parsed = checkInScanSchema.safeParse(rawBody);
  if (!parsed.success) {
    return c.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: parsed.error.issues[0]?.message || "Invalid check-in request",
        },
      },
      400,
    );
  }

  const { code, day, method } = parsed.data;
  const result = await checkInByCode(db, adminUser, { code, day: day as 1 | 2, method });

  if (result.status === "not_found") {
    return c.json(
      {
        error: {
          code: "NOT_FOUND",
          message: "Ticket code not found",
        },
      },
      404,
    );
  }

  // Audit log for check in
  await recordAuditLog({
    db,
    actorAdminId: adminUser.id,
    action: result.status === "checked_in" ? "ATTENDEE_CHECKED_IN" : "ATTENDEE_ALREADY_CHECKED_IN",
    targetType: "registration",
    targetId: result.registration?.id,
    metadata: {
      day,
      method,
      status: result.status,
    },
  });

  return c.json({
    ok: true,
    status: result.status,
    registration: result.registration,
  });
});

/**
 * POST /api/admin/check-in/by-registration
 * Manual check-in from attendee search list.
 */
checkInRouter.post("/by-registration", async (c) => {
  const db = c.get("db");
  const adminUser = c.get("adminUser");

  let rawBody: unknown;
  try {
    rawBody = await c.req.json();
  } catch {
    return c.json(
      { error: { code: "BAD_REQUEST", message: "Invalid JSON payload" } },
      400,
    );
  }

  const parsed = checkInByRegistrationSchema.safeParse(rawBody);
  if (!parsed.success) {
    return c.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: parsed.error.issues[0]?.message || "Invalid registration check-in",
        },
      },
      400,
    );
  }

  const { registrationId, day } = parsed.data;
  const result = await checkInByRegistration(db, adminUser, {
    registrationId,
    day: day as 1 | 2,
  });

  if (result.status === "not_found") {
    return c.json(
      {
        error: {
          code: "NOT_FOUND",
          message: "Registration not found",
        },
      },
      404,
    );
  }

  await recordAuditLog({
    db,
    actorAdminId: adminUser.id,
    action: result.status === "checked_in" ? "ATTENDEE_CHECKED_IN_MANUAL" : "ATTENDEE_ALREADY_CHECKED_IN",
    targetType: "registration",
    targetId: registrationId,
    metadata: { day, method: "manual", status: result.status },
  });

  return c.json({
    ok: true,
    status: result.status,
    registration: result.registration,
  });
});

/**
 * DELETE /api/admin/check-in
 * Undo a mistaken check-in.
 */
checkInRouter.delete("/", async (c) => {
  const db = c.get("db");
  const adminUser = c.get("adminUser");

  let rawBody: unknown;
  try {
    rawBody = await c.req.json();
  } catch {
    return c.json(
      { error: { code: "BAD_REQUEST", message: "Invalid JSON payload" } },
      400,
    );
  }

  const parsed = undoCheckInSchema.safeParse(rawBody);
  if (!parsed.success) {
    return c.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: parsed.error.issues[0]?.message || "Invalid undo request",
        },
      },
      400,
    );
  }

  const { registrationId, day } = parsed.data;
  const result = await undoCheckIn(db, adminUser, {
    registrationId,
    day: day as 1 | 2,
  });

  await recordAuditLog({
    db,
    actorAdminId: adminUser.id,
    action: "CHECK_IN_UNDONE",
    targetType: "registration",
    targetId: registrationId,
    metadata: { day, undone: result.undone },
  });

  return c.json({ ok: true, undone: result.undone });
});

/**
 * GET /api/admin/check-in/search?q=&day=
 * Search attendees by phone, email, name, organization.
 */
checkInRouter.get("/search", async (c) => {
  const db = c.get("db");
  const queryResult = checkInSearchSchema.safeParse(c.req.query());

  if (!queryResult.success) {
    return c.json(
      {
        error: {
          code: "INVALID_QUERY",
          message: queryResult.error.issues[0]?.message || "Invalid search query",
        },
      },
      400,
    );
  }

  const { q, day } = queryResult.data;
  const items = await searchAttendeesForCheckIn(db, q, day as 1 | 2);

  return c.json({ ok: true, items });
});

/**
 * GET /api/admin/check-in/stats?day=
 * Check-in stats and attendee breakdown for a given day.
 */
checkInRouter.get("/stats", async (c) => {
  const db = c.get("db");
  const queryResult = checkInStatsQuerySchema.safeParse(c.req.query());

  if (!queryResult.success) {
    return c.json(
      {
        error: {
          code: "INVALID_QUERY",
          message: queryResult.error.issues[0]?.message || "Invalid stats query",
        },
      },
      400,
    );
  }

  const { day } = queryResult.data;
  const stats = await getCheckInStats(db, day as 1 | 2);

  return c.json({ ok: true, stats });
});

/**
 * POST /api/admin/check-in/walk-in
 * Register a walk-in attendee, check them in immediately, and dispatch email.
 */
checkInRouter.post("/walk-in", async (c) => {
  const db = c.get("db");
  const adminUser = c.get("adminUser");

  let rawBody: unknown;
  try {
    rawBody = await c.req.json();
  } catch {
    return c.json(
      { error: { code: "BAD_REQUEST", message: "Invalid JSON payload" } },
      400,
    );
  }

  const parsed = walkInRegistrationSchema.safeParse(rawBody);
  if (!parsed.success) {
    return c.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: parsed.error.issues[0]?.message || "Invalid walk-in data",
        },
      },
      400,
    );
  }

  const serverEnv = getServerEnv(c.env as Record<string, string | undefined>);
  const emailProvider = new ResendEmailProvider({
    apiKey: serverEnv.RESEND_API_KEY,
    from: serverEnv.EMAIL_FROM,
    replyTo: serverEnv.EMAIL_REPLY_TO,
  });

  try {
    const result = await registerWalkIn(
      db,
      adminUser,
      {
        ...parsed.data,
        day: parsed.data.day as 1 | 2,
      },
      serverEnv.SITE_URL,
      emailProvider,
    );

    await recordAuditLog({
      db,
      actorAdminId: adminUser.id,
      action: "WALK_IN_REGISTERED",
      targetType: "registration",
      targetId: result.registration.id,
      metadata: {
        email: result.registration.email,
        day: parsed.data.day,
      },
    });

    return c.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to register walk-in attendee";
    if (msg.includes("already registered")) {
      return c.json(
        { error: { code: "DUPLICATE_EMAIL", message: msg } },
        409,
      );
    }
    return c.json(
      { error: { code: "REGISTRATION_FAILED", message: msg } },
      500,
    );
  }
});
