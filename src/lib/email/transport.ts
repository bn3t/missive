import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { env } from "@/lib/env";

let transporter: Transporter | null = null;

export function getTransporter(): Transporter {
  if (transporter) return transporter;

  if (env.EMAIL_TRANSPORT === "ses") {
    const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");
    const sesClient = new SESClient({
      region: env.AWS_REGION,
      credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID ?? "",
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY ?? "",
      },
    });
    transporter = nodemailer.createTransport({
      SES: { sesClient, SendEmailCommand },
    });
  } else if (env.EMAIL_TRANSPORT === "mailhog") {
    // MailHog simulates a real SMTP server (port 1025 by default).
    // It captures all emails instead of delivering them.
    // View them at http://localhost:8025
    transporter = nodemailer.createTransport({
      host: env.MAILHOG_HOST,
      port: env.MAILHOG_PORT,
      secure: false,
      logger: true,
      debug: true,
    });
  } else {
    // smtp transport
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT ?? 587,
      secure: (env.SMTP_PORT ?? 587) === 465,
      auth:
        env.SMTP_USER && env.SMTP_PASS
          ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
          : undefined,
    });
  }

  return transporter;
}

