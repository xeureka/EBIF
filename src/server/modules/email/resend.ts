import type { EmailProvider, SendEmailOptions, SendEmailResult } from "./provider";

export interface ResendProviderConfig {
  apiKey?: string;
  from: string;
  replyTo?: string;
}

export class ResendEmailProvider implements EmailProvider {
  private apiKey?: string;
  private from: string;
  private replyTo?: string;

  constructor(config: ResendProviderConfig) {
    this.apiKey = config.apiKey?.trim();
    this.from = config.from;
    this.replyTo = config.replyTo;
  }

  async sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    if (!this.apiKey) {
      console.log("email skipped (RESEND_API_KEY not configured)");
      return {
        ok: true,
        providerId: "dev-skipped",
      };
    }

    try {
      const payload: Record<string, unknown> = {
        from: this.from,
        to: [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text,
      };

      if (this.replyTo) {
        payload.reply_to = this.replyTo;
      }

      if (options.attachments && options.attachments.length > 0) {
        payload.attachments = options.attachments.map((att) => ({
          filename: att.filename,
          content: att.content,
          content_type: att.content_type || "image/png",
        }));
      }

      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errSnippet = `HTTP ${response.status} ${response.statusText}`;
        try {
          const errData = await response.json() as { message?: string; name?: string };
          if (errData && errData.message) {
            errSnippet = errData.message.slice(0, 300);
          }
        } catch {
          // Keep generic snippet if non-JSON error
        }

        console.error("Resend API delivery error:", errSnippet);
        return {
          ok: false,
          error: errSnippet,
        };
      }

      const data = await response.json() as { id?: string };
      return {
        ok: true,
        providerId: data.id || "resend-ok",
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message.slice(0, 300) : "Network error";
      console.error("Resend network error:", errorMsg);
      return {
        ok: false,
        error: errorMsg,
      };
    }
  }
}
