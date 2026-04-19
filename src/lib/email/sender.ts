import { db } from "@/lib/db";
import { sentEmails, emailAttachments } from "@/lib/db/schema";
import { env, configuredTransports, type EmailTransport } from "@/lib/env";
import { sendViaTransport } from "./transport";
import { randomUUID } from "crypto";

export class TransportNotConfiguredError extends Error {
  readonly transport: string;
  constructor(transport: string) {
    super(
      `Transport '${transport}' is not in EMAIL_TRANSPORTS. Configured: ${[...configuredTransports].join(", ")}`
    );
    this.name = "TransportNotConfiguredError";
    this.transport = transport;
  }
}

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  transport?: EmailTransport;
  template?: string;
  tenantId?: string;
  userId: string;
  attachments?: Array<{
    filename: string;
    content: string; // base64-encoded
    contentType: string;
  }>;
}

export interface SendEmailResult {
  id: string;
  status: "sent" | "failed";
  transport: EmailTransport;
  messageId?: string;
  error?: string;
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  // Resolve transport: use the caller's choice or fall back to the first configured one
  const resolvedTransport: EmailTransport = input.transport ?? env.EMAIL_TRANSPORTS[0];

  // Validate that the resolved transport is actually configured
  if (!configuredTransports.has(resolvedTransport)) {
    throw new TransportNotConfiguredError(resolvedTransport);
  }

  const id = randomUUID();

  // Hoist base64→Buffer decoding so the same Buffers are reused for both
  // the Nodemailer transport payload and the DB insert.
  const attachmentBuffers = (input.attachments ?? []).map((a) => ({
    filename: a.filename,
    contentType: a.contentType,
    content: Buffer.from(a.content, "base64"),
  }));

  const baseRecord = {
    id,
    to: input.to,
    subject: input.subject,
    htmlBody: input.html,
    template: input.template ?? null,
    transport: resolvedTransport,
    tenantId: input.tenantId ?? null,
    hasAttachments: (input.attachments?.length ?? 0) > 0,
    userId: input.userId,
  };

  try {
    const result = await sendViaTransport(resolvedTransport, {
      from: env.EMAIL_FROM,
      to: input.to,
      subject: input.subject,
      html: input.html,
      attachments: attachmentBuffers.length > 0 ? attachmentBuffers : undefined,
    });

    await db.transaction(async (tx) => {
      await tx.insert(sentEmails).values({
        ...baseRecord,
        status: "sent",
        messageId: result.messageId ?? null,
        errorMessage: null,
      });

      if (attachmentBuffers.length > 0) {
        await tx.insert(emailAttachments).values(
          attachmentBuffers.map((a) => ({
            emailId: id,
            filename: a.filename,
            contentType: a.contentType,
            size: a.content.length,
            content: a.content,
          }))
        );
      }
    });

    return {
      id,
      status: "sent",
      transport: resolvedTransport,
      messageId: result.messageId ?? undefined,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    await db.transaction(async (tx) => {
      await tx.insert(sentEmails).values({
        ...baseRecord,
        status: "failed",
        messageId: null,
        errorMessage,
      });

      if (attachmentBuffers.length > 0) {
        await tx.insert(emailAttachments).values(
          attachmentBuffers.map((a) => ({
            emailId: id,
            filename: a.filename,
            contentType: a.contentType,
            size: a.content.length,
            content: a.content,
          }))
        );
      }
    });

    return {
      id,
      status: "failed",
      transport: resolvedTransport,
      error: errorMessage,
    };
  }
}
