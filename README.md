# Missive

> A lightweight, self-hosted transactional email service. Send, log, and inspect your emails — nothing more.

---

## Quick Start

```bash
# 1. Start Postgres and MailHog
docker compose up -d

# 2. Install dependencies
npm install

# 3. Copy and configure environment (uses mailhog by default)
cp .env.example .env.local

# 4. Run database migrations
npm run db:push

# 5. Seed admin user
npm run seed

# 6. Start development server
npm run dev
```

Dashboard available at `http://localhost:3000`.
MailHog UI available at `http://localhost:8025` to inspect sent emails.

## Testing / Simulating Emails

Test scripts are located in the `scripts/` folder.

The project uses **MailHog** by default to capture all emails locally.

### Quick test (via real API endpoint):

1. Run `npm run seed` (creates admin user)
2. Start the dev server (`npm run dev`)
3. Login at http://localhost:3000 (admin@missive.dev / admin1234)
4. Go to **Settings → API Keys** → Create key (name it "test-script")
5. Copy the full key and add to `.env.local`:
   ```env
   MISSIVE_API_KEY=mk_your_key_here
   ```
6. Run the test:
   ```bash
   npm run send-test
   ```

This tests the full flow (`POST /api/send` → auth → Nodemailer → MailHog). Other options:

```bash
npm run send-test 2                # Email verification template
npm run send-test 3                # Password reset template
npm run send-test your@email.com   # Send to custom address
```

View all captured emails at **http://localhost:8025**.

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
| Email sending | Nodemailer (SES / SMTP / MailHog) |
| Validation | Zod |

---

## API

### Send an email

```http
POST /api/send
Authorization: Bearer mk_your-api-key
Content-Type: application/json

{
  "to": "user@example.com",
  "subject": "Verify your email address",
  "html": "<p>Click <a href=\"...\">here</a> to verify.</p>",
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

### Infrastructure / SES Setup

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
   terraform output aws_access_key_id
   terraform output -raw aws_secret_access_key

### Environment variables
Add to your `.env`:
  AWS_REGION=us-east-1
  AWS_ACCESS_KEY_ID=<from output>
  AWS_SECRET_ACCESS_KEY=<from output>

### Note on sandbox mode
In SES sandbox mode, you can only send to verified addresses.
Verify your recipient test email too, either by adding a second
`aws_sesv2_email_identity` resource in main.tf, or manually in the AWS console.

# License

MIT — © Bernard Niset / SmartObjects SRL
