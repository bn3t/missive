# Organization Plugin — Spec

## 1. Problem

Today, every record in `sent_emails` is scoped to a single `userId`. Two people who share a transactional mailbox (e.g., a team using one set of SES credentials) cannot see each other's sends through the dashboard — each user only sees what *they personally* triggered. There is no way to grant a colleague visibility into a shared sending history without sharing a login.

This blocks the canonical "shared mailbox" use case Missive is meant to support: a small group operating one outbound stream and collaborating on the resulting audit log (delivery success, content, attachments).

The Organization plugin from Better Auth gives us first-class support for grouping users so they share access to the same sent-email history.

## 2. Goals & Non-Goals

### Goals
- Group users into organizations so members of the same org share visibility into the org's `sent_emails`.
- Replace the per-user (`userId`) access-control filter with a per-org (`organizationId`) filter across all 6 query sites.
- Auto-create a default org for every user (existing and new) so the product still works seamlessly for solo users.
- Allow an org owner/admin to add other existing users as members, change their roles, and remove them.
- Keep `userId` on every email row as audit (who triggered the send), without using it for access control.
- Ship behind a single deployment with a full migration; brief downtime is acceptable given the project's early stage.

### Non-Goals
- Teams (sub-groups within an org). The Better Auth "teams" sub-feature is out of scope; if finer-grained grouping is needed later, the existing `tenantId` field on `sent_emails` can serve.
- Multi-org membership. We start with `organizationLimit: 1`. The data model supports multi-org from day one, so this is just a config knob to relax later.
- Email-based invitation flow. Admins add **existing users only** via an email-lookup form. No invitation emails, no account auto-provisioning.
- Org switcher UI. Not needed while every user has exactly one org.
- Custom permission system via `createAccessControl`. Better Auth's default roles cover our needs.
- Hard delete of an organization's data. We use soft-delete to preserve audit trail.

## 3. User Flows

### 3.1 Existing user (post-migration)
1. Migration runs: a personal organization is created for every existing user (named `"<user.name>'s Organization"`); the user becomes the `owner`; all of their `sent_emails` rows are backfilled with that `organizationId`.
2. User logs in. Session resolves an `activeOrganizationId` (their only org).
3. Dashboard behaves as before — they see exactly the same emails they saw pre-migration.
4. Header shows the new org name in place of the static "Team" label.

### 3.2 New user signup
1. User signs up via the existing email/password form.
2. `databaseHooks.user.create.after` (server-side) creates a default org named `"<user.name>'s Organization"`, adds the user as `owner`, and sets `activeOrganizationId` on their session.
3. User lands on the dashboard with an empty list, ready to send.

### 3.3 Owner adds a colleague to the org
1. Owner navigates to `/settings/organization/members`.
2. Clicks "Add member", types the colleague's exact email address, submits.
3. Server checks whether a user with that email exists:
   - **Not found** → error: "No account with that email."
   - **Already in another org** (and `organizationLimit === 1`) → error: "User already belongs to an organization."
   - **Found and free** → membership row created with role `member`.
4. Colleague refreshes; they now see the org's emails alongside the org name in the header.

### 3.4 Role management
1. Owner/admin opens the members table.
2. Each member row has a role dropdown (`member` ↔ `admin` ↔ `owner`) governed by Better Auth defaults: admins cannot demote/promote owners; only owners can grant ownership.
3. Owner can promote a member to owner before leaving (see 3.6).

### 3.5 Member removal
1. Owner/admin clicks "Remove" on a member row.
2. Confirmation dialog explains: "Their access ends immediately. Emails they sent stay with the organization."
3. On confirm, member row is deleted; the removed user loses access on next request.
4. Their `userId` remains stamped on the rows they sent. The detail page renders "Sent by removed user" if the user no longer has a membership in this org (see §5).
5. The removed user's API keys are revoked (see §4.6).

### 3.6 Owner leaves / org has only one owner
- A user with role `owner` cannot leave or be removed if they are the **last owner**. The UI shows: "Promote another member to owner first, or delete the organization."
- Once another owner exists, the leaving owner uses "Leave organization" on `/settings/organization/general`.

