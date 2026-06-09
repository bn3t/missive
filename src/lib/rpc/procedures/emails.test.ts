import { describe, it, expect } from "vitest";
import { z } from "zod";

// Re-declare the output schemas from emails.ts (they are not exported).
// These mirror the shapes used in listEmails and getEmailById RPC procedures.

const getEmailByIdOutput = z.object({
  id: z.string(),
  to: z.string(),
  subject: z.string(),
  htmlBody: z.string(),
  template: z.string().nullable(),
  status: z.string(),
  transport: z.string().nullable(),
  messageId: z.string().nullable(),
  tenantId: z.string().nullable(),
  hasAttachments: z.boolean(),
  errorMessage: z.string().nullable(),
  fromAddress: z.string().nullable(),
  replyTo: z.string().nullable(),
  userId: z.string(),
  sentAt: z.date(),
});

const listEmailsOutput = z.object({
  emails: z.array(
    z.object({
      id: z.string(),
      to: z.string(),
      subject: z.string(),
      template: z.string().nullable(),
      status: z.string(),
      transport: z.string().nullable(),
      tenantId: z.string().nullable(),
      hasAttachments: z.boolean(),
      fromAddress: z.string().nullable(),
      sentAt: z.date(),
    })
  ),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

const baseEmailById = {
  id: "email-1",
  to: "recipient@example.com",
  subject: "Test",
  htmlBody: "<p>Test</p>",
  template: null,
  status: "sent",
  transport: "ses",
  messageId: null,
  tenantId: null,
  hasAttachments: false,
  errorMessage: null,
  fromAddress: null,
  replyTo: null,
  userId: "user-1",
  sentAt: new Date("2024-03-15T14:30:00Z"),
};

const baseListEmail = {
  id: "email-1",
  to: "recipient@example.com",
  subject: "Test",
  template: null,
  status: "sent",
  transport: "ses",
  tenantId: null,
  hasAttachments: false,
  fromAddress: null,
  sentAt: new Date("2024-03-15T14:30:00Z"),
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("getEmailByIdOutput schema — fromAddress field", () => {
  it("validates a row with fromAddress: null", () => {
    const result = getEmailByIdOutput.safeParse({ ...baseEmailById, fromAddress: null });
    expect(result.success).toBe(true);
  });

  it("validates a row with a non-null fromAddress string", () => {
    const result = getEmailByIdOutput.safeParse({ ...baseEmailById, fromAddress: "alice@example.com" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fromAddress).toBe("alice@example.com");
    }
  });

  it("fails when fromAddress is missing from the object", () => {
    const { fromAddress: _omitted, ...withoutFrom } = baseEmailById;
    const result = getEmailByIdOutput.safeParse(withoutFrom);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.fromAddress).toBeDefined();
    }
  });
});

describe("getEmailByIdOutput schema — replyTo field", () => {
  it("validates a row with replyTo: null", () => {
    const result = getEmailByIdOutput.safeParse({ ...baseEmailById, replyTo: null });
    expect(result.success).toBe(true);
  });

  it("validates a row with a plain replyTo address", () => {
    const result = getEmailByIdOutput.safeParse({ ...baseEmailById, replyTo: "support@brand.com" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.replyTo).toBe("support@brand.com");
    }
  });

  it("validates a row with a display-name replyTo address", () => {
    const result = getEmailByIdOutput.safeParse({ ...baseEmailById, replyTo: "Support <support@brand.com>" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.replyTo).toBe("Support <support@brand.com>");
    }
  });

  it("fails when replyTo is missing from the object", () => {
    const { replyTo: _omitted, ...withoutReplyTo } = baseEmailById;
    const result = getEmailByIdOutput.safeParse(withoutReplyTo);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.replyTo).toBeDefined();
    }
  });
});

describe("listEmailsOutput schema — fromAddress field", () => {
  it("validates an emails array where each item has fromAddress: null", () => {
    const result = listEmailsOutput.safeParse({
      emails: [{ ...baseListEmail, fromAddress: null }],
      total: 1,
      page: 1,
      pageSize: 25,
    });
    expect(result.success).toBe(true);
  });

  it("validates an emails array where each item has a non-null fromAddress string", () => {
    const result = listEmailsOutput.safeParse({
      emails: [{ ...baseListEmail, fromAddress: "alice@example.com" }],
      total: 1,
      page: 1,
      pageSize: 25,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.emails[0].fromAddress).toBe("alice@example.com");
    }
  });

  it("fails when fromAddress is missing from an email item in the array", () => {
    const { fromAddress: _omitted, ...withoutFrom } = baseListEmail;
    const result = listEmailsOutput.safeParse({
      emails: [withoutFrom],
      total: 1,
      page: 1,
      pageSize: 25,
    });
    expect(result.success).toBe(false);
  });
});
