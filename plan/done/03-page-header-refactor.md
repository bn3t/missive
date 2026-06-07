# 03 — Page Header Component + Email Detail Subcomponents

## Context

Dashboard pages repeat the same header markup (h1 + description paragraph, or icon + h1 + optional action button) in different ways across every page, causing inconsistency. A local `OrgPageHeader` function already exists in the organization/general page — evidence of the same need felt ad-hoc. The goal is to:

1. Extract a single reusable `PageHeader` component covering all header patterns used across dashboard pages
2. Extract the email detail page's three card sections into page-specific subcomponents under a `components/` subfolder

This refactoring should reduce code duplication (currently 5% / 191 lines per fallow baseline) and improve readability without changing any behaviour.

---

## 1. Create `src/components/page-header.tsx`

```tsx
interface PageHeaderProps {
  title: string
  description?: string
  icon?: React.ReactNode
  action?: React.ReactNode  // rendered on the right (e.g. Create Key button)
}
```

- No `"use client"` — works as server or client component
- When `action` is present: wraps title row and action in `flex items-center justify-between`
- When `icon` is present: renders icon inline with title using `flex items-center gap-3`
- Title: `text-2xl font-bold tracking-tight`
- Description (when present): `text-sm text-muted-foreground mt-1`

---

## 2. Update pages to use `<PageHeader>`

| File | Props |
|---|---|
| `src/app/(dashboard)/emails/page.tsx` | `title="Email Logs" description="Monitor and track your transactional email activity"` — both the main return and the no-org early-return |
| `src/app/(dashboard)/profile/page.tsx` | `title="Profile" description="Manage your account settings"` |
| `src/app/(dashboard)/settings/api-keys/page.tsx` | `icon={<KeyRound />} title="API Keys" action={<Dialog trigger.../>}` |
| `src/app/(dashboard)/settings/organization/general/page.tsx` | `icon={<Building2 />} title="Organization Settings"` — remove the local `OrgPageHeader` function |
| `src/app/(dashboard)/settings/organization/members/page.tsx` | `icon={<Users />} title="Members" action={isAdmin && <Dialog.../>}` — also fix the loading/empty-org states |

---

## 3. Extract email detail subcomponents

Create `src/app/(dashboard)/emails/[id]/components/`:

**`email-detail-header.tsx`**
- Props: `{ subject: string }`
- Renders: back-button `<Link href="/emails">` + email subject as h1
- Layout: `flex items-center gap-3`

**`email-metadata-card.tsx`**
- Props: typed object with `{ sentByLabel, to, status, sentAt, template?, tenantId?, messageId?, transport?, errorMessage? }`
- Renders: the Details `<Card>` with the `<dl>` grid

**`email-attachments-card.tsx`**
- Props: `{ emailId: string, attachments: AttachmentRow[] }`
- Renders: the Attachments `<Card>` with PDF preview dialogs and download links
- Component is rendered conditionally by the page when `attachments.length > 0`

**`email-html-preview.tsx`**
- Props: `{ htmlBody: string | null }`
- Renders: the HTML Preview `<Card>` with the sandboxed `<iframe>`

The `page.tsx` data-fetching stays unchanged (server component); it passes typed props to each subcomponent.

---

## File structure after changes

```
src/
  components/
    page-header.tsx                        ← new
  app/(dashboard)/
    emails/
      page.tsx                             ← uses <PageHeader>
      [id]/
        page.tsx                           ← delegates to subcomponents
        components/
          email-detail-header.tsx          ← new
          email-metadata-card.tsx          ← new
          email-attachments-card.tsx       ← new
          email-html-preview.tsx           ← new
    profile/page.tsx                       ← uses <PageHeader>
    settings/
      api-keys/page.tsx                    ← uses <PageHeader>
      organization/
        general/page.tsx                   ← uses <PageHeader>, drops OrgPageHeader
        members/page.tsx                   ← uses <PageHeader>
```

---

## 4. Tests

Write tests **before** implementing the component (TDD). Tests go in `src/components/page-header.test.tsx` following the Vitest + React Testing Library pattern used in the rest of `src/components/`.

### `PageHeader` unit tests (`src/components/page-header.test.tsx`)

Cover these cases:

| Case | What to assert |
|---|---|
| Title only | `getByRole("heading", { name })` is in the document |
| Title + description | description text is in the document |
| No description | no `<p>` element rendered |
| With icon | icon node is rendered (use `data-testid` on the test icon) |
| With action | action node is rendered (`getByRole("button", { name })`) |
| Action present → justify-between | root wrapper element has class `justify-between` |
| Icon + action together | icon and heading share the same parent `<div>` (left group) |
| No icon → no icon wrapper | heading element itself does not have `gap-3` class |

### Email detail subcomponent tests

Each subcomponent in `emails/[id]/components/` gets its own test file alongside it:

**`email-detail-header.test.tsx`**
- Renders subject as a heading
- Renders a link back to `/emails`

**`email-metadata-card.test.tsx`**
- Renders "Details" card title
- Shows recipient, status badge, sent-at date
- Shows template badge when `template` is provided, hides it when `null`
- Shows tenantId, messageId, transport when provided
- Shows error message spanning full width when `errorMessage` is set
- Shows "Removed user" label when `sentByLabel` is that value

**`email-attachments-card.test.tsx`**
- Renders "Attachments" card title
- Lists each attachment's filename, content type badge, and formatted size
- Renders a Download link with the correct `href`
- Renders `PdfPreviewDialog` only for `application/pdf` attachments (mock the dialog)

**`email-html-preview.test.tsx`**
- Renders "HTML Preview" card title
- Renders an `<iframe>` with `srcDoc` set to the provided HTML
- `<iframe>` has `sandbox="allow-same-origin"`

---

## Validation

```bash
npm run validate
```

This runs: `compile → fallow (dupes regression check) → lint → test → build`

After all changes pass, update the fallow baseline to lock in the improvement:

```bash
npx fallow dupes --write-baseline fallow-dupes-baseline.json
```

Commit the updated `fallow-dupes-baseline.json` alongside the code changes.

### Manual smoke test

- `/emails` — "Email Logs" header + description renders correctly
- `/emails/[id]` — back button + email subject in header; Details, Attachments (if any), HTML Preview cards all render
- `/profile` — "Profile" header + description
- `/settings/api-keys` — icon + "API Keys" title + "Create Key" dialog still works
- `/settings/organization/general` — icon + "Organization Settings", rename/leave/delete flows unchanged
- `/settings/organization/members` — icon + "Members" title + "Add member" dialog still works
