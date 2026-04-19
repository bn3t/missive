import nodemailer from "nodemailer";
import type { Transporter, SendMailOptions, SentMessageInfo } from "nodemailer";
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { env, type EmailTransport } from "@/lib/env";

// ─── Lazy singleton transporters ─────────────────────────────────────────────

const transporters = new Map<EmailTransport, Transporter>();

function getOrCreateTransporter(type: EmailTransport): Transporter {
  const cached = transporters.get(type);
  if (cached) return cached;

  let transporter: Transporter;

  if (type === "ses") {
    const sesClient = new SESv2Client({
      region: env.AWS_REGION,
      credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY!,
      },
    });
    transporter = nodemailer.createTransport({
      SES: { sesClient, SendEmailCommand },
    });
  } else {
    // smtp
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT ?? 587,
      secure: (env.SMTP_PORT ?? 587) === 465,
      auth:
        env.SMTP_USER && env.SMTP_PASS
          ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
          : undefined,
      logger: true,
      debug: process.env.NODE_ENV !== "production",
    });
  }

  transporters.set(type, transporter);
  return transporter;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Send an email via the specified transport.
 * The caller is responsible for ensuring the transport is in env.EMAIL_TRANSPORTS
 * before calling this — validation belongs in sender.ts.
 */
export async function sendViaTransport(
  transport: EmailTransport,
  mailOptions: SendMailOptions
): Promise<SentMessageInfo> {
  const transporter = getOrCreateTransporter(transport);
  return transporter.sendMail(mailOptions);
}
