# Missive

> A lightweight, self-hosted transactional email service. Send, log, and inspect your emails — nothing more.

---

## Quick Start

```bash
# 1. Start Postgres
docker compose up -d

# 2. Install dependencies
npm install

# 3. Copy and configure environment
cp .env.example .env.local
# Edit .env.local — set EMAIL_TRANSPORTS and the required credentials for each transport

# 4. Run database migrations
npm run db:push

# 5. Seed admin user
npm run seed

# 6. Start development server
npm run dev
```

Dashboard available at `http://localhost:3000`.

---

## Email Transports

Missive supports **SES** and **SMTP** as email transports. Both are optional; one or both can be enabled at the same time.

### Configuration

Set `EMAIL_TRANSPORTS` in your `.env` to a comma-separated list of the transports you want to enable:

```env
EMAIL_TRANSPORTS=ses          # SES only
EMAIL_TRANSPORTS=smtp         # SMTP only
EMAIL_TRANSPORTS=ses,smtp     # both enabled; SES is the default
EMAIL_TRANSPORTS=smtp,ses     # both enabled; SMTP is the default
```

**Order matters**: the first entry is the default transport used when an API caller does not specify one.

Each transport requires its own credentials:

| Transport | Required env vars |
|---|---|
| `ses` | `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` |
| `smtp` | `SMTP_HOST` (+ optional `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`) |

Startup validation (Zod) fails immediately if a transport is listed in `EMAIL_TRANSPORTS` but its credentials are missing.

### Per-request transport selection

API callers can choose which transport to use on a per-request basis via the optional `transport` field in the request body. If the requested transport is not in `EMAIL_TRANSPORTS`, the API returns `400`.

If `transport` is omitted, the first entry in `EMAIL_TRANSPORTS` is used.

The transport used for each email is stored in the database and visible in the dashboard.

---

## Testing

1. Run `npm run seed` (creates admin user)
2. Start the dev server (`npm run dev`)
3. Login at http://localhost:3000 (admin@missive.dev / admin1234)
4. Go to **Settings → API Keys** → Create key
5. Copy the key and add to `.env.local`:
   ```env
   MISSIVE_API_KEY=mk_your_key_here
   ```
6. Run:
   ```bash
   npm run send-test                        # default transport
   npm run send-test -- --transport ses     # force SES
   npm run send-test -- --transport smtp    # force SMTP
   npm run send-test 2 --transport smtp     # template 2 via SMTP
   npm run send-test your@email.com         # custom recipient
   ```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | shadcn/ui + Tailwind CSS v4 |
| ORM | Drizzle |
| Database | PostgreSQL |
| Auth | Better Auth (email/password + API keys) |
| RPC | oRPC |
| Email sending | Nodemailer (SES + SMTP, caller-selectable per request) |
| Validation | Zod |

---

## API

### Send an email

```http
POST /api/send
Authorization: Bearer mk_your-api-key
Content-Type: application/json
```

```json
{
  "to": "user@example.com",
  "subject": "Verify your email address",
  "html": "<p>Click <a href=\"...\">here</a> to verify.</p>",
  "transport": "ses",
  "template": "verify-email",
  "tenantId": "tenant_abc123",
  "attachments": [
    {
      "filename": "invoice.pdf",
      "content": "<base64-encoded-content>",
      "contentType": "application/pdf"
    }
  ]
}
```

**Fields:**

| Field | Type | Required | Description |
|---|---|---|---|
| `to` | string | ✅ | Recipient email address |
| `subject` | string | ✅ | Email subject |
| `html` | string | ✅ | HTML body |
| `transport` | `"ses"` \| `"smtp"` | ☐ | Transport to use. Defaults to the first entry in `EMAIL_TRANSPORTS`. Returns `400` if not in configured list. |
| `template` | string | ☐ | Template identifier (stored for filtering) |
| `tenantId` | string | ☐ | Tenant identifier (stored for filtering) |
| `attachments` | array | ☐ | Array of `{ filename, content (base64), contentType }` |

**Response:**

```json
{
  "id": "clxyz...",
  "status": "sent",
  "transport": "ses",
  "messageId": "<abc@eu-central-1.amazonses.com>"
}
```

---

## Configuration

See `.env.example` for all available environment variables.

---

## NPM Scripts

| Script | Description |
|---|---|
| `dev` | Start Next.js dev server |
| `build` | Production build |
| `start` | Start production server |
| `db:generate` | Generate Drizzle migration |
| `db:migrate` | Run Drizzle migration |
| `db:push` | Push schema to database (dev) |
| `db:studio` | Open Drizzle Studio |
| `seed` | Create admin user |
| `send-test` | Send test emails via /api/send (requires MISSIVE_API_KEY) |
| `lint` | Run ESLint |

---

## Infrastructure / SES Setup

### Prerequisites
- Terraform >= 1.0
- AWS CLI configured, or AWS credentials available in environment

### Setup
1. `cd infra/`
2. `cp terraform.tfvars.example terraform.tfvars`
3. Edit `terraform.tfvars` and set `sender_email` to the address you want to verify
4. `terraform init`
5. `terraform apply`
6. Check your inbox for the AWS verification email and click the link
7. Retrieve credentials:
   ```
   terraform output aws_access_key_id
   terraform output -raw aws_secret_access_key
   ```

### Environment variables
Add to your `.env.local`:
```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<from output>
AWS_SECRET_ACCESS_KEY=<from output>
```

### Note on sandbox mode
In SES sandbox mode, you can only send to verified addresses.
Verify your recipient email too, either by adding a second
`aws_sesv2_email_identity` resource in `main.tf`, or manually in the AWS console.

---

# License

MIT — © Bernard Niset / SmartObjects SRL
