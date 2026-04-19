# Spec: Persist & display email attachments

## 1. Problem

The Missive `/api/send` endpoint already accepts file attachments and forwards them to the recipient via Nodemailer, but the sender-facing record only stores a `hasAttachments` boolean — the bytes are discarded the moment the request finishes. Operators using the dashboard to audit what was actually delivered cannot see or retrieve the files that went out. This undermines Missive's core value prop ("self-hosted transactional log") for any flow that sends PDFs, receipts, or reports.

Primary user: the operator / developer who owns a Missive instance and uses the dashboard to verify, debug, or re-download a previously sent email's attachments.

## 2. Goals & non-goals

**Goals**
- Persist the binary content of every attachment handed to `/api/send`, for both successful and failed sends.
- Show, on the email detail page, a list of attachments with filename, size, and content type.
- Offer a **Download** action on every attachment.
- Offer an **inline PDF preview** when `contentType === "application/pdf"`.
- Show a paperclip indicator on email list rows when `hasAttachments` is true.
- Any authenticated dashboard user can view/download any email's attachments (matches "single-tenant internal tool" posture).

**Non-goals**
- Retention / auto-purge (deferred — see §6).
- Enforcing hard upload caps beyond SES's existing 10 MB raw-message limit (see §6).
- Inline preview for non-PDF types (images, text, office docs).
- Virus / malware scanning.
- Re-sending or editing a previously sent email from the dashboard.
- Multi-tenant isolation of attachments (Missive is currently single-tenant at the dashboard level).

## 3. User flows

### Flow A — Operator audits a sent email with a PDF

1. Operator logs into the dashboard.
2. On `/emails` they see a row for the email; a paperclip icon in the "Attachments" column signals a file is attached.
3. Click the row → `/emails/[id]`.
4. A new **Attachments** card appears under **Details**, listing `basic-text.pdf` with size (e.g. `12.4 KB`) and a content-type badge.
5. Because the type is PDF, an iframe below the row renders the file inline (same visual treatment as the HTML Preview card).
6. Clicking **Download** saves the PDF to disk with its original filename.

### Flow B — Operator inspects a failed send

1. Same entry points as Flow A.
2. Detail page shows `status: failed` + error message.
3. Attachments card still renders; files are persisted regardless of send outcome — useful for reproducing the payload during debugging.

### Flow C — Email with no attachments

1. Detail page shows no Attachments card (not an empty card with "None").
2. List row has no paperclip.

## 4. Technical design

### 4.1 Data model

New table `email_attachments` in `src/lib/db/schema.ts`:

```ts
export const emailAttachments = pgTable("email_attachments", {
  id: uuid("id").primaryKey().defaultRandom(),
  emailId: uuid("email_id")
    .notNull()
    .references(() => sentEmails.id, { onDelete: "cascade" }),
  filename: text("filename").notNull(),
  contentType: text("content_type").notNull(),
  size: integer("size").notNull(),          // bytes
  content: bytea("content").notNull(),      // raw bytes
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
```

`bytea` is declared once at the top of the schema file via Drizzle's `customType`:
```ts
const bytea = customType<{ data: Buffer }>({ dataType: () => "bytea" });
```

No changes to `sentEmails`. `hasAttachments` remains the denormalized flag used by the list view.

Migration: `npm run db:generate` then `npm run db:push` (dev) / `db:migrate` (prod).

### 4.2 Ingestion (`src/lib/email/sender.ts`)

1. Hoist the base64→Buffer map (currently inline on line 70) above the try block so the Buffers are reused for both the Nodemailer payload and the DB insert.
2. In **both** the success and failure branches, if `input.attachments?.length > 0`, insert rows into `email_attachments` with `emailId = id`.
3. The `db.insert(sentEmails)` and `db.insert(emailAttachments)` should run inside a `db.transaction(...)` so a partial failure doesn't leave orphaned rows. (If the transport succeeds but the DB insert fails, the existing code already loses the record; wrapping in a tx keeps that behaviour consistent between the email row and its children.)

No caller-facing API change; `/api/send` continues to accept the same zod schema.

### 4.3 Download / view route

New file: `src/app/api/emails/[id]/attachments/[attachmentId]/route.ts`

- `GET` handler.
- Auth: `auth.api.getSession({ headers: request.headers })`; 401 if no session. No further authorization — any authenticated user may read any attachment.
- Validate that the attachment exists and its `emailId` matches the `[id]` path segment (prevents a correct `attachmentId` being fetched via a bogus `[id]`, which would muddle logs).
- Respond with a `Response` body containing the raw Buffer and headers:
  - `Content-Type`: stored `contentType`.
  - `Content-Length`: stored `size`.
  - `Content-Disposition`: `inline; filename="<filename>"` by default; `attachment; filename="<filename>"` when the request has `?download=1`.
  - `Cache-Control`: `private, max-age=3600`.
- Filenames must be RFC 5987-encoded (`filename*=UTF-8''...`) to survive non-ASCII names.

