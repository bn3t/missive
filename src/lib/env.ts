import { z } from "zod";

export type EmailTransport = "ses" | "smtp";

const envSchema = z
  .object({
    // Core
    DATABASE_URL: z.string().url(),

    // Auth
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.string().url(),

    // Email — comma-separated list of enabled transports, e.g. "ses,smtp" or "ses" or "smtp"
    // Order matters: the first entry is the default when the API caller doesn't specify one.
    EMAIL_TRANSPORTS: z
      .string()
      .min(1)
      .transform((val) =>
        val
          .split(",")
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean)
      )
      .pipe(
        z
          .array(z.enum(["ses", "smtp"]))
          .min(1, "EMAIL_TRANSPORTS must contain at least one valid transport (ses, smtp)")
      ),
    EMAIL_FROM: z.string().min(1),

    // SES transport (required when "ses" is in EMAIL_TRANSPORTS)
    AWS_REGION: z.string().optional(),
    AWS_ACCESS_KEY_ID: z.string().optional(),
    AWS_SECRET_ACCESS_KEY: z.string().optional(),

    // SMTP transport (required when "smtp" is in EMAIL_TRANSPORTS)
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().optional(),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.EMAIL_TRANSPORTS.includes("ses")) {
      if (!data.AWS_REGION) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["AWS_REGION"], message: "AWS_REGION is required when 'ses' is in EMAIL_TRANSPORTS" });
      }
      if (!data.AWS_ACCESS_KEY_ID) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["AWS_ACCESS_KEY_ID"], message: "AWS_ACCESS_KEY_ID is required when 'ses' is in EMAIL_TRANSPORTS" });
      }
      if (!data.AWS_SECRET_ACCESS_KEY) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["AWS_SECRET_ACCESS_KEY"], message: "AWS_SECRET_ACCESS_KEY is required when 'ses' is in EMAIL_TRANSPORTS" });
      }
    }
    if (data.EMAIL_TRANSPORTS.includes("smtp")) {
      if (!data.SMTP_HOST) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["SMTP_HOST"], message: "SMTP_HOST is required when 'smtp' is in EMAIL_TRANSPORTS" });
      }
    }
  });

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  if (process.env.SKIP_ENV_VALIDATION === "1" || process.env.NEXT_PHASE === "phase-production-build") {
    return {} as Env;
  }
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("❌ Invalid environment variables:", parsed.error.flatten().fieldErrors);
    throw new Error("Invalid environment variables");
  }
  return parsed.data;
}

export const env = validateEnv();

// Convenience: the set of configured transports for O(1) membership checks
export const configuredTransports = new Set<EmailTransport>(env.EMAIL_TRANSPORTS);
