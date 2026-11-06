import QRCode from "qrcode";
import { event } from "../../../data/event";
import { formatTicketCode, normalizeTicketCode } from "../tickets/code";
import type { EmailAttachment } from "./provider";

export interface RenderConfirmationEmailParams {
  attendeeName: string;
  organization?: string;
  ticketCode: string;
  siteUrl: string;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
  attachments: EmailAttachment[];
  attachmentWarning?: string;
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function renderConfirmationEmail(
  params: RenderConfirmationEmailParams,
): Promise<RenderedEmail> {
  const safeName = escapeHtml(params.attendeeName.trim());
  const safeOrg = params.organization ? escapeHtml(params.organization.trim()) : "";
  const formattedCode = formatTicketCode(params.ticketCode);
  const safeTicketCode = escapeHtml(formattedCode);
  const cleanCode = normalizeTicketCode(params.ticketCode);

  const cleanSiteUrl = params.siteUrl.replace(/\/+$/, "");
  const ticketUrl = `${cleanSiteUrl}/ticket/${encodeURIComponent(cleanCode)}`;

  let attachments: EmailAttachment[] = [];
  let attachmentWarning: string | undefined;
  try {
    const qrDataUrl = await QRCode.toDataURL(cleanCode, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 320,
      color: {
        dark: "#0b1329",
        light: "#ffffff",
      },
    });
    const qrBase64 = qrDataUrl.replace(/^data:image\/png;base64,/, "");
    if (!qrBase64) throw new Error("QR PNG content was empty");
    attachments = [
      {
        filename: "ebif-ticket-qr.png",
        content: qrBase64,
        content_type: "image/png",
      },
    ];
  } catch (error) {
    const name = error instanceof Error ? error.name || "QrGenerationError" : "QrGenerationError";
    const message = error instanceof Error ? error.message : String(error);
    attachmentWarning = name + ": " + message.slice(0, 300);
  }

  const subject = `Your registration is confirmed — ${event.name}`;

  const contactPhones = event.phones.join(" / ");
  const contactEmails = event.emails.join(", ");

  const text = `Dear ${params.attendeeName},

Your registration for the ${event.name} is confirmed.

EVENT DETAILS
------------------------------------------
Dates: ${event.shortDates}
Venue: ${event.venueWithCity}
Ticket Code: ${formattedCode}
${params.organization ? `Organization: ${params.organization}\n` : ""}
VIEW YOUR TICKET:
${ticketUrl}

IMPORTANT CHECK-IN INSTRUCTIONS:
Please bring your QR code (attached to this email when available, or accessible via the ticket link above) and a valid government ID or business card to the registration desk at the venue.

CONTACT & INQUIRIES:
Phone: ${contactPhones}
Email: ${contactEmails}

We look forward to welcoming you to the forum.

Warm regards,
Ethiopian Business & Investment Forum Organizing Committee
`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f7f9fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1f2937;">
  <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent;">Your registration for the Ethiopian Business &amp; Investment Forum is confirmed. Your ticket code is ${safeTicketCode}.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f7f9fa; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 580px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e5e7eb; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);" cellpadding="0" cellspacing="0">
          
          <!-- Header Banner -->
          <tr>
            <td style="background-color: #0b1329; padding: 36px 32px; text-align: center; border-bottom: 3px solid #d4af37;">
              <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #d4af37;">Official Confirmation</p>
              <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #ffffff; line-height: 1.3;">${escapeHtml(event.name)}</h1>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 36px 32px;">
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.5; color: #111827;">
                Dear <strong>${safeName}</strong>,
              </p>
              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #374151;">
                Thank you for registering for the <strong>${escapeHtml(event.name)}</strong>. Your registration is confirmed.
              </p>

              <!-- Event Details Box -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 28px;">
                <tr>
                  <td style="padding: 20px 24px;">
                    <p style="margin: 0 0 10px 0; font-size: 14px; color: #4b5563;">
                      <strong style="color: #111827;">Dates:</strong> ${escapeHtml(event.shortDates)}
                    </p>
                    <p style="margin: 0 0 10px 0; font-size: 14px; color: #4b5563;">
                      <strong style="color: #111827;">Venue:</strong> ${escapeHtml(event.venueWithCity)}
                    </p>
                    ${safeOrg ? `<p style="margin: 0 0 10px 0; font-size: 14px; color: #4b5563;"><strong style="color: #111827;">Organization:</strong> ${safeOrg}</p>` : ""}
                    <p style="margin: 0; font-size: 14px; color: #4b5563;">
                      <strong style="color: #111827;">Ticket Code:</strong> <span style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-weight: 700; color: #0b1329; background-color: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-size: 15px;">${safeTicketCode}</span>
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Ticket Button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 28px; text-align: center;">
                <tr>
                  <td align="center">
                    <a href="${escapeHtml(ticketUrl)}" target="_blank" style="display: inline-block; background-color: #0b1329; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600; padding: 14px 28px; border-radius: 8px; border: 1px solid #0b1329;">
                      View your ticket
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Notice Box -->
              <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 4px; margin-bottom: 28px;">
                <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #1e40af;">
                  <strong>Please bring your QR code</strong> (attached as an image when available, or accessible online) and a valid ID or business card to the entrance desk for rapid check-in.
                </p>
              </div>

              <!-- Contact Footer -->
              <p style="margin: 0 0 8px 0; font-size: 13px; color: #6b7280; line-height: 1.5;">
                Need assistance? Contact our registration desk:
              </p>
              <p style="margin: 0 0 4px 0; font-size: 13px; color: #6b7280;">
                Phone: <span style="color: #374151;">${escapeHtml(contactPhones)}</span>
              </p>
              <p style="margin: 0; font-size: 13px; color: #6b7280;">
                Email: <span style="color: #374151;">${escapeHtml(contactEmails)}</span>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px 32px; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                &copy; ${escapeHtml(event.year)} ${escapeHtml(event.name)}. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return {
    subject,
    html,
    text,
    attachments,
    attachmentWarning,
  };
}
