# Missive

> A lightweight, self-hosted transactional email service. Send, log, and inspect your emails — nothing more.

Missive is a single Next.js application that gives you:

- a REST API (`POST /api/send`) to send transactional emails through **SES** and/or **SMTP**
- a dashboard to browse, search and inspect every email that was sent (including attachments)
- API keys, users and organizations, so several apps can share one instance

Prebuilt multi-arch images are published to `ghcr.io/bn3t/missive`.

**Contents** — [Deploy with Docker](#deploy-with-docker) · [Configuration](#configuration) ·
[First login](#first-login-and-admin-user) · [API](#api) · [Upgrading](#upgrading) ·
[Contributing](#contributing) · [SES setup](#infrastructure--ses-setup)

---

## Deploy with Docker

This is the recommended way to run Missive on a server. You need Docker with the Compose
plugin, and a way to terminate TLS in front of it (Traefik, Caddy, nginx, Dokploy…).

### 1. Create a directory and a `.env` file

```bash
mkdir -p /opt/missive && cd /opt/missive
```

`.env`:

```env
# Postgres
POSTGRES_PASSWORD=<a long random password>

# Missive
DATABASE_URL=postgres://missive:<same password>@postgres:5432/missive
BETTER_AUTH_SECRET=<output of: openssl rand -base64 32>
BETTER_AUTH_URL=https://missive.example.com

# Self-service signup. Keep it false on a server; see "First login" below.
SIGNUP_ENABLED=false

# Email transports — see Configuration
EMAIL_TRANSPORTS=smtp
EMAIL_FROM="Missive <noreply@example.com>"
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
```

> `BETTER_AUTH_URL` **must** be the public URL users hit in their browser, otherwise
> login redirects and cookies break behind a reverse proxy.

### 2. `docker-compose.yml`

A ready-to-use file is in [`examples/docker-compose.yml`](examples/docker-compose.yml):

```yaml
services:
  postgres:
    image: postgres:18
    environment:
      POSTGRES_DB: missive
      POSTGRES_USER: missive
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required}
    volumes:
      # postgres:18 stores data in /var/lib/postgresql/18/docker — mount the parent
      - postgres_data:/var/lib/postgresql
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U missive']
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  missive:
    image: ghcr.io/bn3t/missive:latest
    ports:
      - '3000:3000'
    env_file: .env
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped

volumes:
  postgres_data:
    driver: local
```

### 3. Start it

```bash
docker compose up -d
docker compose logs -f missive
```

**Database migrations run automatically on every container start** (the image's start
command is `tsx scripts/migrate.ts && next start`). There is no manual migration step in
production — just make sure the database is reachable when the container boots.

The app listens on port 3000 inside the container. Point your reverse proxy at it and
serve it over HTTPS on the hostname you set in `BETTER_AUTH_URL`.

Next: [create your admin user](#first-login-and-admin-user) — a fresh instance has **no
user at all** and signup is disabled by default, so you can't log in until you seed one.

---

## First login and admin user

Missive does **not** create a default admin account, and `SIGNUP_ENABLED` defaults to
`false`. Pick one of the two options below to get your first user.

### Option A — seed a user (recommended)

Run the seed script inside the running container:

```bash
docker compose exec \
  -e SEED_EMAIL=you@example.com \
  -e SEED_PASSWORD='<a strong password>' \
  -e SEED_NAME='Your Name' \
  missive npm run seed:deploy
```

| Variable | Default | Description |
|---|---|---|
| `SEED_EMAIL` | `admin@missive.dev` | Email of the user to create |
| `SEED_PASSWORD` | — | **Required.** The script fails if it is not set |
| `SEED_NAME` | `Admin` | Display name |

The script is idempotent: if the user already exists it just (re-)applies the `admin`
role, so it is safe to re-run.

### Option B — open signup temporarily

Set `SIGNUP_ENABLED=true`, `docker compose up -d`, create your account at `/signup`,
then set it back to `false` and restart. Leaving it on means anyone who can reach the
instance can create an account.

### Then: create your organization

Emails belong to an organization. After logging in, go to **Settings → Organization** and
create one — `POST /api/send` returns `403` for a user who is not a member of any
organization. Then create an API key under **Settings → API Keys**.

---

## Configuration

All variables are validated at startup with Zod (`src/lib/env.ts`); the app refuses to
boot with a clear error if something is missing. See [`.env.example`](.env.example).

### Core

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | ✅ | Session signing secret, min. 32 chars (`openssl rand -base64 32`) |
| `BETTER_AUTH_URL` | ✅ | Public base URL of the instance |
| `SIGNUP_ENABLED` | ☐ | `true`/`false` (default `false`) — enables the `/signup` page |
| `EMAIL_TRANSPORTS` | ✅ | Comma-separated list of enabled transports (`ses`, `smtp`) |
| `EMAIL_FROM` | ✅ | Default `From` address, used when a request doesn't set `from` |

### Email transports

Missive supports **SES** and **SMTP**. Both are optional; one or both can be enabled:

```env
EMAIL_TRANSPORTS=ses          # SES only
EMAIL_TRANSPORTS=smtp         # SMTP only
EMAIL_TRANSPORTS=ses,smtp     # both enabled
```

Each transport requires its own credentials, checked at startup:

| Transport | Required env vars |
|---|---|
| `ses` | `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` |
| `smtp` | `SMTP_HOST` (+ optional `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`) |

API callers pick the transport per request with the `transport` field; a transport that
is not in `EMAIL_TRANSPORTS` is rejected with `400`. The transport used is stored with
each email and shown in the dashboard.

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
| `transport` | `"ses"` \| `"smtp"` | ✅ | Transport to use. Must be listed in `EMAIL_TRANSPORTS` |
| `html` | string | ☐* | HTML body |
| `text` | string | ☐* | Plain-text body |
| `from` | string | ☐ | Overrides `EMAIL_FROM` for this email |
| `replyTo` | string | ☐ | `Reply-To` header |
| `template` | string | ☐ | Template identifier (stored for filtering) |
| `tenantId` | string | ☐ | Tenant identifier (stored for filtering) |
| `attachments` | array | ☐ | Array of `{ filename, content (base64), contentType }` |

\* At least one of `html` or `text` is required.

**Response** (`200`):

```json
{
  "id": "8f1c...",
  "status": "sent",
  "transport": "ses",
  "from": "Missive <noreply@example.com>",
  "messageId": "<abc@eu-central-1.amazonses.com>"
}
```

**Status codes:**

| Code | Meaning |
|---|---|
| `200` | Email sent |
| `400` | Invalid JSON, validation error, or transport not in `EMAIL_TRANSPORTS` |
| `401` | Missing or invalid API key / session |
| `403` | The caller does not belong to an organization |
| `502` | The transport rejected the email (the attempt is still recorded, `status: "failed"`) |

Authentication accepts either a Better Auth API key (`mk_…`, created in
**Settings → API Keys**) or a dashboard session cookie.

---

## Upgrading

```bash
docker compose pull
docker compose up -d
```

Migrations are applied automatically on start. Images are tagged `latest` and
`sha-<short-sha>` — pin `ghcr.io/bn3t/missive:sha-abc1234` if you'd rather upgrade
deliberately. Back up your Postgres volume before upgrading.

---

## Contributing

Issues and pull requests are welcome.

### Quick start

```bash
# 1. Start Postgres and MailHog (local SMTP catcher)
docker compose up -d

# 2. Install dependencies
npm install

# 3. Copy and configure environment
cp .env.example .env.local
# Edit .env.local — set EMAIL_TRANSPORTS and the credentials for each transport

# 4. Push the schema to the database
npm run db:push

# 5. Create an admin user
SEED_PASSWORD=admin1234 npm run seed

# 6. Start the dev server
npm run dev
```

The dev server runs on `http://localhost:3100`. The root `docker-compose.yml` is for
development only: it starts Postgres (`missive` / `bn`) and MailHog, whose web UI on
`http://localhost:8025` shows every email sent through the `smtp` transport when
`SMTP_HOST=localhost` and `SMTP_PORT=1025`.

### Testing the send API

1. Log in at `http://localhost:3100` with the user you seeded
2. Create an organization in **Settings → Organization** (required to send)
3. **Settings → API Keys** → Create key, and add it to `.env.local`:
   ```env
   MISSIVE_API_KEY=mk_your_key_here
   ```
4. Point the script at the dev server and set a recipient in `.env.local`:
   ```env
   MISSIVE_API_URL=http://localhost:3100/api/send
   TEST_EMAIL_TO=you@example.com
   ```
5. Send test emails (`--transport` is required by the API):
   ```bash
   npm run send-test -- --transport smtp    # template 1 via SMTP (MailHog)
   npm run send-test -- --transport ses     # template 1 via SES
   npm run send-test 2 --transport smtp     # template 2
   npm run send-test your@email.com --transport smtp   # custom recipient
   npm run send-test-pdf                    # with a PDF attachment
   ```

Unit tests run with `npm run test` (Vitest), and `npm run validate` runs the full gate:
type-check, duplication check, lint, tests and build. Please run it before opening a PR.

### Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | shadcn/ui + Tailwind CSS v4 |
| ORM | Drizzle |
| Database | PostgreSQL 18 |
| Auth | Better Auth (email/password, API keys, organizations) |
| RPC | oRPC |
| Email sending | Nodemailer (SES + SMTP, caller-selectable per request) |
| Validation | Zod |
| Image build | Railpack → `ghcr.io/bn3t/missive` |

### NPM scripts

| Script | Description |
|---|---|
| `dev` | Start the Next.js dev server (port 3100) |
| `build` | Production build |
| `start` | Apply migrations, then start the production server |
| `compile` | Type-check with `tsc --noEmit` |
| `lint` / `lint:fix` | Run ESLint |
| `test` / `test:watch` | Run Vitest |
| `validate` | compile + fallow + lint + test + build |
| `db:generate` | Generate a Drizzle migration |
| `db:migrate` | Apply migrations |
| `db:push` | Push the schema to the database (dev only) |
| `db:studio` | Open Drizzle Studio |
| `seed` | Create the admin user, reading `.env.local` (dev) |
| `seed:deploy` | Same, reading the process environment (containers) |
| `send-test` / `send-test-pdf` | Send test emails via `/api/send` (requires `MISSIVE_API_KEY`) |

---

## Infrastructure / SES Setup

Optional — only if you want to use the `ses` transport with a freshly provisioned
sender identity and IAM user.

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

MIT — © Bernard Niset / SmartObjects SRL. See [LICENSE](LICENSE).
