import type { EmailProvider, SendEmailOptions, SendEmailResult } from "./provider";
import { stripSurroundingQuotes } from "../../env";

export interface ResendProviderConfig {
  apiKey?: string;
  from: string;
  replyTo?: string;
  environment?: string;
  source?: "worker" | "node";
}

function truncateMessage(message: string): string {
  return message.trim().slice(0, 300);
}

export class ResendEmailProvider implements EmailProvider {
  private apiKey?: string;
  private from: string;
  private replyTo?: string;
  private environment: string;
  private source: "worker" | "node";
  private static missingKeyLogged = false;

  constructor(config: ResendProviderConfig) {
    this.apiKey = config.apiKey?.trim();
    this.from = stripSurroundingQuotes(config.from);
    this.replyTo = config.replyTo ? stripSurroundingQuotes(config.replyTo) : undefined;
    this.environment = config.environment || "development";
    this.source = config.source || "node";
  }

  async sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    const apiKey = this.apiKey;
    if (!apiKey) {
      if (!ResendEmailProvider.missingKeyLogged) {
        if (this.environment === "production") {
          console.error(
            "email configuration error: RESEND_API_KEY is missing; registration will continue without email",
          );
        } else {
          console.log("email skipped (RESEND_API_KEY not configured)");
        }
        ResendEmailProvider.missingKeyLogged = true;
      }
      return {
        ok: false,
        error:
          this.source === "worker"
            ? "RESEND_API_KEY not found in Worker env"
            : "RESEND_API_KEY not set in Node env",
      };
    }

    const payload: Record<string, unknown> = {
      from: this.from,
      to: [options.to],
      subject: options.subject,
      html: options.html,
      text: options.text,
    };
    if (this.replyTo) payload.reply_to = this.replyTo;
    if (options.attachments?.length) {
      payload.attachments = options.attachments.map((att) => ({
        filename: att.filename,
        content: att.content,
        content_type: att.content_type || "image/png",
      }));
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "User-Agent": "ebif-site/1.0",
    };
    if (options.idempotencyKey) headers["Idempotency-Key"] = options.idempotencyKey;

    let lastError = "NetworkError";
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          const data = (await response.json()) as { id?: string };
          if (!data.id)
            return {
              ok: false,
              error: `HTTP ${response.status} ResendResponseMissingId: response did not include an email id`,
              errorName: "ResendResponseMissingId",
            };
          return { ok: true, providerId: data.id };
        }

        let errorName = "ResendError";
        let errorMessage = "No error message returned by Resend";
        try {
          const data = (await response.json()) as { name?: unknown; message?: unknown };
          if (typeof data.name === "string" && data.name.trim()) errorName = data.name.trim();
          if (typeof data.message === "string" && data.message.trim()) {
            errorMessage = truncateMessage(data.message);
          }
        } catch {
          // Keep the safe status/name/message summary.
        }
        lastError = `HTTP ${response.status} ${errorName}: ${errorMessage}`;
        if (response.status !== 429 && response.status < 500)
          return { ok: false, error: lastError, errorName };
      } catch {
        lastError = "NetworkError";
      }

      if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
    }

    return { ok: false, error: lastError, errorName: "ResendRequestError" };
  }
}
