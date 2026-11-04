import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { rateLimit } from "../db/schema";
import type { AppDb } from "../db/client";
import { getPublicTicketByCode } from "../modules/tickets/service";

export const ticketsRouter = new Hono<{
  Variables: {
    db: AppDb;
  };
}>();

/**
 * GET /api/tickets/:code
 * Public endpoint returning ticket details for the verified ticket code.
 * Strict rate limiting applied. Generic 404 returned if code does not exist.
 */
ticketsRouter.get("/:code", async (c) => {
  const db = c.get("db");
  const code = c.req.param("code");
  const ip =
    c.req.header("cf-connecting-ip") ||
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
    "127.0.0.1";

  // Rate limiting: max 30 requests per minute per IP
  const now = Date.now();
  const windowMs = 60 * 1000;
  const rateLimitKey = `ticket:${ip}`;

  try {
    const [existingRate] = await db
      .select()
      .from(rateLimit)
      .where(eq(rateLimit.key, rateLimitKey))
      .limit(1);

    if (existingRate) {
      if (now - existingRate.lastRequest < windowMs) {
        if (existingRate.count >= 30) {
          return c.json(
            {
              error: {
                code: "TOO_MANY_REQUESTS",
                message: "Too many ticket requests. Please try again later.",
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
    console.error("Ticket rate limit check error:", err);
  }

  if (!code || code.trim().length === 0) {
    return c.json(
      { error: { code: "NOT_FOUND", message: "Ticket not found" } },
      404,
    );
  }

  const ticket = await getPublicTicketByCode(db, code.trim());
  if (!ticket) {
    return c.json(
      { error: { code: "NOT_FOUND", message: "Ticket not found" } },
      404,
    );
  }

  return c.json({
    ok: true,
    ticket,
  });
});
