import { getNodeEnv } from "../src/server/env.node";
import { ResendEmailProvider } from "../src/server/modules/email/resend";
import { renderConfirmationEmail } from "../src/server/modules/email/template";

const recipient = process.argv[2]?.trim();

if (!recipient || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
  console.error("Invalid recipient email");
  process.exit(1);
}

const serverEnv = getNodeEnv();
const rendered = await renderConfirmationEmail({
  attendeeName: "Test Recipient",
  organization: "EBIF Email Test",
  ticketCode: "TEST2026QR",
  siteUrl: serverEnv.SITE_URL,
});
const provider = new ResendEmailProvider({
  apiKey: serverEnv.RESEND_API_KEY,
  from: serverEnv.EMAIL_FROM,
  replyTo: serverEnv.EMAIL_REPLY_TO,
  environment: serverEnv.NODE_ENV,
  source: "node",
});

const result = await provider.sendEmail({
  to: recipient,
  subject: rendered.subject,
  html: rendered.html,
  text: rendered.text,
  attachments: rendered.attachments,
  idempotencyKey: `email-test-${crypto.randomUUID()}`,
});

if (result.ok) {
  console.log("success");
} else {
  console.error(result.error || "EmailSendError");
  process.exitCode = 1;
}
