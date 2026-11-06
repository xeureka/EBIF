export interface EmailAttachment {
  filename: string;
  content: string; // base64 string
  content_type?: string;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
  attachments?: EmailAttachment[];
  idempotencyKey?: string;
}

export interface SendEmailResult {
  ok: boolean;
  providerId?: string;
  error?: string;
  errorName?: string;
}

export interface EmailProvider {
  sendEmail(options: SendEmailOptions): Promise<SendEmailResult>;
}
