import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { env } from "../src/lib/env";

const API_URL = "http://localhost:3000/api/send";
const PDF_PATH = resolve(__dirname, "basic-text.pdf");
const SECOND_PDF_PATH = resolve(__dirname, "sample-pdf-a4-size-65kb.pdf");

const TEST_EMAIL_TO = process.env.TEST_EMAIL_TO?.trim();

async function main() {
  console.log("📎 Missive Test PDF Email Sender");
  console.log("========================================\n");

  const apiKey = process.env.MISSIVE_API_KEY;
  if (!apiKey?.startsWith("mk_")) {
    console.error("❌ Missing or invalid MISSIVE_API_KEY in .env.local");
    process.exit(1);
  }

  // Parse CLI args: npm run send-test-pdf [email] [--transport ses|smtp] [--two|-2]
  const args = process.argv.slice(2);
  let transportOverride: string | undefined;
  let recipientOverride: string | undefined;
  let includeSecond = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--transport" && args[i + 1]) {
      transportOverride = args[i + 1];
      i++;
    } else if (arg === "--two" || arg === "-2") {
      includeSecond = true;
    } else if (arg.includes("@")) {
      recipientOverride = arg;
    }
  }

  const recipient = recipientOverride ?? TEST_EMAIL_TO;
  if (!recipient) {
    console.error("❌ No recipient address set.");
    console.error("   Set TEST_EMAIL_TO in .env.local, or pass an address as a CLI argument:");
    console.error("   npm run send-test-pdf your@email.com");
    process.exit(1);
  }

  const pdfBuffer = readFileSync(PDF_PATH);
  const pdfBase64 = pdfBuffer.toString("base64");
  const effectiveTransport = transportOverride ?? env.EMAIL_TRANSPORTS[0];

  const attachments = [
    {
      filename: "basic-text.pdf",
      content: pdfBase64,
      contentType: "application/pdf",
    },
  ];

  console.log(`To: ${recipient}`);
  console.log(`Attachment: ${PDF_PATH} (${pdfBuffer.length} bytes)`);

  if (includeSecond) {
    const secondBuffer = readFileSync(SECOND_PDF_PATH);
    attachments.push({
      filename: "sample-pdf-a4-size-65kb.pdf",
      content: secondBuffer.toString("base64"),
      contentType: "application/pdf",
    });
    console.log(`Attachment: ${SECOND_PDF_PATH} (${secondBuffer.length} bytes)`);
  }

  console.log(`Using transport: ${effectiveTransport}\n`);

  const attachmentNames = attachments.map((a) => `<strong>${a.filename}</strong>`).join(", ");
  const requestBody: Record<string, unknown> = {
    to: recipient,
    subject: `Test email with ${attachments.length === 1 ? "PDF attachment" : `${attachments.length} PDF attachments`}`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>PDF attachment test</h2>
        <p>This email includes ${attachmentNames} as ${attachments.length === 1 ? "an attachment" : "attachments"}.</p>
        <p style="color: #666; font-size: 14px;">Sent at: ${new Date().toISOString()}</p>
      </div>
    `.trim(),
    template: "pdf-attachment-test",
    attachments,
  };
  if (transportOverride) {
    requestBody.transport = transportOverride;
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

    console.log("✅ Email with PDF sent successfully!");
    console.log(`ID: ${result.id}`);
    console.log(`Transport used: ${result.transport}`);
    if (result.messageId) console.log(`Message ID: ${result.messageId}`);
  } catch (error) {
    console.error("❌ Failed to send email:");
    console.error(error instanceof Error ? error.message : error);
    console.error("\n💡 Make sure the dev server is running (npm run dev)");
  }
}

main().catch(console.error);