### 4.4 oRPC / server-component data fetch

The detail page (`src/app/(dashboard)/emails/[id]/page.tsx`) is already a server component that queries `sentEmails` directly. Add a second query in the same function:

```ts
const attachments = email.hasAttachments
  ? await db
      .select({ id: emailAttachments.id, filename: emailAttachments.filename,
                contentType: emailAttachments.contentType, size: emailAttachments.size })
      .from(emailAttachments)
      .where(eq(emailAttachments.emailId, email.id))
  : [];
```

Do not extend `getEmailById` in `src/lib/rpc/procedures/emails.ts` at this time — no client component needs it yet. `listEmails` stays unchanged; the list UI uses the existing `hasAttachments` flag.

### 4.5 Dependencies

None new. Uses existing Drizzle, Better Auth, and Next 16 App Router.

## 5. UI & UX

### 5.1 List page (`/emails`)

- Add an "Attachments" column (or overlay on the subject cell) that renders a `Paperclip` lucide icon when `hasAttachments` is true, nothing when false. Narrow column, icon-only, with a `title="Has attachments"` for accessibility.

### 5.2 Detail page

- Remove the current Attachments entry from the Details `<dl>` (lines 107–118 of the page).
- When `email.hasAttachments`, render a new `Card` titled **Attachments** directly below the Details card and above the HTML Preview card.
- Each row of the card:
  - Paperclip icon + filename (monospace).
  - `Badge` with content type.
  - Human-readable size (`B` / `KB` / `MB`).
  - `Button` (variant: `outline`, size: `sm`) labelled **Download**, rendered as `<Link href="/api/emails/[id]/attachments/[attId]?download=1">`.
- If `contentType === "application/pdf"`, immediately below that row render:
  ```tsx
  <iframe
    src={`/api/emails/${email.id}/attachments/${att.id}`}
    className="h-[600px] w-full rounded-md border"
    title={att.filename}
  />
  ```
  (Matching the HTML Preview iframe sizing for visual consistency.)

### 5.3 Edge cases & states

- **No attachments** → Attachments card is not rendered at all (avoid an empty "None" state).
- **Corrupted or missing file** (e.g. someone deleted rows in psql) → download route returns 404; iframe shows the browser's default broken-content state. Acceptable for now; no custom empty UI.
- **Very large PDF** → iframe loads via the route; browser handles progressive rendering. 1-hour private cache keeps repeat views fast.
- **Non-ASCII filenames** → RFC 5987 encoding on `Content-Disposition` preserves the name when downloading.
- **Failed send with attachments** → Attachments card renders identically; the error message is still shown in the Details card.

## 6. Open questions

1. **Upload size limits.** No hard per-file or per-email cap is enforced in this iteration. Practical ceiling is SES's 10 MB raw-message limit. If abuse or DB bloat appears, add a server-side zod `.refine` on base64 length and a per-email aggregate check. Recommendation: ship without caps; revisit after two weeks of real usage.
2. **Retention / auto-purge.** User deferred. When revisited, likely answer is a nightly job that sets `content = NULL` on rows older than N days and keeps metadata so the UI can show "expired". Schema is already nullable-friendly if we loosen the `.notNull()` on `content` at that time.
3. **Caching strategy for the download route.** Chosen: `private, max-age=3600`. If operators report stale content after re-sends, switch to `no-store` — attachments are immutable after insert, so the risk is low.
4. **`Content-Disposition: inline` for non-PDF types.** The route always sends `inline` unless `?download=1`. For types like HTML this could theoretically render in the iframe, but we intentionally only wire up PDF previews in the UI. If future UI wants image preview, no server change is needed.

## 7. Out of scope

- Retention/purge job.
- Admin-only access tier or per-tenant isolation.
- Inline preview for images, text, HTML, or office formats.
- Attachment de-duplication (sha256 content-addressing).
- Replaying or resending an email from the dashboard.
- Virus scanning or MIME sniffing / validation against declared `contentType`.
- Streaming uploads (current API is a single JSON body with base64).
- Signed / time-limited URLs for unauthenticated sharing.

## 8. Success metrics

- **Functional**: After shipping, sending `npm run send-test-pdf` and opening the resulting email in the dashboard shows the PDF inline and a working Download button. Bytes downloaded match the source file exactly (`shasum` equivalence).
- **Coverage**: 100% of new sends with attachments produce corresponding rows in `email_attachments` (can be checked with `SELECT count(*) FROM sent_emails WHERE has_attachments AND NOT EXISTS (SELECT 1 FROM email_attachments WHERE email_id = sent_emails.id);` — should be 0).
- **Regression**: Sending without attachments continues to produce `hasAttachments = false` rows and no `email_attachments` rows; detail page renders no Attachments card.
- **Performance**: Detail page for an email with a 1 MB PDF loads in under 500 ms on local dev; iframe fully renders the PDF within 1 s after the HTML loads.
- **Security**: Hitting the download route without a session returns 401; hitting it with a session returns the file (matches "any authenticated user" policy).
