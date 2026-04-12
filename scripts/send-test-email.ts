import { env } from "../src/lib/env";

const DEFAULT_TO = "test@example.com";
const API_URL = "http://localhost:3000/api/send";

const testEmails = [
  {
    name: "Welcome Email",
    to: DEFAULT_TO,
    subject: "Welcome to Missive!",
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #3b82f6;">Welcome aboard! 🎉</h1>
        <p>Thank you for using <strong>Missive</strong>.</p>
        <p>This email was sent through the <code>/api/send</code> endpoint.</p>
        <p>You can view it at: <a href="http://localhost:8025">http://localhost:8025</a></p>
        <hr />
        <p style="color: #666; font-size: 14px;">
          Sent at: ${new Date().toISOString()}
        </p>
      </div>
    `.trim(),
  },
  {
    name: "Email Verification",
    to: DEFAULT_TO,
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
    to: DEFAULT_TO,
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

  const arg = process.argv[2];
  let selected = 0;

  if (arg) {
    const num = parseInt(arg);
    if (!isNaN(num) && num > 0 && num <= testEmails.length) {
      selected = num - 1;
    } else if (arg.includes("@")) {
      testEmails[0].to = arg;
    }
  }

  const test = testEmails[selected];

  console.log(`Sending: ${test.name}`);
  console.log(`To: ${test.to}`);
  console.log(`Subject: ${test.subject}`);
  console.log(`Endpoint: ${API_URL}`);
  console.log(`Transport: ${env.EMAIL_TRANSPORT}\n`);

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: test.to,
        subject: test.subject,
        html: test.html,
        template: test.name.toLowerCase().replace(/\s+/g, "-"),
      }),
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
    if (result.messageId) console.log(`Message ID: ${result.messageId}`);

    console.log("\n📧 Check the captured email at: http://localhost:8025");
  } catch (error) {
    console.error("❌ Failed to send email:");
    console.error(error instanceof Error ? error.message : error);
    console.error("\n💡 Make sure the dev server is running (npm run dev)");
  }

  console.log("\nUsage:");
  console.log("  npm run send-test                  # Welcome email");
  console.log("  npm run send-test 2                # Verification email");
  console.log("  npm run send-test 3                # Password reset");
  console.log("  npm run send-test your@email.com   # Custom recipient");
}

main().catch(console.error);
