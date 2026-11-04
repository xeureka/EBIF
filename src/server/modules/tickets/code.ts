import { eq, or } from "drizzle-orm";
import { registrations } from "../../db/schema";
import type { AppDb } from "../../db/client";

/**
 * Crockford Base32 alphabet: 32 characters.
 * Excludes I, L, O, U to prevent visual confusion and accidental profanity.
 */
export const CROCKFORD_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/**
 * Normalizes a ticket code by removing dashes and whitespace and converting to uppercase.
 */
export function normalizeTicketCode(code: string): string {
  if (!code) return "";
  return code.replace(/[\s-]/g, "").toUpperCase();
}

/**
 * Formats a 12-character normalized ticket code into 3 groups of 4: e.g. K7M2-9QXA-4TWB.
 */
export function formatTicketCode(code: string): string {
  const clean = normalizeTicketCode(code);
  if (clean.length !== 12) {
    return clean;
  }
  return `${clean.slice(0, 4)}-${clean.slice(4, 8)}-${clean.slice(8, 12)}`;
}

/**
 * Validates that a string is a valid 12-character Crockford Base32 code (ignoring spaces/dashes).
 */
export function isValidTicketCode(code: string): boolean {
  const clean = normalizeTicketCode(code);
  if (clean.length !== 12) return false;
  for (let i = 0; i < clean.length; i++) {
    if (!CROCKFORD_ALPHABET.includes(clean[i])) {
      return false;
    }
  }
  return true;
}

/**
 * Generates a single raw 12-character Crockford Base32 ticket code formatted as XXXX-XXXX-XXXX.
 */
export function generateTicketCode(): string {
  const randomBytes = new Uint8Array(12);
  crypto.getRandomValues(randomBytes);

  let raw = "";
  for (let i = 0; i < 12; i++) {
    raw += CROCKFORD_ALPHABET[randomBytes[i] % 32];
  }
  return formatTicketCode(raw);
}

/**
 * Generates a unique ticket code, checking against database registrations with collision retry.
 */
export async function generateUniqueTicketCode(
  db: AppDb,
  maxRetries = 5,
): Promise<string> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const candidate = generateTicketCode();
    const normalized = normalizeTicketCode(candidate);

    // Check collision against both formatted and unformatted forms
    const existing = await db
      .select({ id: registrations.id })
      .from(registrations)
      .where(
        or(
          eq(registrations.ticketCode, candidate),
          eq(registrations.ticketCode, normalized),
        ),
      )
      .limit(1);

    if (existing.length === 0) {
      return candidate;
    }
  }

  throw new Error("Failed to generate a unique ticket code after multiple attempts");
}