### 3.7 Org deletion (soft delete)
1. Owner navigates to `/settings/organization/general` → "Delete organization".
2. Confirmation requires typing the org name.
3. On confirm:
   - Org is soft-deleted (a `deletedAt` timestamp is set on the `organization` row).
   - All `sent_emails` rows for the org remain in the DB but are hidden from every UI/API path (queries filter `organizationId IS NOT NULL AND organization.deletedAt IS NULL`, or equivalent join).
   - All members lose access immediately.
   - All API keys belonging to former members are revoked (see §4.6).
4. The deleted org is no longer recoverable through the UI — restore would be a manual DB operation.

### 3.8 Sending via API key
1. Caller sends `POST /api/send` with a `Bearer mk_…` API key.
2. Server resolves the key → `userId`.
3. Middleware looks up the user's single membership → `organizationId`. (One extra DB query per API-key request; the trade-off was accepted.)
4. The send proceeds; the resulting `sent_emails` row gets both `userId` (audit) and `organizationId` (access).
5. If the user has **no org** (left/deleted), the request is rejected with a clear error and the API key is treated as revoked until they join an org.

## 4. Technical Design

### 4.1 Plugin wiring
- Server: add `organization()` to `src/lib/auth/server.ts`. Configure `organizationLimit: 1`.
- Client: add `organizationClient()` to `src/lib/auth/client.ts`.
- Better Auth 1.4.22 ships the organization plugin — verify in `node_modules` (no version bump expected).

### 4.2 Schema changes (Drizzle, `src/lib/db/schema.ts`)
- New tables provided by Better Auth's organization plugin: `organization`, `member`, `invitation`. (We won't use `invitation` in the MVP UI but keep the table since it's part of the plugin's expected schema.)
- `organization` table: ensure a `deletedAt: timestamp("deleted_at")` column for soft delete (extend if the plugin's default schema lacks it).
- `session` table: add `activeOrganizationId` column.
- `sent_emails` table: add `organizationId` (FK → `organization.id`). Initially nullable; flipped to NOT NULL after backfill in the same migration.
- Generate migration via `drizzle-kit`. Single deployment runs schema change + backfill + NOT NULL flip + code switch atomically.

### 4.3 Access-control switch (the 6 query sites)
All of the following change from `eq(sentEmails.userId, ctx.userId)` to `eq(sentEmails.organizationId, ctx.activeOrganizationId)`. Each query also filters out soft-deleted orgs (`organization.deletedAt IS NULL`).
1. `src/app/(dashboard)/emails/page.tsx` — stats query + list query
2. `src/app/(dashboard)/emails/[id]/page.tsx` — detail query
3. `src/lib/rpc/procedures/emails.ts` — `listEmails` + `getEmailById`
4. `src/app/api/emails/[id]/attachments/[attachmentId]/route.ts` — attachment download
5. `src/app/api/send/route.ts` — passes `organizationId` (resolved from session or API-key middleware) to the sender
6. `src/lib/email/sender.ts` — inserts both `userId` (audit) and `organizationId` (access) into the row

### 4.4 oRPC middleware
- `src/lib/rpc/middleware.ts` resolves `activeOrganizationId` from session.
- Fallback: if the session lacks `activeOrganizationId` (e.g., right after login or for API-key contexts), look up the user's single membership row and treat that as active. Cache nothing — the cost is one indexed lookup.

### 4.5 Auto-create org on signup
- Use `databaseHooks.user.create.after` in the auth config to atomically create:
  - one `organization` row (name = `"${user.name}'s Organization"`),
  - one `member` row (role: `owner`),
  - update the user's session with `activeOrganizationId`.
- Edge case: if `user.name` is empty, fall back to the email local part (`"${email.split('@')[0]}'s Organization"`).

### 4.6 API key lifecycle
- API keys remain user-scoped (no schema change to `apikey`).
- When a user is removed from their org, leaves, or their org is soft-deleted: enumerate the user's API keys and revoke them (set the relevant `enabled`/`revokedAt` flag — exact column depends on Better Auth's `apikey` schema). Sends with revoked keys return 401.
- When the user later joins a new org, they must regenerate keys.

