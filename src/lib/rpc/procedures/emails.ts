import { os } from "@orpc/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { sentEmails } from "@/lib/db/schema";
import { desc, eq, and, like, gte, lte, count } from "drizzle-orm";
import { authMiddleware } from "../middleware";

// ─── List Emails ─────────────────────────────────────────
const listEmailsInput = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(25),
  search: z.string().optional(),
  tenantId: z.string().optional(),
  status: z.enum(["sent", "failed"]).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

const listEmailsOutput = z.object({
  emails: z.array(
    z.object({
      id: z.string(),
      to: z.string(),
      subject: z.string(),
      template: z.string().nullable(),
      status: z.string(),
      tenantId: z.string().nullable(),
      hasAttachments: z.boolean(),
      sentAt: z.date(),
    })
  ),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});

export const listEmails = authMiddleware
  .input(listEmailsInput)
  .output(listEmailsOutput)
  .handler(async ({ input, context }) => {
    const conditions = [];

    // Scope by user (API keys have a userId)
    conditions.push(eq(sentEmails.userId, context.session.user.id));

    if (input.search) {
      conditions.push(like(sentEmails.to, `%${input.search}%`));
    }
    if (input.tenantId) {
      conditions.push(eq(sentEmails.tenantId, input.tenantId));
    }
    if (input.status) {
      conditions.push(eq(sentEmails.status, input.status));
    }
    if (input.dateFrom) {
      conditions.push(gte(sentEmails.sentAt, new Date(input.dateFrom)));
    }
    if (input.dateTo) {
      conditions.push(lte(sentEmails.sentAt, new Date(input.dateTo)));
    }

    const where = and(...conditions);

    const [emailsResult, countResult] = await Promise.all([
      db
        .select()
        .from(sentEmails)
        .where(where)
        .orderBy(desc(sentEmails.sentAt))
        .limit(input.pageSize)
        .offset((input.page - 1) * input.pageSize),
      db
        .select({ total: count() })
        .from(sentEmails)
        .where(where),
    ]);

    return {
      emails: emailsResult,
      total: countResult[0]?.total ?? 0,
      page: input.page,
      pageSize: input.pageSize,
    };
  });

// ─── Get Email by ID ─────────────────────────────────────
const getEmailByIdInput = z.object({
  id: z.string(),
});

const getEmailByIdOutput = z.object({
  id: z.string(),
  to: z.string(),
  subject: z.string(),
  htmlBody: z.string(),
  template: z.string().nullable(),
  status: z.string(),
  messageId: z.string().nullable(),
  tenantId: z.string().nullable(),
  hasAttachments: z.boolean(),
  errorMessage: z.string().nullable(),
  userId: z.string(),
  sentAt: z.date(),
});

export const getEmailById = authMiddleware
  .input(getEmailByIdInput)
  .output(getEmailByIdOutput)
  .handler(async ({ input, context }) => {
    const [email] = await db
      .select()
      .from(sentEmails)
      .where(
        and(
          eq(sentEmails.id, input.id),
          eq(sentEmails.userId, context.session.user.id)
        )
      )
      .limit(1);

    if (!email) {
      throw new Error("Email not found");
    }

    return email;
  });
