import fs from "node:fs";
import path from "node:path";
import { z } from "zod";

export const serverEnvSchema = z.object({
  DATABASE_URL: z.string().optional(),
  BETTER_AUTH_SECRET: z.string().optional(),
  BETTER_AUTH_URL: z.string().optional(),
  TRUSTED_ORIGINS: z.string().optional(),
  RESEND_API_KEY: z.string().trim().optional(),
  EMAIL_FROM: z
    .string()
    .trim()
    .refine(isValidEmailSetting, "must be a valid email address or display name with address")
    .default("Ethiopian Business & Investment Forum <events@nexabusinessgroup.com>"),
  EMAIL_REPLY_TO: z
    .string()
    .trim()
    .refine(isValidEmailSetting, "must be a valid email address")
    .default("events@nexabusinessgroup.com"),
  SITE_URL: z.string().trim().url().default("https://ebif.nexabusinessgroup.com"),
  NODE_ENV: z.string().optional(),
});

export type ServerEnvConfig = z.infer<typeof serverEnvSchema>;

function isValidEmailSetting(value: string): boolean {
  const address = value.match(/<([^<>]+)>$/)?.[1] || value;
  return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(address.trim());
}

function readLocalDotEnv(): Record<string, string> {
  try {
    const envPath = path.resolve(process.cwd(), ".env");
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf-8");
      const result: Record<string, string> = {};
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#")) {
          const eqIdx = trimmed.indexOf("=");
          if (eqIdx !== -1) {
            const key = trimmed.slice(0, eqIdx).trim();
            const val = trimmed
              .slice(eqIdx + 1)
              .trim()
              .replace(/^["']|["']$/g, "");
            result[key] = val;
          }
        }
      }
      return result;
    }
  } catch {
    // In Cloudflare Workers or environments where filesystem is absent, ignore
  }
  return {};
}

/**
 * Validates and normalizes server environment variables.
 * In development / Node, dynamically reads from .env and process.env.
 * In Cloudflare Workers, bindings passed via raw take priority.
 */
export function getServerEnv(raw?: Record<string, string | undefined>): ServerEnvConfig {
  const localEnv = readLocalDotEnv();
  const processEnv = typeof process === "undefined" ? {} : process.env;
  const merged: Record<string, string | undefined> = {
    ...localEnv,
    ...processEnv,
  };

  if (raw && typeof raw === "object") {
    for (const [key, val] of Object.entries(raw)) {
      if (val !== undefined && val !== "") {
        merged[key] = val;
      }
    }
  }

  const result = serverEnvSchema.safeParse(merged);
  if (!result.success) {
    console.warn("Invalid server environment configuration; using safe email defaults.");
    return {
      DATABASE_URL: merged.DATABASE_URL,
      BETTER_AUTH_SECRET: merged.BETTER_AUTH_SECRET,
      BETTER_AUTH_URL: merged.BETTER_AUTH_URL,
      TRUSTED_ORIGINS: merged.TRUSTED_ORIGINS,
      RESEND_API_KEY: merged.RESEND_API_KEY,
      EMAIL_FROM: isValidEmailSetting(merged.EMAIL_FROM || "")
        ? merged.EMAIL_FROM!
        : "Ethiopian Business & Investment Forum <events@nexabusinessgroup.com>",
      EMAIL_REPLY_TO: isValidEmailSetting(merged.EMAIL_REPLY_TO || "")
        ? merged.EMAIL_REPLY_TO!
        : "events@nexabusinessgroup.com",
      SITE_URL: /^https?:\/\//.test(merged.SITE_URL || "")
        ? merged.SITE_URL!
        : "https://ebif.nexabusinessgroup.com",
    };
  }
  return result.data;
}
