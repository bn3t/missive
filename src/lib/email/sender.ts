import { db } from "@/lib/db";
import { sentEmails } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { getTransporter } from "./transport";
import { eq } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
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
  messageId?: string;
  error?: string;
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const id = createId();

  const record = {
    id,
    to: input.to,
    subject: input.subject,
    htmlBody: input.html,
    template: input.template ?? null,
    status: "sent" as const,
    messageId: null as string | null,
    tenantId: input.tenantId ?? null,
    hasAttachments: (input.attachments?.length ?? 0) > 0,
    errorMessage: null as string | null,
    userId: input.userId,
  };

  try {
    const transporter = getTransporter();
    const result = await transporter.sendMail({
      from: env.EMAIL_FROM,
      to: input.to,
      subject: input.subject,
      html: input.html,
      attachments: input.attachments?.map((a) => ({
        filename: a.filename,
        content: Buffer.from(a.content, "base64"),
        contentType: a.contentType,
      })),
    });

    await db.insert(sentEmails).values({
      ...record,
      messageId: result.messageId ?? null,
    });

    return {
      id,
      status: "sent",
      messageId: result.messageId ?? undefined,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    await db.insert(sentEmails).values({
      ...record,
      status: "failed",
      errorMessage,
    });

    return {
      id,
      status: "failed",
      error: errorMessage,
    };
  }
}
