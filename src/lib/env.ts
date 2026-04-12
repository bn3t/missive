import { z } from "zod";

const envSchema = z.object({
  // Core
  DATABASE_URL: z.string().url(),

  // Auth
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url(),

  // Email transport
  EMAIL_TRANSPORT: z.enum(["ses", "smtp", "mailhog"]),
  EMAIL_FROM: z.string().min(1),

  // SES transport
  AWS_REGION: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),

  // SMTP transport
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),

  // MailHog transport (when EMAIL_TRANSPORT=mailhog)
  MAILHOG_HOST: z.string().optional().default("localhost"),
  MAILHOG_PORT: z.coerce.number().optional().default(1025),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("❌ Invalid environment variables:", parsed.error.flatten().fieldErrors);
    throw new Error("Invalid environment variables");
  }
  return parsed.data;
}

export const env = validateEnv();
