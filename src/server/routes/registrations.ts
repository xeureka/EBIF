import { Hono } from "hono";
import { sql, eq } from "drizzle-orm";
import { registrationSchema } from "../../shared/schemas";
import { registrations, rateLimit } from "../db/schema";
import type { AppDb } from "../db/client";
import { generateUniqueTicketCode } from "../modules/tickets/code";

export const registrationsRouter = new Hono<{
  Variables: {
    db: AppDb;
  };
}>();

const ATTENDEE_TYPE_MAP: Record<string, string> = {
  company: "Company",
  investor: "Investor",
  government: "Government Institution",
  international_partner: "International Partner",
};

/**
 * Public registration endpoint.
 */
registrationsRouter.post("/", async (c) => {
  const db = c.get("db");
  const ip =
    c.req.header("cf-connecting-ip") ||
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
    "127.0.0.1";

  // Rate limit: max 10 submissions per 10 minutes per IP
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  const rateLimitKey = `reg:${ip}`;

  try {
    const [existingRate] = await db
      .select()
      .from(rateLimit)
      .where(eq(rateLimit.key, rateLimitKey))
      .limit(1);

    if (existingRate) {
      if (now - existingRate.lastRequest < windowMs) {
        if (existingRate.count >= 10) {
          return c.json(
            {
              error: {
                code: "TOO_MANY_REQUESTS",
                message: "Too many registration attempts. Please try again later.",
              },
            },
            429,
          );
        }
        await db
          .update(rateLimit)
          .set({
            count: existingRate.count + 1,
            lastRequest: now,
          })
          .where(eq(rateLimit.id, existingRate.id));
      } else {
        await db
          .update(rateLimit)
          .set({
            count: 1,
            lastRequest: now,
          })
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
    console.error("Rate limiting error:", err);
  }

  // Parse & validate body
  let rawBody: unknown;
  try {
    rawBody = await c.req.json();
  } catch {
    return c.json(
      { error: { code: "BAD_REQUEST", message: "Invalid JSON payload" } },
      400,
    );
  }

  const result = registrationSchema.safeParse(rawBody);
  if (!result.success) {
    const firstError = result.error.issues[0]?.message || "Invalid registration data";
    return c.json(
      { error: { code: "VALIDATION_ERROR", message: firstError } },
      400,
    );
  }

  const { fullName, email, phone, organization, jobTitle, attendeeType, honeypot } =
    result.data;

  // Bot honeypot check: silently accept without inserting
  if (honeypot && honeypot.trim().length > 0) {
    return c.json({ ok: true });
  }

  // Check duplicate email using lower(email)
  const [existingUser] = await db
    .select({ id: registrations.id })
    .from(registrations)
    .where(sql`lower(${registrations.email}) = ${email.toLowerCase()}`)
    .limit(1);

  if (existingUser) {
    return c.json(
      {
        error: {
          code: "DUPLICATE_EMAIL",
          message: "This email is already registered for the forum.",
        },
      },
      409,
    );
  }

  // Format phone number to standard +251XXXXXXXXX
  const cleanDigits = phone.replace(/\D/g, "");
  const formattedPhone = `+251${cleanDigits}`;

  // Unique reference code
  const referenceHex = crypto.randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase();
  const reference = `EBIF-${referenceHex}`;

  const mappedType = ATTENDEE_TYPE_MAP[attendeeType] || "Company";

  // Generate unique Crockford Base32 ticket code
  const ticketCode = await generateUniqueTicketCode(db);

  // Parameterized insert
  await db.insert(registrations).values({
    id: crypto.randomUUID(),
    fullName,
    email,
    phone: formattedPhone,
    organization,
    jobTitle,
    attendeeType: mappedType,
    attendingDays: "Nov 28, Nov 29, 2026",
    reference,
    ticketCode,
    createdAt: new Date(),
  });

  return c.json({ ok: true, ticketCode });
});