### 4.7 Migration script (run in the same deploy as schema change)
1. For each user without a membership row:
   - Insert `organization` (name from rules above; `deletedAt` null).
   - Insert `member` row (role: `owner`).
2. For each `sent_emails` row with NULL `organizationId`:
   - Resolve the row's `userId` → user's (now-existing) org → set `organizationId`.
3. Verify zero NULL `organizationId` rows remain.
4. Run `ALTER TABLE sent_emails ALTER COLUMN organization_id SET NOT NULL`.
5. Update the seed script (`src/lib/db/seed.ts` or equivalent) to create an org for every seeded user.

### 4.8 Access-control roles (defaults)

| Role   | View emails | Send emails | Add/remove members        | Manage org settings | Delete org |
|--------|-------------|-------------|---------------------------|---------------------|------------|
| owner  | yes         | yes         | yes                       | yes                 | yes        |
| admin  | yes         | yes         | yes (except owners)       | yes                 | no         |
| member | yes         | yes         | no                        | no                  | no         |

No custom `createAccessControl` statements needed — Better Auth's default role grants cover this.

### 4.9 Critical files
- `src/lib/auth/server.ts` — auth config (add organization plugin + databaseHooks)
- `src/lib/auth/client.ts` — client auth config (add organizationClient)
- `src/lib/db/schema.ts` — Drizzle schema (organization, member, invitation, session.activeOrganizationId, sent_emails.organizationId, organization.deletedAt)
- `src/lib/rpc/procedures/emails.ts` — switch scoping
- `src/lib/rpc/middleware.ts` — resolve active org
- `src/app/api/send/route.ts` — pass org through
- `src/lib/email/sender.ts` — write organizationId
- `src/app/(dashboard)/emails/page.tsx` — list/stats scoping
- `src/app/(dashboard)/emails/[id]/page.tsx` — detail scoping + "Sent by …" display
- `src/app/api/emails/[id]/attachments/[attachmentId]/route.ts` — attachment scoping

## 5. UI & UX

### 5.1 Header
- Replace the static **"Team"** dropdown item with the **org name + dropdown menu**.
- Menu items:
  - Organization settings → `/settings/organization/general`
  - Members → `/settings/organization/members`
  - Sign out (existing)
- The org name is fetched once per page load from session context.

### 5.2 Settings pages
Routes use sub-paths to allow deep linking:
- `/settings/organization/general` — name (rename), danger zone (leave / delete).
- `/settings/organization/members` — table of members (name, email, role, joined date, actions).

### 5.3 Add member dialog
- Single text input: "User email".
- Submit → server validates (exists / not-already-in-org).
- New member is added with role `member`. Role can be changed later in the table.
- Errors displayed inline:
  - "No account found with that email."
  - "User already belongs to another organization."
  - "User is already a member."

### 5.4 Member row actions
- Role dropdown: `member` / `admin` / `owner`. Disabled for the current user's own row when they would demote themselves below `owner` and are the last owner.
- "Remove" button: confirmation dialog, then delete the membership.
- The last `owner` cannot be demoted or removed; the UI disables those actions and shows a hint.

### 5.5 Email list page
- Unchanged: only recipient / subject / date columns.
- Email attribution (sender user) appears **only on the detail page**.

### 5.6 Email detail page
- Add a "Sent by" line. Renders:
  - Active member: `Sent by <name> <<email>>`.
  - User no longer in this org: `Sent by removed user`.
- All other fields unchanged.

### 5.7 Empty/error states
- New user: org exists, email list is empty (current behavior).
- User without org (post-leave/delete edge case before joining a new one): dashboard shows a banner: "You're not part of an organization. Ask an admin to add you, or sign up again."
- Org soft-deleted while user is mid-session: next request 403s with a redirect to a "This organization has been deleted" page.

## 6. Open Questions

1. **API key revocation mechanism** — Better Auth's `apikey` plugin may expose `enabled` (boolean) or require deletion to revoke. Recommendation: use the soft-disable mechanism if available so users can audit their previously revoked keys. Confirm in the plugin source.
2. **Soft-delete query overhead** — joining `sent_emails` against `organization` for `deletedAt IS NULL` adds cost. Recommendation: index `(organization_id)` on `sent_emails` and `(deleted_at)` on `organization`; revisit if list-page latency degrades.
3. **Active org on first login after migration** — if `session.activeOrganizationId` is set during migration vs. on first login. Recommendation: backfill `activeOrganizationId` for **existing sessions** during the same migration so users don't need to log out/in.

