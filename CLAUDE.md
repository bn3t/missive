# Missive — CLAUDE.md

## Project Overview

Missive is a self-hosted transactional email service built with Next.js 16 (App Router). It exposes a REST API to send emails and a dashboard UI to browse, search, and inspect sent emails.

## Architecture

Single Next.js application with three concerns:
1. **REST API** — `POST /api/send` (authenticated via Better Auth API key or session)
2. **Dashboard UI** — React pages under `(dashboard)` route group
3. **Auth** — Better Auth with email/password + API key plugin (`mk_` prefix)

## Key Libraries

- **oRPC** — Type-safe RPC layer for dashboard data fetching. Procedures live in `src/lib/rpc/procedures/`. Router at `src/lib/rpc/router.ts`.
- **Better Auth** — The `apiKey` plugin was split out of core into a separate package in 1.6.x: install `@better-auth/api-key` and import `apiKey` from `@better-auth/api-key` (server) and `apiKeyClient` from `@better-auth/api-key/client` (client), not from `better-auth/plugins` / `better-auth/client/plugins`. `@better-auth/api-key` is published in lockstep with `better-auth` (same version each release) — if `npm update` ever bumps one without the other, pin both back to matching versions.
- **Drizzle ORM** — Schema in `src/lib/db/schema.ts`. Config in `drizzle.config.ts`.
- **Nodemailer** — Transport layer in `src/lib/email/transport.ts`. `sendViaTransport(transport, mailOptions)` dispatches to a lazy-singleton Nodemailer transporter for the given type. No fallback — the caller explicitly selects the transport. SES uses `{ sesClient, SendEmailCommand }` (AWS SDK v3). SMTP uses standard Nodemailer SMTP options with `logger: true` in non-production.

## Route Structure

- `src/app/(auth)/` — Login page (no sidebar shell)
- `src/app/(dashboard)/` — Protected pages with sidebar (auth guard in layout)
- `src/app/api/auth/[...all]/` — Better Auth handler
- `src/app/api/send/` — External send endpoint (API key or session auth)
- `src/app/api/rpc/[...all]/` — oRPC handler (session auth)

## Environment

All env vars are validated at startup via `src/lib/env.ts` (Zod). See `.env.example`.

Key transport vars:
- `EMAIL_TRANSPORTS` — comma-separated list of enabled transports (`ses`, `smtp`). First entry = default. Zod validates credentials are present for each listed transport at startup.
- `configuredTransports` — exported `Set<EmailTransport>` from `env.ts` for O(1) membership checks in `sender.ts`.

## Database

- PostgreSQL via Drizzle
- `sent_emails` table — custom schema in `src/lib/db/schema.ts`
- Better Auth tables — auto-managed by the framework (user, session, account, verification, apikey, etc.)
- Use `npm run db:push` for dev, `npm run db:migrate` for production
