import { emailLog } from "../../db/schema";
import type { AppDb } from "../../db/client";
import type { EmailProvider } from "./provider";
import { renderConfirmationEmail } from "./template";

export interface AttendeeEmailData {
  id: string;
  fullName: string;
  email: string;
  organization?: string;
  ticketCode: string;
}

/**
 * Sends a confirmation email to the attendee and logs the attempt into public.email_log.
 * Never throws an uncaught error to ensure the calling flow is resilient.
 */
export async function sendConfirmationEmail(params: {
  db: AppDb;
  attendee: AttendeeEmailData;
  provider: EmailProvider;
  siteUrl: string;
  idempotencyKey?: string;
}): Promise<{ ok: boolean; providerId?: string; error?: string }> {
  const {
    db,
    attendee,
    provider,
    siteUrl,
    idempotencyKey = `confirmation-${params.attendee.id}`,
  } = params;

  try {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(attendee.email.trim())) {
      throw new Error("Invalid recipient email");
    }

    const rendered = await renderConfirmationEmail({
      attendeeName: attendee.fullName,
      organization: attendee.organization,
      ticketCode: attendee.ticketCode,
      siteUrl,
    });

    const result = await provider.sendEmail({
      to: attendee.email,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      attachments: rendered.attachments,
      idempotencyKey,
    });

    // Record in email_log
    await db.insert(emailLog).values({
      id: crypto.randomUUID(),
      registrationId: attendee.id,
      type: "confirmation",
      status: result.ok ? "sent" : "failed",
      providerId: result.providerId || null,
      error: result.error ? result.error.slice(0, 500) : null,
      createdAt: new Date(),
    });

    return result;
  } catch (err: unknown) {
    const errorSnippet = err instanceof Error ? err.name || "EmailServiceError" : "EmailServiceError";
    console.error("Failed to execute confirmation email service:", errorSnippet);

    try {
      await db.insert(emailLog).values({
        id: crypto.randomUUID(),
        registrationId: attendee.id,
        type: "confirmation",
        status: "failed",
        providerId: null,
        error: errorSnippet,
        createdAt: new Date(),
      });
    } catch (logErr) {
      console.error("Failed to write to email_log:", logErr);
    }

    return {
      ok: false,
      error: errorSnippet,
    };
  }
}
