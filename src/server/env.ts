import { z } from "zod";

export const serverEnvSchema = z.object({
  DATABASE_URL: z.string().optional(),
  BETTER_AUTH_SECRET: z.string().optional(),
  BETTER_AUTH_URL: z.string().optional(),
  TRUSTED_ORIGINS: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default("Ethiopian Business & Investment Forum <noreply@nexabusinessgroup.com>"),
  EMAIL_REPLY_TO: z.string().default("contact@nexabusinessgroup.com"),
  SITE_URL: z.string().default("https://ebif.nexabusinessgroup.com"),
});

export type ServerEnvConfig = z.infer<typeof serverEnvSchema>;

/**
 * Validates and normalizes server environment variables from the given binding/process.env.
 */
export function getServerEnv(raw: Record<string, string | undefined> = process.env): ServerEnvConfig {
  const result = serverEnvSchema.safeParse(raw);
  if (!result.success) {
    console.warn("Server environment warning:", result.error.format());
    return {
      EMAIL_FROM: raw.EMAIL_FROM || "Ethiopian Business & Investment Forum <noreply@nexabusinessgroup.com>",
      EMAIL_REPLY_TO: raw.EMAIL_REPLY_TO || "contact@nexabusinessgroup.com",
      SITE_URL: raw.SITE_URL || "https://ebif.nexabusinessgroup.com",
      ...raw,
    };
  }
  return result.data;
}
