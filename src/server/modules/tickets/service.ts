import { eq, or } from "drizzle-orm";
import { registrations } from "../../db/schema";
import type { AppDb } from "../../db/client";
import { event } from "../../../data/event";
import { normalizeTicketCode, formatTicketCode } from "./code";

export interface PublicTicketInfo {
  eventName: string;
  dates: string;
  venue: string;
  attendeeName: string;
  attendeeType: string;
  ticketCode: string;
}

/**
 * Retrieves public ticket info by ticket code.
 * Only returns minimal non-sensitive event and attendee information:
 * event name, dates, venue, attendee name, attendee type, and ticket code.
 * Never returns email, phone, or other attendee details.
 */
export async function getPublicTicketByCode(
  db: AppDb,
  rawCode: string,
): Promise<PublicTicketInfo | null> {
  const normalized = normalizeTicketCode(rawCode);
  const formatted = formatTicketCode(rawCode);

  if (!normalized) return null;

  const [record] = await db
    .select({
      id: registrations.id,
      fullName: registrations.fullName,
      attendeeType: registrations.attendeeType,
      ticketCode: registrations.ticketCode,
    })
    .from(registrations)
    .where(
      or(
        eq(registrations.ticketCode, formatted),
        eq(registrations.ticketCode, normalized),
      ),
    )
    .limit(1);

  if (!record || !record.ticketCode) {
    return null;
  }

  return {
    eventName: event.name,
    dates: event.dates,
    venue: event.venueWithCity,
    attendeeName: record.fullName,
    attendeeType: record.attendeeType,
    ticketCode: formatTicketCode(record.ticketCode),
  };
}
