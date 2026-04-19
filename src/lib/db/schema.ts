import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  integer,
  customType,
} from "drizzle-orm/pg-core";

const bytea = customType<{ data: Buffer }>({ dataType: () => "bytea" });

// ─── Better Auth Tables ────────────────────────────────────────────────────

export const user = pgTable("user", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  role: text("role"),
  banned: boolean("banned"),
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires"),
});

export const session = pgTable("session", {
  id: uuid("id").primaryKey().defaultRandom(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: uuid("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  impersonatedBy: uuid("impersonated_by"),
});

export const account = pgTable("account", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: uuid("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: uuid("id").primaryKey().defaultRandom(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const apikey = pgTable("apikey", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name"),
  start: text("start"),
  prefix: text("prefix"),
  key: text("key").notNull().unique(),
  userId: uuid("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  refillInterval: integer("refill_interval"),
  refillAmount: integer("refill_amount"),
  lastRefillAt: timestamp("last_refill_at"),
  enabled: boolean("enabled").notNull().default(true),
  rateLimitEnabled: boolean("rate_limit_enabled"),
  rateLimitTimeWindow: integer("rate_limit_time_window"),
  rateLimitMax: integer("rate_limit_max"),
  requestCount: integer("request_count"),
  remaining: integer("remaining"),
  lastRequest: timestamp("last_request"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  permissions: text("permissions"),
  metadata: text("metadata"),
});

// ─── Application Tables ────────────────────────────────────────────────────

export const sentEmails = pgTable("sent_emails", {
  id: uuid("id").primaryKey().defaultRandom(),
  to: text("to").notNull(),
  subject: text("subject").notNull(),
  htmlBody: text("html_body").notNull(),
  template: text("template"),
  status: text("status", {
    enum: ["sent", "failed"],
  }).notNull(),
  messageId: text("message_id"),
  tenantId: text("tenant_id"),
  hasAttachments: boolean("has_attachments").notNull().default(false),
  transport: text("transport"),
  errorMessage: text("error_message"),
  userId: uuid("user_id").notNull(),
  sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
});

export const emailAttachments = pgTable("email_attachments", {
  id: uuid("id").primaryKey().defaultRandom(),
  emailId: uuid("email_id")
    .notNull()
    .references(() => sentEmails.id, { onDelete: "cascade" }),
  filename: text("filename").notNull(),
  contentType: text("content_type").notNull(),
  size: integer("size").notNull(),
  content: bytea("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
