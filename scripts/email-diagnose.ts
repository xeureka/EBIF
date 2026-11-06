import { getNodeEnv, getNodeEnvPresence } from "../src/server/env.node";
import { parseEmailAddress } from "../src/server/env";
import { renderConfirmationEmail } from "../src/server/modules/email/template";

interface ResendResponse {
  id?: string;
  name?: string;
  message?: string;
}

const args = process.argv.slice(2);
const ownerIndex = args.indexOf("--owner");
const toIndex = args.indexOf("--to");
const owner = ownerIndex >= 0 ? args[ownerIndex + 1]?.trim() : undefined;
const recipient = toIndex >= 0 ? args[toIndex + 1]?.trim() : undefined;

function print(step: string, status: "PASS" | "FAIL" | "SKIP", detail: string): void {
  console.log(step + ": " + status + " — " + detail);
}

function errorDetail(response: Response, body: ResendResponse): string {
  const name = typeof body.name === "string" ? body.name : "ResendError";
  const message =
    typeof body.message === "string" ? body.message.trim().slice(0, 300) : "No message returned";
  return response.status + " " + name + ": " + message;
}

async function resendRequest(
  apiKey: string,
  payload: Record<string, unknown>,
  idempotencyKey: string,
): Promise<{ response: Response; body: ResendResponse }> {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + apiKey,
      "Content-Type": "application/json",
      "User-Agent": "ebif-site/1.0",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(payload),
  });
  let body: ResendResponse = {};
  try {
    body = (await response.json()) as ResendResponse;
  } catch {
    // The status is enough for a safe diagnosis.
  }
  return { response, body };
}

function fail(step: string, detail: string): never {
  print(step, "FAIL", detail);
  process.exit(1);
}

const presence = getNodeEnvPresence();
const env = getNodeEnv();
const from = parseEmailAddress(env.EMAIL_FROM);
const replyTo = parseEmailAddress(env.EMAIL_REPLY_TO);
const apiKey = env.RESEND_API_KEY?.trim();

if (!presence.RESEND_API_KEY || !apiKey) {
  fail("env", "RESEND_API_KEY is missing (key length class: none)");
}
if (!presence.EMAIL_FROM || !from) fail("env", "EMAIL_FROM is missing or invalid");
if (!presence.EMAIL_REPLY_TO || !replyTo) fail("env", "EMAIL_REPLY_TO is missing or invalid");
if (!presence.SITE_URL || !env.SITE_URL) fail("env", "SITE_URL is missing or invalid");

const keyLengthClass = apiKey.length < 20 ? "short" : apiKey.length < 60 ? "medium" : "long";
print(
  "env",
  "PASS",
  "all variables present; key length class " +
    keyLengthClass +
    "; EMAIL_FROM parses as " +
    from.address +
    " on " +
    from.domain,
);

let domainsVerified = false;
try {
  const response = await fetch("https://api.resend.com/domains", {
    headers: {
      Authorization: "Bearer " + apiKey,
      "User-Agent": "ebif-site/1.0",
    },
  });
  let body: {
    data?: Array<{ name?: string; status?: string; region?: string }>;
    name?: string;
    message?: string;
  } = {};
  try {
    body = (await response.json()) as typeof body;
  } catch {
    // Keep status-only diagnosis.
  }
  const errorName = typeof body.name === "string" ? body.name.toLowerCase() : "";
  if (errorName === "restricted_api_key") {
    print("domains", "SKIP", errorDetail(response, body) + "; sending-only key, expected");
  } else if (errorName === "invalid_api_key" || errorName === "missing_api_key") {
    fail("domains", errorDetail(response, body));
  } else if (!response.ok) {
    fail("domains", errorDetail(response, body));
  } else {
    const domains = body.data || [];
    for (const domain of domains) {
      print(
        "domain",
        "PASS",
        (domain.name || "unknown") +
          " status=" +
          (domain.status || "unknown") +
          " region=" +
          (domain.region || "unknown"),
      );
      if (
        domain.name?.toLowerCase() === from.domain &&
        domain.status?.toLowerCase() === "verified"
      ) {
        domainsVerified = true;
      }
    }
    if (!domainsVerified) {
      fail("domains", "sender domain " + from.domain + " is not listed as verified");
    }
    print("domains", "PASS", "sender domain " + from.domain + " is verified");
  }
} catch (error) {
  fail(
    "domains",
    error instanceof Error ? error.name + ": " + error.message.slice(0, 300) : "NetworkError",
  );
}

if (!owner) {
  print("control_send_a", "SKIP", "pass --owner <Resend account email> to run control A");
} else {
  try {
    const result = await resendRequest(
      apiKey,
      {
        from: "Acme <onboarding@resend.dev>",
        to: [owner],
        subject: "EBIF Resend control A",
        text: "Resend key and network control message.",
      },
      "email-diagnose-control-a-" + Date.now(),
    );
    if (!result.response.ok) fail("control_send_a", errorDetail(result.response, result.body));
    print("control_send_a", "PASS", result.response.status + " id=" + (result.body.id || "missing"));
  } catch (error) {
    fail(
      "control_send_a",
      error instanceof Error ? error.name + ": " + error.message.slice(0, 300) : "NetworkError",
    );
  }
}

if (!recipient) fail("control_send_b", "pass --to <test address> to run control B");

try {
  const result = await resendRequest(
    apiKey,
    {
      from: env.EMAIL_FROM,
      to: [recipient],
      reply_to: env.EMAIL_REPLY_TO,
      subject: "EBIF Resend control B",
      text: "Resend real-sender control message.",
    },
    "email-diagnose-control-b-" + Date.now(),
  );
  if (!result.response.ok) fail("control_send_b", errorDetail(result.response, result.body));
  print("control_send_b", "PASS", result.response.status + " id=" + (result.body.id || "missing"));
} catch (error) {
  fail(
    "control_send_b",
    error instanceof Error ? error.name + ": " + error.message.slice(0, 300) : "NetworkError",
  );
}

try {
  const rendered = await renderConfirmationEmail({
    attendeeName: "EBIF Diagnostic Recipient",
    organization: "EBIF Diagnostics",
    ticketCode: "DIAG2026QR",
    siteUrl: env.SITE_URL,
  });
  const result = await resendRequest(
    apiKey,
    {
      from: env.EMAIL_FROM,
      to: [recipient],
      reply_to: env.EMAIL_REPLY_TO,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      attachments: rendered.attachments,
    },
    "email-diagnose-full-" + Date.now(),
  );
  if (!result.response.ok) fail("full_send", errorDetail(result.response, result.body));
  print(
    "full_send",
    "PASS",
    result.response.status +
      " id=" +
      (result.body.id || "missing") +
      (rendered.attachmentWarning ? "; " + rendered.attachmentWarning : ""),
  );
} catch (error) {
  fail(
    "full_send",
    error instanceof Error ? error.name + ": " + error.message.slice(0, 300) : "NetworkError",
  );
}
