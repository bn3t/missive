import { env } from "../src/lib/env";

const API_URL = process.env.MISSIVE_API_URL ?? "http://localhost:3000/api/send";

// Recipient: CLI arg > TEST_EMAIL_TO env var > error
const TEST_EMAIL_TO = process.env.TEST_EMAIL_TO?.trim();

const testEmails = [
  {
    name: "Welcome Email",
    to: "", // resolved after CLI parsing
    subject: "Welcome to Missive!",
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #3b82f6;">Welcome aboard! 🎉</h1>
        <p>Thank you for using <strong>Missive</strong>.</p>
        <p>This email was sent through the <code>/api/send</code> endpoint.</p>
        <hr />
        <p style="color: #666; font-size: 14px;">
          Sent at: ${new Date().toISOString()}
        </p>
      </div>
    `.trim(),
  },
  {
    name: "Email Verification",
    to: "", // resolved after CLI parsing
    subject: "Verify your email address",
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Please verify your email</h2>
        <p>Click the button below to verify your email address:</p>
        <a href="https://example.com/verify?token=123456"
           style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Verify Email
        </a>
        <p style="margin-top: 24px; color: #666;">
          Or copy this link: <span style="font-family: monospace;">https://example.com/verify?token=123456</span>
        </p>
      </div>
    `.trim(),
  },
  {
    name: "Password Reset",
    to: "", // resolved after CLI parsing
    subject: "Reset your password",
    html: `
      <div style="font-family: system-ui, sans-serif;">
        <h2>Reset Password Request</h2>
        <p>You requested a password reset. Use this link:</p>
        <p><a href="https://example.com/reset?token=abc123">Reset Password →</a></p>
        <p style="color: #ef4444; font-size: 14px;">This link expires in 1 hour.</p>
      </div>
    `.trim(),
  },
];

async function main() {
  console.log("🚀 Missive Test Email Sender (via API)");
  console.log("========================================\n");

  const apiKey = process.env.MISSIVE_API_KEY;
  if (!apiKey?.startsWith("mk_")) {
    console.error("❌ Missing or invalid MISSIVE_API_KEY in .env.local");
    console.error("\nPlease create one in the dashboard:");
    console.error("1. npm run dev");
    console.error("2. Login as admin@missive.dev / admin1234");
    console.error("3. Settings → API Keys → Create key");
    console.error("4. Copy the key and add to .env.local");
    process.exit(1);
  }

  // Parse CLI args
  // Usage: npm run send-test [template#|email] [--transport ses|smtp]
  const args = process.argv.slice(2);
  let selected = 0;
  let transportOverride: string | undefined;
  let recipientOverride: string | undefined;

  let fromOverride: string | undefined;
  let replyToOverride: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--transport" && args[i + 1]) {
      transportOverride = args[i + 1];
      i++; // skip next
    } else if (arg === "--from" && args[i + 1]) {
      fromOverride = args[i + 1];
      i++; // skip next
    } else if (arg === "--reply-to" && args[i + 1]) {
      replyToOverride = args[i + 1];
      i++; // skip next
    } else {
      const num = parseInt(arg);
      if (!isNaN(num) && num > 0 && num <= testEmails.length) {
        selected = num - 1;
      } else if (arg.includes("@")) {
        recipientOverride = arg;
      }
    }
  }

  // Resolve recipient: CLI arg > TEST_EMAIL_TO env var > error
  const recipient = recipientOverride ?? TEST_EMAIL_TO;
  if (!recipient) {
    console.error("❌ No recipient address set.");
    console.error("   Set TEST_EMAIL_TO in .env.local, or pass an address as a CLI argument:");
    console.error("   npm run send-test your@email.com");
    console.error("   (When using SES sandbox, the address must be verified in AWS SES.)");
    process.exit(1);
  }

  // Apply recipient to all templates
  for (const t of testEmails) t.to = recipient;

  const test = testEmails[selected];

  const effectiveTransport = transportOverride ?? env.EMAIL_TRANSPORTS[0];

  console.log(`Sending: ${test.name}`);
  console.log(`To: ${test.to}`);
  if (fromOverride) console.log(`From: ${fromOverride}`);
  if (replyToOverride) console.log(`Reply-To: ${replyToOverride}`);
  console.log(`Subject: ${test.subject}`);
  console.log(`Endpoint: ${API_URL}`);
  console.log(`Configured transports: ${env.EMAIL_TRANSPORTS.join(", ")}`);
  console.log(`Using transport: ${effectiveTransport}\n`);

  const requestBody: Record<string, unknown> = {
    to: test.to,
    subject: test.subject,
    html: test.html,
    template: test.name.toLowerCase().replace(/\s+/g, "-"),
  };
  if (transportOverride) {
    requestBody.transport = transportOverride;
  }
  if (fromOverride) {
    requestBody.from = fromOverride;
  }
  if (replyToOverride) {
    requestBody.replyTo = replyToOverride;
  }

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      let errorDetail = response.statusText;
      try {
        const errorData = await response.json();
        errorDetail = errorData.error || JSON.stringify(errorData);
      } catch {}
      throw new Error(`HTTP ${response.status}: ${errorDetail}`);
    }

    const result = await response.json();

    console.log("✅ Email sent successfully via API!");
    console.log(`ID: ${result.id}`);
    console.log(`Transport used: ${result.transport}`);
    if (result.from) console.log(`From: ${result.from}`);
    if (result.messageId) console.log(`Message ID: ${result.messageId}`);
  } catch (error) {
    console.error("❌ Failed to send email:");
    console.error(error instanceof Error ? error.message : error);
    console.error("\n💡 Make sure the dev server is running (npm run dev)");
  }

  console.log("\nUsage:");
  console.log("  npm run send-test your@email.com             # Send to specific address (required if TEST_EMAIL_TO not set)");
  console.log("  npm run send-test 2 your@email.com           # Verification email template");
  console.log("  npm run send-test 3 your@email.com           # Password reset template");
  console.log("  npm run send-test -- --transport ses         # Force SES transport");
  console.log("  npm run send-test -- --transport smtp        # Force SMTP transport");
  console.log("  npm run send-test 2 --transport smtp         # Template 2 via SMTP");
  console.log('  npm run send-test -- --from "Alice <alice@brand.com>"  # Custom from address');
  console.log('  npm run send-test 2 --from alice@brand.com   # Template 2 with custom from');
  console.log('  npm run send-test -- --reply-to support@brand.com  # Set Reply-To address');
  console.log('  npm run send-test -- --reply-to "Support <support@brand.com>"  # Reply-To with display name');
  console.log("\n  Or set TEST_EMAIL_TO=you@yourdomain.com in .env.local to avoid passing it every time.");
}

main().catch(console.error);
