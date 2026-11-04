import { Hono } from "hono";
import { secureHeaders } from "hono/secure-headers";
import { cors } from "hono/cors";
import { createDbContext, closeDbContext, type AppDb } from "./db/client";
import { createAuth, type Auth } from "./auth";
import { registrationsRouter } from "./routes/registrations";
import { adminRouter } from "./routes/admin";
import { ticketsRouter } from "./routes/tickets";
import { recordAuditLog } from "./utils/audit";

export interface ServerEnv {
  Bindings: {
    DATABASE_URL?: string;
    BETTER_AUTH_SECRET?: string;
    BETTER_AUTH_URL?: string;
    TRUSTED_ORIGINS?: string;
    NODE_ENV?: string;
    ASSETS?: {
      fetch: (request: Request) => Promise<Response>;
    };
  };
  Variables: {
    db: AppDb;
    auth: Auth;
    adminUser?: {
      id: string;
      name: string;
      email: string;
      role: string;
      banned: boolean;
    };
    session?: {
      id: string;
      userId: string;
    };
  };
}

export const app = new Hono<ServerEnv>();

// 1. Security Headers
app.use("*", secureHeaders());

// 2. CORS (Restricted to same-origin in production, dev-origin in development)
const isDev = process.env.NODE_ENV !== "production";
if (isDev) {
  app.use(
    "/api/*",
    cors({
      origin: (origin) => {
        const allowed = [
          "http://localhost:8080",
          "http://127.0.0.1:8080",
          "http://localhost:5173",
          "http://127.0.0.1:5173",
        ];
        if (!origin || allowed.includes(origin)) {
          return origin || "http://localhost:8080";
        }
        return null;
      },
      credentials: true,
      allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
      allowHeaders: ["Content-Type", "Authorization"],
    }),
  );
}

// 3. Centralized Database & Auth lifecycle middleware per request
app.use("/api/*", async (c, next) => {
  const dbUrl = c.env?.DATABASE_URL || process.env.DATABASE_URL;

  if (!dbUrl) {
    return c.json(
      {
        error: {
          code: "CONFIG_ERROR",
          message: "Database connection is not configured",
        },
      },
      500,
    );
  }

  let dbContext;
  try {
    dbContext = await createDbContext(dbUrl);
  } catch (err) {
    console.error("Failed to connect to PostgreSQL:", err);
    return c.json(
      {
        error: {
          code: "DB_CONNECTION_ERROR",
          message: "Failed to connect to database service",
        },
      },
      500,
    );
  }

  c.set("db", dbContext.db);

  const auth = createAuth(dbContext.db, {
    BETTER_AUTH_SECRET: c.env?.BETTER_AUTH_SECRET || process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: c.env?.BETTER_AUTH_URL || process.env.BETTER_AUTH_URL,
    TRUSTED_ORIGINS: c.env?.TRUSTED_ORIGINS || process.env.TRUSTED_ORIGINS,
    NODE_ENV: c.env?.NODE_ENV || process.env.NODE_ENV,
  });

  c.set("auth", auth);

  try {
    await next();
  } finally {
    await closeDbContext(dbContext);
  }
});

// 4. Mount Better Auth handler at /api/auth/*
app.on(["POST", "GET"], "/api/auth/**", async (c) => {
  const auth = c.get("auth");
  const db = c.get("db");

  if (!auth) {
    return c.json(
      { error: { code: "AUTH_INIT_ERROR", message: "Auth service not initialized" } },
      500,
    );
  }

  const isSignIn = c.req.path.includes("/sign-in/email");
  const response = await auth.handler(c.req.raw);

  // If this is a login attempt, record audit log
  if (isSignIn && db) {
    const ip =
      c.req.header("cf-connecting-ip") ||
      c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
      "127.0.0.1";
    const userAgent = c.req.header("user-agent") || null;

    if (response.ok) {
      await recordAuditLog({
        db,
        action: "LOGIN_SUCCESS",
        targetType: "session",
        ip,
        userAgent,
      });
    } else {
      await recordAuditLog({
        db,
        action: "LOGIN_FAILURE",
        targetType: "session",
        ip,
        userAgent,
        metadata: { reason: "invalid_credentials" },
      });

      // Ensure generic error message on every login failure
      return c.json(
        {
          error: {
            code: "INVALID_CREDENTIALS",
            message: "Invalid email or password",
          },
        },
        401,
      );
    }
  }

  return response;
});

// 5. Mount API feature routers
app.route("/api/registrations", registrationsRouter);
app.route("/api/tickets", ticketsRouter);
app.route("/api/admin", adminRouter);

// 6. Global error handler: strict structure { error: { code, message } } with no stack traces or SQL leaked
app.onError((err, c) => {
  console.error("API error uncaught:", err);
  return c.json(
    {
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred. Please try again.",
      },
    },
    500,
  );
});

// 7. 404 for unknown /api/* routes
app.all("/api/*", (c) => {
  return c.json(
    {
      error: {
        code: "NOT_FOUND",
        message: "Endpoint not found",
      },
    },
    404,
  );
});
