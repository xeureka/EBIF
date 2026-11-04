import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { dbSchema } from "./db/schema";
import type { AppDb } from "./db/client";

export interface AuthEnv {
  BETTER_AUTH_SECRET?: string;
  BETTER_AUTH_URL?: string;
  TRUSTED_ORIGINS?: string;
  NODE_ENV?: string;
}

export function createAuth(db: AppDb, env: AuthEnv = {}) {
  const isProd =
    env.NODE_ENV === "production" || process.env.NODE_ENV === "production";

  const trustedOrigins = [
    "https://ebif.nexabusinessgroup.com",
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
  ];

  if (env.TRUSTED_ORIGINS) {
    const custom = env.TRUSTED_ORIGINS.split(",").map((s) => s.trim());
    for (const origin of custom) {
      if (origin && !trustedOrigins.includes(origin)) {
        trustedOrigins.push(origin);
      }
    }
  }

  const secret =
    env.BETTER_AUTH_SECRET ||
    process.env.BETTER_AUTH_SECRET ||
    "fallback-secret-development-key-32chars";

  const baseURL =
    env.BETTER_AUTH_URL ||
    process.env.BETTER_AUTH_URL ||
    "http://localhost:8080";

  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        user: dbSchema.user,
        session: dbSchema.session,
        account: dbSchema.account,
        verification: dbSchema.verification,
        rateLimit: dbSchema.rateLimit,
      },
    }),
    baseURL,
    basePath: "/api/auth",
    secret,
    trustedOrigins,
    emailAndPassword: {
      enabled: true,
      disableSignUp: true, // Public registration strictly disabled
      minPasswordLength: 8,
      maxPasswordLength: 128,
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30, // 30-day persistent session
      updateAge: 60 * 60 * 24, // Sliding refresh (daily)
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60,
      },
    },
    advanced: {
      useSecureCookies: isProd,
      defaultCookieAttributes: {
        httpOnly: true,
        secure: isProd,
        sameSite: "lax",
        path: "/",
      },
    },
    rateLimit: {
      enabled: true,
      window: 60,
      max: 10,
      customRules: {
        "/sign-in/email": {
          window: 60,
          max: 5, // Stricter for sign-in
        },
      },
    },
    user: {
      additionalFields: {
        role: {
          type: "string",
          defaultValue: "user",
          required: false,
        },
        banned: {
          type: "boolean",
          defaultValue: false,
          required: false,
        },
        banReason: {
          type: "string",
          required: false,
        },
        banExpires: {
          type: "date",
          required: false,
        },
      },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
