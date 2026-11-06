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

export type ServerEnvSource = Record<string, string | undefined>;

function normalizeSource(raw: ServerEnvSource): ServerEnvSource {
  const source: ServerEnvSource = {};
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "string" && value !== "") {
      source[key] = stripSurroundingQuotes(value);
    }
  }
  return source;
}

const workerBindingKeys = [
  "DATABASE_URL",
  "BETTER_AUTH_SECRET",
  "BETTER_AUTH_URL",
  "TRUSTED_ORIGINS",
  "RESEND_API_KEY",
  "EMAIL_FROM",
  "EMAIL_REPLY_TO",
  "SITE_URL",
  "NODE_ENV",
] as const;

function readWorkerBindings(raw: ServerEnvSource = {}): ServerEnvSource {
  const source: ServerEnvSource = {};
  for (const key of workerBindingKeys) {
    const value = raw[key];
    if (typeof value === "string" && value !== "") source[key] = value;
  }
  return source;
}

export function parseServerEnv(raw: ServerEnvSource): ServerEnvConfig {
  const source = normalizeSource(raw);
  const result = serverEnvSchema.safeParse(source);
  if (result.success) return result.data;

  console.warn("Invalid server environment configuration; using safe email defaults.");
  return {
    DATABASE_URL: source.DATABASE_URL,
    BETTER_AUTH_SECRET: source.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: source.BETTER_AUTH_URL,
    TRUSTED_ORIGINS: source.TRUSTED_ORIGINS,
    RESEND_API_KEY: source.RESEND_API_KEY,
    EMAIL_FROM: isValidEmailSetting(source.EMAIL_FROM || "")
      ? stripSurroundingQuotes(source.EMAIL_FROM!)
      : "Ethiopian Business & Investment Forum <events@nexabusinessgroup.com>",
    EMAIL_REPLY_TO: isValidEmailSetting(source.EMAIL_REPLY_TO || "")
      ? stripSurroundingQuotes(source.EMAIL_REPLY_TO!)
      : "events@nexabusinessgroup.com",
    SITE_URL: /^https?:\/\//.test(source.SITE_URL || "")
      ? source.SITE_URL!
      : "https://ebif.nexabusinessgroup.com",
  };
}

export function getWorkerEnv(raw?: ServerEnvSource): ServerEnvConfig {
  return parseServerEnv(readWorkerBindings(raw));
}

export function getWorkerEnvPresence(raw?: ServerEnvSource): ServerEnvPresence {
  const source = normalizeSource(readWorkerBindings(raw));
  return {
    RESEND_API_KEY: Boolean(source.RESEND_API_KEY?.trim()),
    EMAIL_FROM: Boolean(source.EMAIL_FROM?.trim()),
    EMAIL_REPLY_TO: Boolean(source.EMAIL_REPLY_TO?.trim()),
    SITE_URL: Boolean(source.SITE_URL?.trim()),
  };
}