## 7. Out of Scope (Explicitly Deferred)

- Email-based invitations and the corresponding `/invitation?id=…` acceptance page (the `invitation` table exists but no UI surfaces it).
- Multi-org membership and an org switcher (`organizationLimit > 1`).
- Teams within orgs.
- Hard-delete of organizations + audit-trail erasure (we soft-delete only).
- Org-scoped (vs. user-scoped) API keys.
- Per-org SES/SMTP credentials. Transports remain global.
- Custom permission rules beyond the three default roles.
- An `organizationId` field on the public send API payload (kept for a future multi-org bump).
- A doc note on `tenantId` (caller's multi-tenancy label) vs `organizationId` (Missive's internal org). Worth writing later to avoid confusion, but not part of this delivery.

## 8. Success Metrics

- **Zero data loss post-migration**: pre-migration `count(*) from sent_emails per user` equals post-migration `count(*) from sent_emails joined to org via member`. No NULL `organizationId` rows after the NOT NULL flip.
- **CI green**: type-check, build, and the full test suite pass on the migration PR. Existing `userId`-scoped tests have been updated, and new tests cover:
  - cross-org access denial (user from org A cannot read org B emails through any of the 6 sites),
  - newly-added member gains access,
  - removed member loses access,
  - the three default-role permission boundaries.

## Additional Notes

- **Better Auth 1.4.22 compatibility** — the organization plugin exists in this version. Verify in `node_modules` before starting; no version bump expected.
- **API key sessions lack `activeOrganizationId`** — middleware does one extra DB lookup of the user's single membership per API-key request. Acceptable given current scale.
- **`tenantId` vs `organizationId`** — distinct concepts. The former is a free-text label set by callers for their own multi-tenancy; the latter is Missive's internal access-control unit. They should never be conflated in code or docs.
- **Existing tests** referencing `userId`-based scoping will be rewritten as part of Phase 2 (see implementation phases below).

## Implementation Phases (sequenced inside a single deploy)

### Phase 1 — Auth config + Schema
- [x] Add `organization()` plugin to server auth config (`src/lib/auth/server.ts`)
- [x] Add `organizationClient()` to client auth config (`src/lib/auth/client.ts`)
- [x] Add `organization`, `member`, `invitation` tables to Drizzle schema; include `organization.deletedAt`
- [x] Add `activeOrganizationId` to session table
- [x] Add `organizationId` column to `sent_emails` (nullable initially)
- [ ] Generate migration

### Phase 2 — Data migration + scoping switch
- [x] Write migration script: for each existing user, create an org named `"<name>'s Organization"`, create a member row (role: owner), backfill `sent_emails.organizationId`, backfill `session.activeOrganizationId`
- [ ] Make `organizationId` NOT NULL after backfill
- [x] Switch all 6 query sites from `userId` to `organizationId` scoping (filtering out soft-deleted orgs)
- [x] Update send API and sender to pass `organizationId` (and write both userId + organizationId to the row)
- [x] Update oRPC middleware to resolve active organization from session, with API-key fallback
- [ ] Update seed script
- [ ] Update existing tests; add cross-org access-control tests

### Phase 3 — Signup flow
- [x] Auto-create org on user signup via `databaseHooks.user.create.after`, including `activeOrganizationId` set on the new session
- [x] Fallback for empty `user.name` (use email local part)

### Phase 4 — UI
- [x] `/settings/organization/general` — rename, leave, delete (soft)
- [x] `/settings/organization/members` — table, add-by-email dialog, role dropdown, remove with last-owner guard
- [x] Replace header "Team" dropdown with org name + dropdown menu (settings, members, sign out)
- [x] Email detail page: "Sent by …" line, with "removed user" fallback
- [ ] Empty/error states: no-org banner, deleted-org redirect

### Phase 5 — API key lifecycle
- [x] Revoke API keys when a user is removed, leaves, or their org is soft-deleted
- [x] Reject API-key sends with 401 when the user has no org
