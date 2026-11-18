import { and, asc, eq, gte, lt } from "drizzle-orm";
import { checkIns, registrations } from "../../../db/schema";
import type { AppDb } from "../../../db/client";
import { getAddisDate, getAddisDayWindow } from "./date";

export type AttendeeExportRepositoryRow = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  organization: string;
  jobTitle: string;
  attendeeType: string;
  ticketCode: string | null;
  reference: string;
  createdAt: Date;
  eventDay: number | null;
  day1CheckedIn: boolean;
  day2CheckedIn: boolean;
};

export async function getFirstRegistrationDate(db: AppDb): Promise<string | null> {
  const [first] = await db
    .select({ createdAt: registrations.createdAt })
    .from(registrations)
    .orderBy(asc(registrations.createdAt))
    .limit(1);

  return first ? getAddisDate(first.createdAt) : null;
}

export async function getRegistrationsForDate(
  db: AppDb,
  date: string,
): Promise<AttendeeExportRepositoryRow[]> {
  const { start, end } = getAddisDayWindow(date);
  const dayOneRows = await db
    .select({
      id: registrations.id,
      fullName: registrations.fullName,
      email: registrations.email,
      phone: registrations.phone,
      organization: registrations.organization,
      jobTitle: registrations.jobTitle,
      attendeeType: registrations.attendeeType,
      ticketCode: registrations.ticketCode,
      reference: registrations.reference,
      createdAt: registrations.createdAt,
      eventDay: checkIns.eventDay,
    })
    .from(registrations)
    .leftJoin(
      checkIns,
      and(eq(checkIns.registrationId, registrations.id), eq(checkIns.eventDay, 1)),
    )
    .where(and(gte(registrations.createdAt, start), lt(registrations.createdAt, end)))
    .orderBy(asc(registrations.createdAt), asc(registrations.id));

  const dayTwoRows = await db
    .select({ registrationId: checkIns.registrationId })
    .from(checkIns)
    .innerJoin(registrations, eq(checkIns.registrationId, registrations.id))
    .where(
      and(
        eq(checkIns.eventDay, 2),
        gte(registrations.createdAt, start),
        lt(registrations.createdAt, end),
      ),
    );
  const dayTwoIds = new Set(dayTwoRows.map((row) => row.registrationId));

  return dayOneRows.map((row) => ({
    ...row,
    eventDay: row.eventDay ?? null,
    day1CheckedIn: row.eventDay === 1,
    day2CheckedIn: dayTwoIds.has(row.id),
  }));
}
