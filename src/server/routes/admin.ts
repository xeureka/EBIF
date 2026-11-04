import { Hono } from "hono";
import { sql, and, or, ilike, desc, asc, eq } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import {
  adminCreateSchema,
  adminStatusSchema,
  attendeesQuerySchema,
  adminsQuerySchema,
} from "../../shared/schemas";
import { registrations, user, account, session, rateLimit } from "../db/schema";
import { requireAdmin, type AdminContextEnv } from "../middleware/admin";
import { recordAuditLog } from "../utils/audit";
import { getServerEnv } from "../env";
import { generateUniqueTicketCode } from "../modules/tickets/code";
import { ResendEmailProvider } from "../modules/email/resend";
import { sendConfirmationEmail } from "../modules/email/service";
import { checkInRouter } from "./checkin";

export const adminRouter = new Hono<AdminContextEnv>();

// Apply requireAdmin to all /api/admin/* endpoints
adminRouter.use("*", requireAdmin);

// Mount Check-in router under /api/admin/check-in
adminRouter.route("/check-in", checkInRouter);

/**
 * Generate a random 16-character secure password without look-alike characters.
 * Excludes: 0, O, o, 1, l, I
 */
function generateSecurePassword(length = 16): string {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%&*+=";
  const randomValues = new Uint32Array(length);
  crypto.getRandomValues(randomValues);

  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i] % chars.length];
  }
  return result;
}

/**
 * GET /api/admin/me
 * Returns current authenticated admin profile.
 */
adminRouter.get("/me", async (c) => {
  const admin = c.get("adminUser");
  return c.json({
    id: admin.id,
    username: admin.name,
    email: admin.email,
    role: admin.role,
    status: admin.banned ? "disabled" : "active",
  });
});

/**
 * GET /api/admin/attendees
 * Query params: search, attendeeType, range, sort, page, pageSize
 */
