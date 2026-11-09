/**
 * Client-safe helpers for turning whatever a QR decoder returns into a
 * normalized ticket code.
 *
 * Ticket codes are 12 Crockford Base32 characters (I, L, O and U are never
 * generated). The value is displayed with dashes (`K7M2-9QXA-4TWB`) but the
 * API accepts it with or without separators, in any case.
 *
 * QR payloads seen in practice are not always the bare code: links to
 * `/ticket/<code>`, `?code=...` query strings, JSON and prefixed strings are
 * common. Parsing lives here so the camera, file upload and manual entry paths
 * all normalise the payload the same way.
 */

export const TICKET_CODE_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
export const TICKET_CODE_LENGTH = 12;

const TICKET_CODE_PATTERN = /^[0-9A-HJKMNP-TV-Z]{12}$/;

export class InvalidQrPayloadError extends Error {
  readonly rawPayload: string;

  constructor(rawPayload: string) {
    super("This QR code does not contain a valid ticket code.");
    this.name = "InvalidQrPayloadError";
    this.rawPayload = rawPayload;
  }
}

function toCandidateCode(value: string): string | null {
  const normalized = value
    .normalize("NFKC")
    .replace(/[^0-9A-Za-z]/g, "")
    .toUpperCase();

  if (normalized.length !== TICKET_CODE_LENGTH) return null;
  if (!TICKET_CODE_PATTERN.test(normalized)) return null;
  return normalized;
}

function collectUrlCandidates(raw: string, out: string[]): void {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return;
  }

  for (const key of ["code", "ticket", "ticketCode", "ticket_code", "t"]) {
    const value = url.searchParams.get(key);
    if (value) out.push(value);
  }

  const segments = url.pathname.split("/").filter(Boolean);
  const ticketIndex = segments.findIndex((segment) => /^tickets?$/i.test(segment));
  if (ticketIndex >= 0 && segments[ticketIndex + 1]) {
    out.push(decodeURIComponent(segments[ticketIndex + 1]));
  }
  if (segments.length > 0) {
    out.push(decodeURIComponent(segments[segments.length - 1]));
  }

  const hash = url.hash.replace(/^#/, "");
  if (hash) out.push(hash);
}

function collectJsonCandidates(value: unknown, out: string[], depth = 0): void {
  if (depth > 5 || value === null || value === undefined) return;

  if (typeof value === "string") {
    out.push(value);
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) collectJsonCandidates(item, out, depth + 1);
    return;
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["ticketCode", "ticket_code", "ticket", "code", "t", "id"]) {
      const candidate = record[key];
      if (typeof candidate === "string") out.push(candidate);
    }
    for (const nested of Object.values(record)) {
      if (nested && typeof nested === "object") {
        collectJsonCandidates(nested, out, depth + 1);
      }
    }
  }
}

/**
 * Parses a raw QR payload into a normalized 12-character ticket code.
 *
 * Accepts: raw code with/without dashes, any letter case, surrounding
 * whitespace/newlines, ticket URLs, query strings, JSON payloads and common
 * `TICKET: ...` / `code=...` prefixes.
 *
 * @throws {InvalidQrPayloadError} when no valid ticket code can be found.
 */
export function parseTicketFromQr(rawText: string): string {
  const raw = typeof rawText === "string" ? rawText.replace(/\uFEFF/g, "").trim() : "";

  if (!raw) {
    throw new InvalidQrPayloadError(typeof rawText === "string" ? rawText : "");
  }

  const candidates: string[] = [raw];

  collectUrlCandidates(raw, candidates);

  if (/^[[{]/.test(raw)) {
    try {
      collectJsonCandidates(JSON.parse(raw), candidates);
    } catch {
      // Not JSON after all; the other strategies still apply.
    }
  }

  for (const match of raw.matchAll(
    /(?:ticket(?:_?code)?|code|t)\s*[:=#]\s*["']?([^"';\n\r]{8,80})/gi,
  )) {
    candidates.push(match[1]);
  }

  for (const match of raw.match(/[0-9A-Za-z]{4}[\s-]?[0-9A-Za-z]{4}[\s-]?[0-9A-Za-z]{4}/g) ?? []) {
    candidates.push(match);
  }

  for (const candidate of candidates) {
    const code = toCandidateCode(candidate);
    if (code) return code;
  }

  throw new InvalidQrPayloadError(raw);
}
