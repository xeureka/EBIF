import { eq } from "drizzle-orm";
import { registrations, emailLog } from "../../db/schema";
import type { AppDb } from "../../db/client";
import { generateUniqueTicketCode } from "../tickets/code";
import { parseEmailAddress } from "../../env";
import type { EmailProvider } from "./provider";
import { renderConfirmationEmail } from "./template";

export interface EmailRuntimeEnv {
  RESEND_API_KEY?: string;
  EMAIL_FROM: string;
  EMAIL_REPLY_TO: string;
  SITE_URL: string;
  NODE_ENV?: string;
}

export interface EmailAttemptResult {
  ok: boolean;
  providerId?: string;
  error?: string;
  errorName?: string;
  step?: string;
}

function truncateMessage(message: string): string {
  return message.trim().slice(0, 300);
}

function exceptionMessage(step: string, error: unknown): string {
  const name = error instanceof Error ? error.name || "Error" : "UnknownError";
  const message = error instanceof Error ? error.message : String(error);
  return step + ": " + name + ": " + truncateMessage(message);
}

function logAttempt(
  registrationId: string,
  step: string,
  status: "sent" | "failed",
  resendErrorName?: string,
): void {
  console.log(
    JSON.stringify({
      event: "email_attempt",
      registrationId,
      step,
      status,
      resendErrorName: resendErrorName || null,
    }),
  );
}

async function writeEmailLog(
  db: AppDb,
  registrationId: string,
  result: { status: "sent" | "failed"; providerId?: string; error?: string },
): Promise<void> {
  await db.insert(emailLog).values({
    id: crypto.randomUUID(),
    registrationId,
    type: "confirmation",
    status: result.status,
    providerId: result.providerId || null,
    error: result.error || null,
    createdAt: new Date(),
  });
}

async function failedAttempt(
  db: AppDb,
  registrationId: string,
  step: string,
  error: string,
  errorName?: string,
): Promise<EmailAttemptResult> {
  const safeError = error;
  try {
    await writeEmailLog(db, registrationId, { status: "failed", error: safeError });
  } catch {
    console.error(
      JSON.stringify({ event: "email_log", registrationId, step: "email_log", status: "failed" }),
    );
  }
  logAttempt(registrationId, step, "failed", errorName);
  return { ok: false, error: safeError, errorName, step };
}

export async function sendConfirmationEmail(params: {
  db: AppDb;
  registrationId: string;
  env: EmailRuntimeEnv;
  provider: EmailProvider;
  idempotencyKey?: string;
}): Promise<EmailAttemptResult> {
  const {
    db,
    registrationId,
    env,
    provider,
    idempotencyKey = "confirmation-" + registrationId,
  } = params;

  let registration: typeof registrations.$inferSelect | undefined;
  try {
    [registration] = await db
      .select()
      .from(registrations)
      .where(eq(registrations.id, registrationId))
      .limit(1);
  } catch (error) {
    return failedAttempt(db, registrationId, "load_registration", exceptionMessage("load_registration", error));
  }

  if (!registration) {
    return failedAttempt(
      db,
      registrationId,
      "load_registration",
      "load_registration: RegistrationNotFound: registration does not exist",
      "RegistrationNotFound",
    );
  }

  if (!parseEmailAddress(registration.email)) {
    return failedAttempt(
      db,
      registrationId,
      "recipient_validation",
      "recipient_validation: InvalidRecipientEmail: stored email is invalid",
      "InvalidRecipientEmail",
    );
  }

  if (!parseEmailAddress(env.EMAIL_FROM) || !parseEmailAddress(env.EMAIL_REPLY_TO)) {
    return failedAttempt(
      db,
      registrationId,
      "env",
      "env: InvalidEmailConfiguration: EMAIL_FROM or EMAIL_REPLY_TO does not parse",
      "InvalidEmailConfiguration",
    );
  }

  let ticketCode = registration.ticketCode;
  if (!ticketCode) {
    try {
      ticketCode = await generateUniqueTicketCode(db);
      await db
        .update(registrations)
        .set({ ticketCode })
        .where(eq(registrations.id, registrationId));
    } catch (error) {
      return failedAttempt(db, registrationId, "ticket_code", exceptionMessage("ticket_code", error));
    }
  }

  let rendered;
  try {
    rendered = await renderConfirmationEmail({
      attendeeName: registration.fullName,
      organization: registration.organization,
      ticketCode,
      siteUrl: env.SITE_URL,
    });
  } catch (error) {
    return failedAttempt(db, registrationId, "render_template", exceptionMessage("render_template", error));
  }

  let providerResult;
  try {
    providerResult = await provider.sendEmail({
      to: registration.email,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      attachments: rendered.attachments,
      idempotencyKey,
    });
  } catch (error) {
    return failedAttempt(db, registrationId, "resend_request", exceptionMessage("resend_request", error));
  }

  if (!providerResult.ok) {
    return failedAttempt(
      db,
      registrationId,
      "resend_request",
      "resend_request: " + (providerResult.error || "ResendRequestError: request failed"),
      providerResult.errorName,
    );
  }

  const warning = rendered.attachmentWarning
    ? "attachment_skipped: " + rendered.attachmentWarning
    : undefined;
  try {
    await writeEmailLog(db, registrationId, {
      status: "sent",
      providerId: providerResult.providerId,
      error: warning,
    });
  } catch {
    console.error(
      JSON.stringify({ event: "email_log", registrationId, step: "email_log", status: "failed" }),
    );
  }
  logAttempt(registrationId, "resend_request", "sent");
  return { ok: true, providerId: providerResult.providerId, error: warning };
}
