import { describe, it, expect } from "vitest";
import { z } from "zod";

// Re-declare the Zod schema from route.ts (it is not exported, so we mirror it here)
const sendEmailSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  html: z.string().min(1),
  transport: z.enum(["ses", "smtp"]),
  template: z.string().optional(),
  tenantId: z.string().optional(),
  from: z.string().trim().min(1).max(320).optional(),
  attachments: z
    .array(
      z.object({
        filename: z.string(),
        content: z.string(),
        contentType: z.string(),
      })
    )
    .optional(),
});

const validBase = {
  to: "recipient@example.com",
  subject: "Hello",
  html: "<p>Hello</p>",
  transport: "ses" as const,
};

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
