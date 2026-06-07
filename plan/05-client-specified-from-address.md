# Client-Specified From Address — Spec

## 1. Problem

The `from` address used when sending emails is always taken from the `EMAIL_FROM` environment variable. It is hard-coded in `src/lib/email/sender.ts:89` and is never exposed to API clients:

```ts
from: env.EMAIL_FROM,
```

`EMAIL_FROM` is required at startup and is the only source of the `from` value. It is never part of `SendEmailInput`, never threaded through `sendViaTransport`, and never written to the database.

Consequences:
- Every email sent through Missive appears to come from the same fixed sender, regardless of what the caller might want.
- The Plunk-compatible API allows a per-request `from` field, so parity requires exposing this in Missive's send endpoint.
- The `from` address is never persisted to the `sent_emails` table, so the dashboard cannot show which sender address was used for a given email.

## 2. Goals & Non-Goals

### Goals
- Allow API clients to pass an optional `from` field in the POST body of `/api/send`.
- Fall back to `EMAIL_FROM` when `from` is omitted (preserves backward compatibility for existing callers).
- Persist the resolved `from` address in the `sent_emails` table.
- Surface the `from` address in the dashboard email detail view, with EMAIL_FROM substituted for historical rows.
- Return the resolved `from` in the API response for caller transparency.

