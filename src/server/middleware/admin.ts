import { createMiddleware } from "hono/factory";
import { eq } from "drizzle-orm";
import { user } from "../db/schema";
import type { AppDb } from "../db/client";
import type { Auth } from "../auth";

export interface AdminContextEnv {
  Variables: {
    db: AppDb;
    auth: Auth;
    adminUser: {
      id: string;
      name: string;
      email: string;
      role: string;
      banned: boolean;
    };
    session: {
      id: string;
      userId: string;
    };
  };
}

export const requireAdmin = createMiddleware<AdminContextEnv>(async (c, next) => {
  const auth = c.get("auth");
  const db = c.get("db");

  if (!auth || !db) {
    return c.json(
      { error: { code: "INTERNAL_ERROR", message: "Server context uninitialized" } },
      500,
    );
  }

  const sessionData = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (!sessionData || !sessionData.user) {
    return c.json(
      { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
      401,
    );
  }

  // Double-check real-time database state to immediately revoke disabled admins
  const [dbUser] = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      banned: user.banned,
    })
    .from(user)
    .where(eq(user.id, sessionData.user.id))
    .limit(1);

  if (!dbUser || dbUser.role !== "admin" || dbUser.banned) {
    return c.json(
      {
        error: {
          code: "FORBIDDEN",
          message: "Account is disabled or lacks administrative privileges",
        },
      },
      403,
    );
  }

  c.set("adminUser", dbUser);
  c.set("session", sessionData.session);

  await next();
});
