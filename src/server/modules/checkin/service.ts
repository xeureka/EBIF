import { eq, and, or, ilike, sql } from "drizzle-orm";
import { registrations, checkIns, user } from "../../db/schema";
import type { AppDb } from "../../db/client";
import { normalizeTicketCode, formatTicketCode, generateUniqueTicketCode } from "../tickets/code";
import type { EmailProvider } from "../email/provider";
import { sendConfirmationEmail } from "../email/service";

export interface AdminActor {
  id: string;
  name: string;
}

export type CheckInStatus = "checked_in" | "already_checked_in" | "not_found";

export interface CheckInResult {
  status: CheckInStatus;
  registration?: {
    id: string;
    fullName: string;
    organization: string;
    jobTitle: string;
    attendeeType: string;
    ticketCode: string;
    checkedInAt: string;
    checkedInBy: string;
    method: "qr" | "manual" | "walk_in";
  };
}

const ATTENDEE_TYPE_MAP: Record<string, string> = {
  company: "Company",
  investor: "Investor",
  government: "Government Institution",
  international_partner: "International Partner",
};

/**
 * Check-in by ticket code.
 * Race-safe insertion using ON CONFLICT (registration_id, event_day) DO NOTHING.
 */
export async function checkInByCode(
  db: AppDb,
  adminUser: AdminActor,
  params: { code: string; day: 1 | 2; method: "qr" | "manual" | "walk_in" },
): Promise<CheckInResult> {
  const normalized = normalizeTicketCode(params.code);
  const formatted = formatTicketCode(params.code);

  if (!normalized) {
    return { status: "not_found" };
  }

  // Lookup registration
  const [attendee] = await db
    .select()
    .from(registrations)
    .where(
      or(
        eq(registrations.ticketCode, formatted),
        eq(registrations.ticketCode, normalized),
      ),
    )
    .limit(1);

  if (!attendee) {
    return { status: "not_found" };
  }

  return processCheckInForAttendee(db, adminUser, attendee, params.day, params.method);
}

/**
 * Check-in by registration ID (manual check-in).
 */
export async function checkInByRegistration(
  db: AppDb,
  adminUser: AdminActor,
  params: { registrationId: string; day: 1 | 2 },
): Promise<CheckInResult> {
  const [attendee] = await db
    .select()
    .from(registrations)
    .where(eq(registrations.id, params.registrationId))
    .limit(1);

  if (!attendee) {
    return { status: "not_found" };
  }

  return processCheckInForAttendee(db, adminUser, attendee, params.day, "manual");
}

/**
 * Internal helper to atomically check-in an attendee row.
 */
async function processCheckInForAttendee(
  db: AppDb,
  adminUser: AdminActor,
  attendee: typeof registrations.$inferSelect,
  day: 1 | 2,
  method: "qr" | "manual" | "walk_in",
): Promise<CheckInResult> {
  const checkInId = crypto.randomUUID();
  const now = new Date();

  // Ensure attendee has a ticketCode if for any reason missing
  let ticketCode = attendee.ticketCode;
  if (!ticketCode) {
    ticketCode = await generateUniqueTicketCode(db);
    await db
      .update(registrations)
      .set({ ticketCode })
      .where(eq(registrations.id, attendee.id));
  }

  // Atomic conflict-safe insert
  const inserted = await db
    .insert(checkIns)
    .values({
      id: checkInId,
      registrationId: attendee.id,
      eventDay: day,
      checkedInAt: now,
      checkedInBy: adminUser.id,
      method,
    })
    .onConflictDoNothing()
    .returning();

  if (inserted.length > 0) {
    // Checked in first time
    return {
      status: "checked_in",
      registration: {
        id: attendee.id,
        fullName: attendee.fullName,
        organization: attendee.organization,
        jobTitle: attendee.jobTitle,
        attendeeType: attendee.attendeeType,
        ticketCode: formatTicketCode(ticketCode),
        checkedInAt: now.toISOString(),
        checkedInBy: adminUser.name,
        method,
      },
    };
  }

  // Already checked in: retrieve who checked in and when
  const [existing] = await db
    .select({
      checkedInAt: checkIns.checkedInAt,
      method: checkIns.method,
      adminName: user.name,
    })
    .from(checkIns)
    .leftJoin(user, eq(checkIns.checkedInBy, user.id))
    .where(
      and(
        eq(checkIns.registrationId, attendee.id),
        eq(checkIns.eventDay, day),
      ),
    )
    .limit(1);

  return {
    status: "already_checked_in",
    registration: {
      id: attendee.id,
      fullName: attendee.fullName,
      organization: attendee.organization,
      jobTitle: attendee.jobTitle,
      attendeeType: attendee.attendeeType,
      ticketCode: formatTicketCode(ticketCode),
      checkedInAt: (existing?.checkedInAt || now).toISOString(),
      checkedInBy: existing?.adminName || "Admin",
      method: (existing?.method || method) as "qr" | "manual" | "walk_in",
    },
  };
}

/**
 * Undoes a check-in record for a given registration and day.
 */
export async function undoCheckIn(
  db: AppDb,
  _adminUser: AdminActor,
  params: { registrationId: string; day: 1 | 2 },
): Promise<{ ok: boolean; undone: boolean }> {
  const deleted = await db
    .delete(checkIns)
    .where(
      and(
        eq(checkIns.registrationId, params.registrationId),
        eq(checkIns.eventDay, params.day),
      ),
    )
    .returning({ id: checkIns.id });

  return {
    ok: true,
    undone: deleted.length > 0,
  };
}

/**
 * Searches attendees for check-in by phone, email, name, organization.
 * Max 10 results, each with its checked-in status for that day.
 */
