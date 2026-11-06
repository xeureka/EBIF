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

export type ServerEnvPresence = Record<
  "RESEND_API_KEY" | "EMAIL_FROM" | "EMAIL_REPLY_TO" | "SITE_URL",
  boolean
>;

export interface ParsedEmailAddress {
  address: string;
  domain: string;
  displayName: string;
}

export function stripSurroundingQuotes(value: string): string {
  const trimmed = value.trim();
  if (
    trimmed.length >= 2 &&
    ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'")))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

export function parseEmailAddress(value: string): ParsedEmailAddress | null {
  const normalized = stripSurroundingQuotes(value);
  const match = normalized.match(/^(?:(.+?)\s+)?<([^<>\s@]+@[^<>\s@]+)>$/);
  const address = match?.[2] || normalized;
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(address)) return null;
  return {
    address,
    domain: address.slice(address.lastIndexOf("@") + 1).toLowerCase(),
    displayName: match?.[1]?.trim() || "",
  };
}

function isValidEmailSetting(value: string): boolean {
  return parseEmailAddress(value) !== null;
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
            const val = stripSurroundingQuotes(trimmed.slice(eqIdx + 1));
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

export function getServerEnvPresence(
  raw?: Record<string, string | undefined>,
): ServerEnvPresence {
  const localEnv = readLocalDotEnv();
  const processEnv = typeof process === "undefined" ? {} : process.env;
  const runtimeEnv: Record<string, string | undefined> = {};
  const keys: Array<keyof ServerEnvPresence> = [
    "RESEND_API_KEY",
    "EMAIL_FROM",
    "EMAIL_REPLY_TO",
    "SITE_URL",
  ];
  for (const key of keys) {
    const value = raw?.[key];
    if (typeof value === "string" && value.trim()) {
      runtimeEnv[key] = stripSurroundingQuotes(value);
    }
  }
  const source = Object.keys(runtimeEnv).length > 0 ? runtimeEnv : { ...localEnv, ...processEnv };
  return {
    RESEND_API_KEY: Boolean(source.RESEND_API_KEY?.trim()),
    EMAIL_FROM: Boolean(source.EMAIL_FROM?.trim()),
    EMAIL_REPLY_TO: Boolean(source.EMAIL_REPLY_TO?.trim()),
    SITE_URL: Boolean(source.SITE_URL?.trim()),
  };
}

/**
 * Validates and normalizes server environment variables.
 * In development / Node, dynamically reads from .env and process.env.
 * In Cloudflare Workers, bindings passed via raw take priority.
 */
export function getServerEnv(raw?: Record<string, string | undefined>): ServerEnvConfig {
  const localEnv = readLocalDotEnv();
  const processEnv = typeof process === "undefined" ? {} : process.env;
  const runtimeEnv: Record<string, string | undefined> = {};

  if (raw && typeof raw === "object") {
    for (const [key, val] of Object.entries(raw)) {
      if (typeof val === "string" && val !== "") {
        runtimeEnv[key] = stripSurroundingQuotes(val);
      }
    }
  }

  const merged: Record<string, string | undefined> =
    Object.keys(runtimeEnv).length > 0 ? runtimeEnv : { ...localEnv, ...processEnv };

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
        ? stripSurroundingQuotes(merged.EMAIL_FROM!)
        : "Ethiopian Business & Investment Forum <events@nexabusinessgroup.com>",
      EMAIL_REPLY_TO: isValidEmailSetting(merged.EMAIL_REPLY_TO || "")
        ? stripSurroundingQuotes(merged.EMAIL_REPLY_TO!)
        : "events@nexabusinessgroup.com",
      SITE_URL: /^https?:\/\//.test(merged.SITE_URL || "")
        ? merged.SITE_URL!
        : "https://ebif.nexabusinessgroup.com",
    };
  }
  return result.data;
}