### Non-Goals
- Validating that the `from` address is a verified SES identity (this is AWS's responsibility; errors surface as `failed` send status).
- Per-org allowlists, verified-sender registration, or any other authorization gate on which `from` values a caller may use. Trust the caller — same posture as Plunk.
- Adding a `From` column to the email list table (too wide; detail view is sufficient for now).
- Multi-sender configuration or sender profiles.
- Strict RFC 5322 format validation in Zod (would break legitimate `"Display Name <addr>"` forms; Nodemailer handles parsing).

## 3. User Flows

### Flow A — API caller omits `from` (backward compatible)
1. Client `POST /api/send` with body containing `to`, `subject`, `body`, no `from`.
2. Server resolves `from = env.EMAIL_FROM`.
3. Transport sends with that address; row inserted with `from_address = EMAIL_FROM`.
4. Response includes `from: "<EMAIL_FROM value>"` so the caller sees what was used.

### Flow B — API caller specifies `from`
1. Client `POST /api/send` with `from: "Alice <alice@brand.com>"` (or plain `"alice@brand.com"`).
2. Zod accepts the string (trim, length ≤ 320). No format/authorization check.
3. Server resolves `from = "Alice <alice@brand.com>"`.
4. Transport sends; row inserted with that exact value in `from_address`.
5. Response includes `from: "Alice <alice@brand.com>"`.
6. If SES/SMTP rejects the sender (unverified domain, etc.), the existing try/catch records `status = "failed"` — the failure mode is graceful.

### Flow C — Dashboard user views a newly-sent email
1. User opens `/emails/[id]`.
2. RPC returns `fromAddress` (the persisted value, may be non-null).
3. Server component substitutes `env.EMAIL_FROM` if `fromAddress` is null (only for legacy rows).
4. Detail card shows a **From** row with the resolved address in monospace.

### Flow D — Dashboard user views a historical email (pre-feature)
1. User opens `/emails/[id]` for a row written before this change.
2. RPC returns `fromAddress = null`.
3. Server component substitutes `env.EMAIL_FROM` (the value that *would* have been used at send time, approximated by current config).
4. Detail card shows the **From** row with the current `EMAIL_FROM`. The user sees a sensible value rather than blank/“(default)”.

## 4. Technical Design

### 4.1 DB schema — add `from_address` column

**File: `src/lib/db/schema.ts`**

Add a nullable `text` column to `sentEmails`:

```ts
fromAddress: text("from_address"),
```

Nullable is correct: existing rows have no persisted `from`, and `null` accurately represents "the global default was used at time of send" — preserving data fidelity at the persistence layer (substitution happens at the UI edge, not in the DB or RPC).

Generate and apply the migration:

```bash
npx drizzle-kit generate
npx drizzle-kit migrate   # or npm run db:push in dev
```

Generated SQL:
```sql
ALTER TABLE "sent_emails" ADD COLUMN "from_address" text;
```

### 4.2 Env — no change

`EMAIL_FROM` in `src/lib/env.ts` stays required. It remains the fallback default. No new env var is needed.

### 4.3 API route — accept optional `from`

**File: `src/app/api/send/route.ts`**

Extend the Zod request schema:

```ts
from: z.string().trim().min(1).max(320).optional(),
```

- `.trim()` normalizes accidental whitespace before length validation.
- `max(320)` matches RFC 5321 max email length and acts as a cheap abuse guardrail.
- No format regex — display-name forms must work.

Pass it through to `sendEmail`:

```ts
const result = await sendEmail({
  ...parsed.data,
  from: parsed.data.from,
  userId: session.user.id,
  organizationId: activeOrganizationId,
});
```

### 4.4 Sender — thread `from` through and resolve it

**File: `src/lib/email/sender.ts`**

**4.4a — Extend `SendEmailInput`:**
```ts
export interface SendEmailInput {
  // ... existing fields ...
  from?: string;
}
```

**4.4b — Resolve the effective sender at the top of `sendEmail`:**
```ts
const resolvedFrom = input.from?.trim() || env.EMAIL_FROM;
```

Defense-in-depth trim (Zod already trims, but `sendEmail` may be called from non-HTTP paths).

**4.4c — Use `resolvedFrom` in the transport call (was `env.EMAIL_FROM`):**
```ts
from: resolvedFrom,
```

**4.4d — Persist `resolvedFrom` in the DB insert:**
```ts
fromAddress: resolvedFrom,
```

Note: persisting the resolved value (not the raw input) means new rows always have a non-null `from_address` — even when the caller omitted the field. Only pre-migration rows will have `null`.

**4.4e — Return `from` in `SendEmailResult`:**
```ts
return { id, status: "sent", transport: resolvedTransport, from: resolvedFrom, messageId: ... };
```

Add `from: string` to the `SendEmailResult` type so the API response surfaces it.

### 4.5 RPC procedures — expose `fromAddress`

**File: `src/lib/rpc/procedures/emails.ts`**

Add to both output schemas:

```ts
// listEmailsOutput array element and getEmailByIdOutput:
fromAddress: z.string().nullable(),
```

No query changes needed — both procedures use `db.select()` without explicit column selection and will automatically return the new column once the schema is updated. The RPC layer returns the persisted value verbatim (no substitution), keeping the contract honest.

### 4.6 Dashboard — surface `fromAddress` in the detail view

**File: `src/app/(dashboard)/emails/[id]/page.tsx`** (server component)

Substitute `EMAIL_FROM` for null at the page level — the server component already has env access, and this preserves persistence fidelity in the RPC layer:

```tsx
<EmailMetadataCard
  // ... existing props ...
  fromAddress={email.fromAddress ?? env.EMAIL_FROM}
/>
```

**File: `src/app/(dashboard)/emails/[id]/components/email-metadata-card.tsx`**

Card receives a guaranteed non-null string:

```tsx
type Props = {
  // ... existing ...
  fromAddress: string;
};

<div>
  <dt className="text-muted-foreground">From</dt>
  <dd className="font-mono">{fromAddress}</dd>
</div>
```

The **From** row is always rendered (no conditional). Label is **From** to match the API field name and email header convention.

### 4.7 Tests

Four test additions:

1. **`src/app/(dashboard)/emails/[id]/components/email-metadata-card.test.tsx`**
   - Shows the From row with the given value.
   - Renders in monospace.

2. **API route** (`src/app/api/send/route.test.ts` or equivalent)
   - Accepts a request body with `from`.
   - Accepts a request body without `from` (backward compat).
   - Rejects empty-string `from` after trim.
   - Rejects `from` longer than 320 chars.
   - Response body includes `from`.

3. **Sender** (`src/lib/email/sender.test.ts` or equivalent)
   - `input.from` is trimmed and used in transport call.
   - `input.from` is persisted to `from_address`.
   - When `input.from` is omitted or whitespace-only, `EMAIL_FROM` is used in both transport call and DB row.

4. **RPC procedures** (`src/lib/rpc/procedures/emails.test.ts` or equivalent)
   - `listEmails` includes `fromAddress` in each row.
   - `getEmailById` includes `fromAddress`.
   - Output schema validates rows with `fromAddress: null` and non-null strings.

### 4.8 Critical files

| File | Change |
|---|---|
| `src/lib/db/schema.ts` | Add `fromAddress` column |
| `src/lib/email/sender.ts` | Thread `from` through input → transport → DB insert; add to `SendEmailResult` |
| `src/app/api/send/route.ts` | Accept optional `from` in request body (trim + max 320) |
| `src/lib/rpc/procedures/emails.ts` | Expose `fromAddress` (nullable) in output schemas |
| `src/app/(dashboard)/emails/[id]/page.tsx` | Substitute `EMAIL_FROM` for null; pass to card |
| `src/app/(dashboard)/emails/[id]/components/email-metadata-card.tsx` | Render From row (always) |
| `src/app/(dashboard)/emails/[id]/components/email-metadata-card.test.tsx` | New test cases |
| `src/app/api/send/*.test.ts` | New route tests |
| `src/lib/email/sender.test.ts` | New sender tests |
| `src/lib/rpc/procedures/emails.test.ts` | New RPC tests |

## 5. UI & UX

### Detail view
- A **From** row appears in the metadata card for every email.
- Value rendered in monospace, matching the styling used for other technical fields.
- For rows persisted after this change: the actual sent value (which may include display-name form).
- For historical rows (`from_address IS NULL`): the current `EMAIL_FROM` is substituted server-side. The user sees a real address rather than a placeholder.

### List view
- **No change.** No `From` column is added — the table is already wide and the detail view covers the need.

### API response
- The send response now includes `from: string` (the resolved value). Callers can confirm what was actually used without parsing or re-deriving it.

### Edge cases
- `from: "  alice@x.com  "` → trimmed to `alice@x.com` before validation and persistence.
- `from: ""` → rejected by Zod (`.min(1)` after trim).
- `from` longer than 320 chars → rejected by Zod (`.max(320)`).
- `from: "Alice <alice@brand.com>"` → accepted as-is; Nodemailer parses display name.
- Unverified sender domain in SES → send fails, caught by existing try/catch in `sender.ts`, recorded as `status = "failed"`. Failure mode is graceful.
- Existing `sent_emails` rows with `from_address = null` → detail view substitutes `EMAIL_FROM`. RPC still returns `null`.
- Caller specifies `from` matching `EMAIL_FROM` → persisted verbatim; not collapsed to null.

## 6. Open Questions

None remaining. Decisions resolved during interview:

| Question | Resolution |
|---|---|
| Restrict which from addresses are allowed? | No — trust the caller, matches Plunk. |
| What to show for historical `null` rows? | Substitute current `EMAIL_FROM` server-side. |
| Include resolved `from` in API response? | Yes. |
| Zod validation strictness? | Loose: `.trim().min(1).max(320).optional()`. |
| Where does null→EMAIL_FROM substitution happen? | Server component (page.tsx). RPC stays honest about persistence. |
| Test coverage scope? | Route + sender + RPC + metadata card. |
| Field label in dashboard? | **From** (matches API + email header convention). |

## 7. Out of Scope

- Per-organization or per-API-key sender allowlists or verification gates.
- Adding a `From` column to the email list table.
- Multi-sender configuration UI or sender profile management.
- Strict RFC 5322 format validation in Zod.
- Backfilling `from_address` for historical rows (left as `null`; substituted at display time).
- Validating SES identity verification at request time (deferred to the transport's own failure response).
- Exposing or rotating `EMAIL_FROM` via the dashboard.

## 8. Success Metrics

Shipped correctly when all of these are true:

1. **Backward compatibility**: every existing caller (no `from` field) sends successfully with `EMAIL_FROM` and sees no behavior change beyond a new `from` field in the response.
2. **Plunk parity**: a Plunk-style client passing `from: "alice@x.com"` (or display-name form) sees the email delivered with that address and persisted to the row.
3. **Dashboard completeness**: every email detail page — including pre-migration historical rows — displays a populated **From** field.
4. **API transparency**: `POST /api/send` response includes a `from` field matching the address actually used by the transport.
5. **Graceful failure**: unverified-domain sends fail with `status = "failed"` and a clear error path through the existing try/catch — no unhandled crashes or silent successes.
6. **Test coverage**: route, sender, RPC, and metadata card tests pass in CI.

## 9. Risks & Trade-offs

- **SES identity verification**: AWS requires the `from` domain to be verified. Unverified senders cause the send to fail. This is caught by the existing try/catch in `sender.ts` and recorded as `failed`. Operators should document this constraint for API consumers.
- **Open `from`, no allowlist**: any authenticated caller can set any address. This matches Plunk's behavior and is acceptable for a self-hosted service where API keys are tightly scoped, but operators should be aware. SES verification is the real gate.
- **Null semantics for old rows**: `from_address = null` means "we don't know what was sent — but `EMAIL_FROM` at the time was the only possibility." The UI's substitution with *current* `EMAIL_FROM` is an approximation; if `EMAIL_FROM` changes between sending and viewing, the displayed value will not match what was actually sent for historical rows. Considered acceptable because (a) `EMAIL_FROM` rarely changes and (b) the alternative (showing blank/“(default)”) is less informative.
- **Loose validation**: accepting any non-empty string ≤ 320 chars means garbage strings reach Nodemailer. Nodemailer will reject malformed input with a descriptive error, which surfaces as a `failed` row — preferable to a strict regex that rejects valid display-name forms.
