import { db } from "@/lib/db";
import { sentEmails, emailAttachments } from "@/lib/db/schema";
import { env, configuredTransports, type EmailTransport } from "@/lib/env";
import { sendViaTransport } from "./transport";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";

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
  transport: EmailTransport;
  from?: string;
  template?: string;
  tenantId?: string;
  userId: string;
  organizationId: string;
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
  from: string;
  messageId?: string;
  error?: string;
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  if (!configuredTransports.has(input.transport)) {
    throw new TransportNotConfiguredError(input.transport);
  }
  const resolvedTransport: EmailTransport = input.transport;
  const resolvedFrom = input.from?.trim() || env.EMAIL_FROM;

  const id = randomUUID();

  const attachmentBuffers = (input.attachments ?? []).map((a) => ({
    filename: a.filename,
    contentType: a.contentType,
    content: Buffer.from(a.content, "base64"),
  }));

  await db.transaction(async (tx) => {
    await tx.insert(sentEmails).values({
      id,
      to: input.to,
      subject: input.subject,
      htmlBody: input.html,
      template: input.template ?? null,
      transport: resolvedTransport,
      tenantId: input.tenantId ?? null,
      hasAttachments: attachmentBuffers.length > 0,
      fromAddress: resolvedFrom,
      userId: input.userId,
      organizationId: input.organizationId,
      status: "pending",
      messageId: null,
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

  try {
    const result = await sendViaTransport(resolvedTransport, {
      from: resolvedFrom,
      to: input.to,
      subject: input.subject,
      html: input.html,
      attachments: attachmentBuffers.length > 0 ? attachmentBuffers : undefined,
    });

    await db
      .update(sentEmails)
      .set({ status: "sent", messageId: result.messageId ?? null, errorMessage: null, sentAt: new Date() })
      .where(eq(sentEmails.id, id));

    return {
      id,
      status: "sent",
      transport: resolvedTransport,
      from: resolvedFrom,
      messageId: result.messageId ?? undefined,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    await db
      .update(sentEmails)
      .set({ status: "failed", errorMessage, sentAt: new Date() })
      .where(eq(sentEmails.id, id));

    return {
      id,
      status: "failed",
      transport: resolvedTransport,
      from: resolvedFrom,
      error: errorMessage,
    };
  }
}
