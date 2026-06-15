import { describe, it, expect } from "vitest";
import { z } from "zod";

// Re-declare the Zod schema from route.ts (it is not exported, so we mirror it here)
const sendEmailSchema = z
  .object({
    to: z.string().email(),
    subject: z.string().min(1),
    html: z.string().min(1).optional(),
    text: z.string().min(1).optional(),
    transport: z.enum(["ses", "smtp"]),
    template: z.string().optional(),
    tenantId: z.string().optional(),
    from: z.string().trim().min(1).max(320).optional(),
    replyTo: z.string().trim().min(1).max(320).optional(),
    attachments: z
      .array(
        z.object({
          filename: z.string(),
          content: z.string(),
          contentType: z.string(),
        })
      )
      .optional(),
  })
  .refine((d) => d.html || d.text, {
    message: "At least one of 'html' or 'text' is required",
  });

const validBase = {
  to: "recipient@example.com",
  subject: "Hello",
  html: "<p>Hello</p>",
  transport: "ses" as const,
};

describe("send route — Zod schema validation for 'text' body", () => {
  it("html-only passes validation", () => {
    expect(sendEmailSchema.safeParse(validBase).success).toBe(true);
  });

  it("text-only passes validation", () => {
    const result = sendEmailSchema.safeParse({
      to: "recipient@example.com",
      subject: "Hello",
      text: "Hello plain",
      transport: "ses" as const,
    });
    expect(result.success).toBe(true);
  });

  it("both html and text passes validation", () => {
    expect(sendEmailSchema.safeParse({ ...validBase, text: "Hello plain" }).success).toBe(true);
  });

  it("neither html nor text fails validation", () => {
    const result = sendEmailSchema.safeParse({
      to: "recipient@example.com",
      subject: "Hello",
      transport: "ses" as const,
    });
    expect(result.success).toBe(false);
  });

  it("empty string text fails validation", () => {
    const result = sendEmailSchema.safeParse({ ...validBase, html: undefined, text: "" });
    expect(result.success).toBe(false);
  });
});

describe("send route — Zod schema validation for 'from'", () => {
  it("valid body without from passes validation", () => {
    const result = sendEmailSchema.safeParse(validBase);
    expect(result.success).toBe(true);
  });

  it("valid body with a plain from address passes validation", () => {
    const result = sendEmailSchema.safeParse({ ...validBase, from: "alice@brand.com" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.from).toBe("alice@brand.com");
    }
  });

  it("valid body with a display-name from address passes validation", () => {
    const result = sendEmailSchema.safeParse({ ...validBase, from: "Alice <alice@brand.com>" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.from).toBe("Alice <alice@brand.com>");
    }
  });

  it("from as empty string fails validation (min(1) after trim)", () => {
    const result = sendEmailSchema.safeParse({ ...validBase, from: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.from).toBeDefined();
    }
  });

  it("from as whitespace-only string fails validation (min(1) after trim)", () => {
    const result = sendEmailSchema.safeParse({ ...validBase, from: "   " });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.from).toBeDefined();
    }
  });

  it("from longer than 320 characters fails validation", () => {
    const longFrom = "a".repeat(321) + "@example.com";
    const result = sendEmailSchema.safeParse({ ...validBase, from: longFrom });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.from).toBeDefined();
    }
  });

  it("trims leading/trailing whitespace from a valid from value", () => {
    const result = sendEmailSchema.safeParse({ ...validBase, from: "  alice@brand.com  " });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.from).toBe("alice@brand.com");
    }
  });
});

describe("send route — Zod schema validation for 'replyTo'", () => {
  it("valid body without replyTo passes validation", () => {
    const result = sendEmailSchema.safeParse(validBase);
    expect(result.success).toBe(true);
  });

  it("valid body with a plain replyTo address passes validation", () => {
    const result = sendEmailSchema.safeParse({ ...validBase, replyTo: "support@brand.com" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.replyTo).toBe("support@brand.com");
    }
  });

  it("valid body with a display-name replyTo address passes validation", () => {
    const result = sendEmailSchema.safeParse({ ...validBase, replyTo: "Support <support@brand.com>" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.replyTo).toBe("Support <support@brand.com>");
    }
  });

  it("replyTo as empty string fails validation (min(1) after trim)", () => {
    const result = sendEmailSchema.safeParse({ ...validBase, replyTo: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.replyTo).toBeDefined();
    }
  });

  it("replyTo as whitespace-only string fails validation (min(1) after trim)", () => {
    const result = sendEmailSchema.safeParse({ ...validBase, replyTo: "   " });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.replyTo).toBeDefined();
    }
  });

  it("trims leading/trailing whitespace from a valid replyTo value", () => {
    const result = sendEmailSchema.safeParse({ ...validBase, replyTo: "  support@brand.com  " });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.replyTo).toBe("support@brand.com");
    }
  });
});