export async function searchAttendeesForCheckIn(
  db: AppDb,
  query: string,
  day: 1 | 2,
) {
  const cleanTerm = query.trim();
  if (!cleanTerm) {
    return [];
  }

  const term = `%${cleanTerm}%`;
  const digitsOnly = cleanTerm.replace(/\D/g, "");
  const phoneTerm = digitsOnly.length >= 3 ? `%${digitsOnly}%` : term;

  const results = await db
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
      checkInId: checkIns.id,
      checkedInAt: checkIns.checkedInAt,
      checkedInByName: user.name,
      checkInMethod: checkIns.method,
    })
    .from(registrations)
    .leftJoin(
      checkIns,
      and(
        eq(checkIns.registrationId, registrations.id),
        eq(checkIns.eventDay, day),
      ),
    )
    .leftJoin(user, eq(checkIns.checkedInBy, user.id))
    .where(
      or(
        ilike(registrations.phone, phoneTerm),
        ilike(registrations.email, term),
        ilike(registrations.fullName, term),
        ilike(registrations.organization, term),
        ilike(registrations.ticketCode, term),
      ),
    )
    .limit(10);

  return results.map((r) => ({
    id: r.id,
    fullName: r.fullName,
    email: r.email,
    phone: r.phone,
    organization: r.organization,
    jobTitle: r.jobTitle,
    attendeeType: r.attendeeType,
    ticketCode: r.ticketCode ? formatTicketCode(r.ticketCode) : null,
    reference: r.reference,
    isCheckedIn: !!r.checkInId,
    checkedInAt: r.checkedInAt ? r.checkedInAt.toISOString() : null,
    checkedInBy: r.checkedInByName || null,
    method: r.checkInMethod || null,
  }));
}

/**
 * Retrieves check-in stats for a given event day.
 */
export async function getCheckInStats(db: AppDb, day: 1 | 2) {
  const [totalRes, checkedInRes, byTypeRes] = await Promise.all([
    // Total attendees registered
    db.select({ count: sql<number>`count(*)::int` }).from(registrations),
    // Total checked in on this day
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(checkIns)
      .where(eq(checkIns.eventDay, day)),
    // Breakdown per attendee type
    db
      .select({
        attendeeType: registrations.attendeeType,
        total: sql<number>`count(distinct ${registrations.id})::int`,
        checkedIn: sql<number>`count(distinct ${checkIns.id})::int`,
      })
      .from(registrations)
      .leftJoin(
        checkIns,
        and(
          eq(checkIns.registrationId, registrations.id),
          eq(checkIns.eventDay, day),
        ),
      )
      .groupBy(registrations.attendeeType),
  ]);

  const total = totalRes[0]?.count || 0;
  const checkedIn = checkedInRes[0]?.count || 0;

  const byType: Record<string, { total: number; checkedIn: number }> = {};
  for (const row of byTypeRes) {
    byType[row.attendeeType] = {
      total: row.total,
      checkedIn: row.checkedIn,
    };
  }

  return {
    day,
    total,
    checkedIn,
    byType,
  };
}

/**
 * Registers a walk-in attendee, assigns ticket code, immediately checks them in,
 * and optionally dispatches confirmation email.
 */
export async function registerWalkIn(
  db: AppDb,
  adminUser: AdminActor,
  params: {
    fullName: string;
    email: string;
    phone: string;
    organization: string;
    jobTitle: string;
    attendeeType: string;
    agreesToContact: true;
    day: 1 | 2;
  },
  siteUrl: string,
  emailProvider?: EmailProvider,
) {
  // Check duplicate email
  const [existingUser] = await db
    .select({ id: registrations.id })
    .from(registrations)
    .where(sql`lower(${registrations.email}) = ${params.email.toLowerCase()}`)
    .limit(1);

  if (existingUser) {
    throw new Error("This email is already registered for the forum.");
  }

  // Format phone number to standard +251XXXXXXXXX
  const cleanDigits = params.phone.replace(/\D/g, "");
  const formattedPhone = `+251${cleanDigits}`;

  // Unique reference code
  const referenceHex = crypto.randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase();
  const reference = `EBIF-${referenceHex}`;
  const mappedType = ATTENDEE_TYPE_MAP[params.attendeeType] || "Company";

  // Generate unique ticket code
  const ticketCode = await generateUniqueTicketCode(db);
  const regId = crypto.randomUUID();
  const now = new Date();

  // Insert registration
  await db.insert(registrations).values({
    id: regId,
    fullName: params.fullName,
    email: params.email,
    phone: formattedPhone,
    organization: params.organization,
    jobTitle: params.jobTitle,
    attendeeType: mappedType,
    attendingDays: "Nov 28, Nov 29, 2026",
    reference,
    ticketCode,
    createdAt: now,
  });

  // Check in immediately with method 'walk_in'
  await db.insert(checkIns).values({
    id: crypto.randomUUID(),
    registrationId: regId,
    eventDay: params.day,
    checkedInAt: now,
    checkedInBy: adminUser.id,
    method: "walk_in",
  });

  // Send confirmation email asynchronously if email provider available
  if (emailProvider) {
    sendConfirmationEmail({
      db,
      attendee: {
        id: regId,
        fullName: params.fullName,
        email: params.email,
        organization: params.organization,
        ticketCode,
      },
      provider: emailProvider,
      siteUrl,
    }).catch((err) => console.error("Walk-in email error:", err));
  }

  return {
    ok: true,
    registration: {
      id: regId,
      fullName: params.fullName,
      email: params.email,
      phone: formattedPhone,
      organization: params.organization,
      jobTitle: params.jobTitle,
      attendeeType: mappedType,
      ticketCode: formatTicketCode(ticketCode),
      checkedInAt: now.toISOString(),
      checkedInBy: adminUser.name,
      method: "walk_in" as const,
    },
  };
}