adminRouter.get("/attendees", async (c) => {
  const db = c.get("db");
  const queryResult = attendeesQuerySchema.safeParse(c.req.query());

  if (!queryResult.success) {
    return c.json(
      { error: { code: "INVALID_QUERY", message: queryResult.error.issues[0]?.message || "Invalid query" } },
      400,
    );
  }

  const { search, attendeeType, range, sort, page, pageSize } = queryResult.data;
  const conditions = [];

  // Search filter
  if (search && search.trim().length > 0) {
    const term = `%${search.trim()}%`;
    conditions.push(
      or(
        ilike(registrations.fullName, term),
        ilike(registrations.email, term),
        ilike(registrations.phone, term),
        ilike(registrations.organization, term),
        ilike(registrations.jobTitle, term),
      ),
    );
  }

  // Attendee type filter
  if (attendeeType && attendeeType !== "all") {
    if (attendeeType === "company") {
      conditions.push(sql`lower(${registrations.attendeeType}) in ('company')`);
    } else if (attendeeType === "investor") {
      conditions.push(sql`lower(${registrations.attendeeType}) in ('investor')`);
    } else if (attendeeType === "government") {
      conditions.push(sql`lower(${registrations.attendeeType}) in ('government', 'government institution')`);
    } else if (attendeeType === "international_partner") {
      conditions.push(sql`lower(${registrations.attendeeType}) in ('international_partner', 'international partner')`);
    }
  }

  // Date range filter
  const now = new Date();
  if (range === "today") {
    conditions.push(sql`${registrations.createdAt} >= date_trunc('day', now())`);
  } else if (range === "7d") {
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    conditions.push(sql`${registrations.createdAt} >= ${sevenDaysAgo}`);
  } else if (range === "30d") {
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    conditions.push(sql`${registrations.createdAt} >= ${thirtyDaysAgo}`);
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Sorting
  const orderClause = sort === "oldest" ? asc(registrations.createdAt) : desc(registrations.createdAt);

  const offset = (page - 1) * pageSize;

  // Execute queries in parallel
  const [items, countRes, statsRes] = await Promise.all([
    db
      .select()
      .from(registrations)
      .where(whereClause)
      .orderBy(orderClause)
      .limit(pageSize)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(registrations)
      .where(whereClause),
    db
      .select({
        total: sql<number>`count(*)::int`,
        today: sql<number>`count(*) filter (where ${registrations.createdAt} >= date_trunc('day', now()))::int`,
        company: sql<number>`count(*) filter (where lower(${registrations.attendeeType}) in ('company'))::int`,
        investor: sql<number>`count(*) filter (where lower(${registrations.attendeeType}) in ('investor'))::int`,
        government: sql<number>`count(*) filter (where lower(${registrations.attendeeType}) in ('government', 'government institution'))::int`,
        internationalPartner: sql<number>`count(*) filter (where lower(${registrations.attendeeType}) in ('international_partner', 'international partner'))::int`,
      })
      .from(registrations),
  ]);

  const total = countRes[0]?.count || 0;
  const stats = statsRes[0] || {
    total: 0,
    today: 0,
    company: 0,
    investor: 0,
    government: 0,
    internationalPartner: 0,
  };

  const formattedItems = items.map((item) => {
    let normalizedType: "company" | "investor" | "government" | "international_partner" = "company";
    const lower = item.attendeeType.toLowerCase();
    if (lower.includes("investor")) normalizedType = "investor";
    else if (lower.includes("gov")) normalizedType = "government";
    else if (lower.includes("international") || lower.includes("partner")) normalizedType = "international_partner";

    return {
      id: item.id,
      fullName: item.fullName,
      email: item.email,
      phone: item.phone,
      organization: item.organization,
      jobTitle: item.jobTitle,
      attendeeType: normalizedType,
      attendingDays: item.attendingDays,
      createdAt: item.createdAt.toISOString(),
      reference: item.reference,
    };
  });

  return c.json({
    items: formattedItems,
    total,
    page,
    pageSize,
    stats,
  });
});

/**
 * GET /api/admin/admins
 * List administrators with search, filter, and pagination.
 */
adminRouter.get("/admins", async (c) => {
  const db = c.get("db");
  const queryResult = adminsQuerySchema.safeParse(c.req.query());

  if (!queryResult.success) {
    return c.json(
      { error: { code: "INVALID_QUERY", message: queryResult.error.issues[0]?.message || "Invalid query" } },
      400,
    );
  }

  const { search, status, page, pageSize } = queryResult.data;
  const conditions = [eq(user.role, "admin")];

  if (search && search.trim().length > 0) {
    const term = `%${search.trim()}%`;
    conditions.push(or(ilike(user.name, term), ilike(user.email, term))!);
  }

  if (status === "active") {
    conditions.push(eq(user.banned, false));
  } else if (status === "disabled") {
    conditions.push(eq(user.banned, true));
  }

  const whereClause = and(...conditions);
  const offset = (page - 1) * pageSize;

  const [items, countRes] = await Promise.all([
    db
      .select({
        id: user.id,
        username: user.name,
        email: user.email,
        role: user.role,
        banned: user.banned,
        createdAt: user.createdAt,
      })
      .from(user)
      .where(whereClause)
      .orderBy(asc(user.createdAt))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(user)
      .where(whereClause),
  ]);

  const total = countRes[0]?.count || 0;

  const formattedItems = items.map((u) => ({
    id: u.id,
    username: u.username,
    email: u.email,
    status: (u.banned ? "disabled" : "active") as "active" | "disabled",
    role: u.role,
    createdAt: u.createdAt.toISOString(),
  }));

  return c.json({
    items: formattedItems,
    total,
    page,
    pageSize,
  });
});

/**
 * POST /api/admin/admins
 * Create a new administrator with auto-generated 16-char secure password and email.
 */
adminRouter.post("/admins", async (c) => {
  const db = c.get("db");
  const currentAdmin = c.get("adminUser");

  let rawBody: unknown;
  try {
    rawBody = await c.req.json();
  } catch {
    return c.json(
      { error: { code: "BAD_REQUEST", message: "Invalid JSON body" } },
      400,
    );
  }

  const result = adminCreateSchema.safeParse(rawBody);
  if (!result.success) {
    return c.json(
      { error: { code: "VALIDATION_ERROR", message: result.error.issues[0]?.message || "Invalid username" } },
      400,
    );
  }

  const username = result.data.username;
  const email = `${username.toLowerCase()}@nexabusinessgroup.com`;

  // Check unique username or email
  const [existingUser] = await db
    .select({ id: user.id })
    .from(user)
    .where(or(sql`lower(${user.name}) = ${username.toLowerCase()}`, sql`lower(${user.email}) = ${email.toLowerCase()}`))
    .limit(1);

  if (existingUser) {
    return c.json(
      { error: { code: "USERNAME_EXISTS", message: "An administrator with this username or email already exists." } },
      409,
    );
  }

  // Generate random 16-char password and hash with Better Auth hashing
  const rawPassword = generateSecurePassword(16);
  const hashedPassword = await hashPassword(rawPassword);

  const newAdminId = crypto.randomUUID();
  const now = new Date();

  // Insert user
  await db.insert(user).values({
    id: newAdminId,
    name: username,
    email,
    emailVerified: true,
    role: "admin",
    banned: false,
    createdAt: now,
    updatedAt: now,
  });

  // Insert credential account
  await db.insert(account).values({
    id: crypto.randomUUID(),
    accountId: newAdminId,
    providerId: "credential",
    userId: newAdminId,
    password: hashedPassword,
    createdAt: now,
    updatedAt: now,
  });

  // Record audit log
  await recordAuditLog({
    db,
    actorAdminId: currentAdmin.id,
    action: "ADMIN_CREATED",
    targetType: "admin",
    targetId: newAdminId,
    metadata: { username, email },
  });

  // Return generated credentials once only
  return c.json({
    email,
    password: rawPassword,
  });
});

/**
 * PATCH /api/admin/admins/:id/status
 * Enable or disable an administrator.
 */
adminRouter.patch("/admins/:id/status", async (c) => {
  const db = c.get("db");
  const currentAdmin = c.get("adminUser");
  const targetId = c.req.param("id");

  // Prevent self-disable
  if (currentAdmin.id === targetId) {
    return c.json(
      { error: { code: "SELF_ACTION_FORBIDDEN", message: "You cannot disable your own administrator account." } },
      400,
    );
  }

  let rawBody: unknown;
  try {
    rawBody = await c.req.json();
  } catch {
    return c.json(
      { error: { code: "BAD_REQUEST", message: "Invalid JSON body" } },
      400,
    );
  }

  const result = adminStatusSchema.safeParse(rawBody);
  if (!result.success) {
    return c.json(
      { error: { code: "VALIDATION_ERROR", message: result.error.issues[0]?.message || "Invalid status" } },
      400,
    );
  }

  const { status } = result.data;

  // Verify target admin exists
  const [targetUser] = await db
    .select({ id: user.id, name: user.name, role: user.role, banned: user.banned })
    .from(user)
    .where(eq(user.id, targetId))
    .limit(1);

  if (!targetUser || targetUser.role !== "admin") {
    return c.json(
      { error: { code: "NOT_FOUND", message: "Administrator not found" } },
      404,
    );
  }

  // If disabling, verify this is not the last active admin
  if (status === "disabled") {
    const [activeCountRes] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(user)
      .where(and(eq(user.role, "admin"), eq(user.banned, false)));

    if ((activeCountRes?.count || 0) <= 1) {
      return c.json(
        {
          error: {
            code: "LAST_ADMIN_PROTECTED",
            message: "Cannot disable the last active administrator.",
          },
        },
        400,
      );
    }
  }

  const willBeBanned = status === "disabled";

  // Update user banned status
  await db
    .update(user)
    .set({
      banned: willBeBanned,
      updatedAt: new Date(),
    })
    .where(eq(user.id, targetId));

  // If disabled, revoke active sessions immediately
  if (willBeBanned) {
    await db.delete(session).where(eq(session.userId, targetId));
  }

  // Audit log
  await recordAuditLog({
    db,
    actorAdminId: currentAdmin.id,
    action: willBeBanned ? "ADMIN_DISABLED" : "ADMIN_ENABLED",
    targetType: "admin",
    targetId,
    metadata: { targetUsername: targetUser.name, newStatus: status },
  });

  return c.json({ ok: true, status });
});

/**
 * POST /api/admin/attendees/:id/resend-email
 * Resends confirmation email for a registered attendee.
 * Rate limited to prevent spam. Auto-generates ticket code if not already present.
 */
adminRouter.post("/attendees/:id/resend-email", async (c) => {
  const db = c.get("db");
  const currentAdmin = c.get("adminUser");
  const attendeeId = c.req.param("id");

  // Rate limiting: max 5 resend requests per minute per admin
  const now = Date.now();
  const windowMs = 60 * 1000;
  const rateLimitKey = `resend:${currentAdmin.id}`;

  try {
    const [existingRate] = await db
      .select()
      .from(rateLimit)
      .where(eq(rateLimit.key, rateLimitKey))
      .limit(1);

    if (existingRate) {
      if (now - existingRate.lastRequest < windowMs) {
        if (existingRate.count >= 5) {
          return c.json(
            {
              error: {
                code: "TOO_MANY_REQUESTS",
                message: "Too many email resend requests. Please wait a minute.",
              },
            },
            429,
          );
        }
        await db
          .update(rateLimit)
          .set({ count: existingRate.count + 1, lastRequest: now })
          .where(eq(rateLimit.id, existingRate.id));
      } else {
        await db
          .update(rateLimit)
          .set({ count: 1, lastRequest: now })
          .where(eq(rateLimit.id, existingRate.id));
      }
    } else {
      await db.insert(rateLimit).values({
        id: crypto.randomUUID(),
        key: rateLimitKey,
        count: 1,
        lastRequest: now,
      });
    }
  } catch (err) {
    console.error("Resend rate limit error:", err);
  }

  // Find registration
  const [attendee] = await db
    .select()
    .from(registrations)
    .where(eq(registrations.id, attendeeId))
    .limit(1);

  if (!attendee) {
    return c.json(
      { error: { code: "NOT_FOUND", message: "Attendee registration not found" } },
      404,
    );
  }

  let ticketCode = attendee.ticketCode;
  if (!ticketCode) {
    ticketCode = await generateUniqueTicketCode(db);
    await db
      .update(registrations)
      .set({ ticketCode })
      .where(eq(registrations.id, attendee.id));
  }

  const serverEnv = getServerEnv(c.env as Record<string, string | undefined>);
  const emailProvider = new ResendEmailProvider({
    apiKey: serverEnv.RESEND_API_KEY,
    from: serverEnv.EMAIL_FROM,
    replyTo: serverEnv.EMAIL_REPLY_TO,
  });

  const sendResult = await sendConfirmationEmail({
    db,
    attendee: {
      id: attendee.id,
      fullName: attendee.fullName,
      email: attendee.email,
      organization: attendee.organization,
      ticketCode,
    },
    provider: emailProvider,
    siteUrl: serverEnv.SITE_URL,
  });

  // Record audit log
  await recordAuditLog({
    db,
    actorAdminId: currentAdmin.id,
    action: "RESEND_CONFIRMATION_EMAIL",
    targetType: "registration",
    targetId: attendee.id,
    metadata: {
      recipientEmail: attendee.email,
      success: sendResult.ok,
      providerId: sendResult.providerId,
    },
  });

  if (!sendResult.ok) {
    return c.json(
      {
        error: {
          code: "EMAIL_SEND_FAILED",
          message: sendResult.error || "Failed to deliver email through provider",
        },
      },
      502,
    );
  }

  return c.json({ ok: true });
});
