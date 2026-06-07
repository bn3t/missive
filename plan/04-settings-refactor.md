# 04 — Settings Pages Refactor

## Context

The three settings pages — `api-keys/page.tsx` (247 lines), `organization/general/page.tsx` (337 lines), and `organization/members/page.tsx` (427 lines) — are `"use client"` files that share three structural patterns repeated across all of them. A `FormField` component already exists at `src/components/form-field.tsx` (used by auth forms) but the settings pages have not adopted it. The goal is to:

1. Extract a `SettingsCard` wrapper component for the repeated `Card + CardHeader + CardContent` skeleton
2. Extract a `DangerZoneRow` component for the description-left / action-right rows in the Danger Zone card
3. Wire up the existing `FormField` component in the settings pages that duplicate the `Label + Input` pattern
4. Split each settings page into page-scoped subcomponents co-located under a `components/` subfolder, following the same structure as `emails/[id]/components/`

This refactoring should reduce fallow's detected duplication and improve page readability without changing any data-fetching logic, permission checks, form validation schemas, or server actions.

---

## 1. Inventory of repeated patterns and line citations

### Pattern A — `SettingsCard` (appears 5 times across 3 files)

Every substantive section wraps content in the same `Card > CardHeader > CardTitle + CardDescription > CardContent` skeleton. Note: `CardTitle` in the UI library already has `text-base` as its default class; the explicit `className="text-base"` in these pages is redundant noise that the new component eliminates automatically.

| File | Lines | Title |
|---|---|---|
| `api-keys/page.tsx` | 170–243 | "Your API Keys" |
| `general/page.tsx` | 176–199 (no-org branch) | "Create an organization" |
| `general/page.tsx` | 207–228 | "General" |
| `general/page.tsx` | 230–334 | "Danger Zone" (destructive variant) |
| `members/page.tsx` | 296–394 | "Organization members" |

### Pattern B — `DangerZoneRow` (appears 2 times in one file)

Inside `general/page.tsx` the Leave (line 241) and Delete (line 280) rows share the description-left / action-right `flex` layout. This is below the 3+ threshold but it is the only substantive repetition inside the Danger Zone card and extracting it makes the delete/leave dialog wiring much easier to test in isolation.

| File | Lines | Label |
|---|---|---|
| `general/page.tsx` | 241–276 | "Leave organization" row |
| `general/page.tsx` | 280–332 | "Delete organization" row |

### Pattern C — `FormField` adoption (already extracted, not yet used)

`src/components/form-field.tsx` covers `Label + Input` in `space-y-2`. The settings pages duplicate this inline:

| File | Lines | Field |
|---|---|---|
| `api-keys/page.tsx` | 146–156 | Key name input inside Create Key dialog |
| `general/page.tsx` | 185–192 (no-org) | New org name input |
| `general/page.tsx` | 214–222 | Org name rename input |
| `general/page.tsx` | 306–314 | Delete-confirm input inside Delete dialog |
| `members/page.tsx` | 251–263 | Member email input inside Add Member dialog |

Note: the `members/page.tsx` add-member dialog also has a Role `Select` at lines 264–279 — that uses `Label + Select` not `Label + Input`, so it does **not** use `FormField` (which wraps `Input`). The five `Label + Input` instances above are the correct scope.

One limitation: the `api-keys` and `members` instances also attach `onKeyDown` (Enter to submit). `FormField` does not expose `onKeyDown`. The implementation must extend `FormField` with an optional `onKeyDown` prop (see Section 2).

---

## 2. Extend `FormField` with optional `onKeyDown`

Extend the existing `src/components/form-field.tsx` interface:

```tsx
interface FormFieldProps {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;  // new
}
```

Pass `onKeyDown` down to the `<Input>` element. No other change.

---

## 3. Create `SettingsCard`

**File:** `src/components/settings-card.tsx`

```tsx
interface SettingsCardProps {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}
```

- No `"use client"` — pure presentational.
- Renders `Card > CardHeader > CardTitle + (optional) CardDescription > CardContent`.
- `CardTitle` renders without the now-redundant `text-base` override (it is already the default).
- `className` is forwarded to `<Card>` (needed for `border-destructive` on the Danger Zone card).
- `contentClassName` is forwarded to `<CardContent>` (needed for `space-y-4` that some sections require).
- `description` is typed `React.ReactNode` to allow JSX with `<code>` inline elements (as in the api-keys card description).

Usage shape:

```tsx
<SettingsCard
  title="Your API Keys"
  description={<>Use these keys to authenticate …</>}
  contentClassName="space-y-4"
>
  {/* table or form content */}
</SettingsCard>
```

---

## 4. Create `DangerZoneRow`

**File:** `src/components/danger-zone-row.tsx`

```tsx
interface DangerZoneRowProps {
  title: string;
  description: string;
  action: React.ReactNode;
  destructive?: boolean;  // adds border-destructive/40 bg-destructive/5 variant
}
```

- No `"use client"` — purely structural.
- Renders `<div className="flex items-center justify-between rounded-md border p-4">`.
- When `destructive` is `true`: appends `border-destructive/40 bg-destructive/5` to the wrapper (matching the Delete row at `general/page.tsx` line 280).
- `action` is rendered on the right side with a `className="shrink-0 ml-4"` wrapper div.
- Title is `<p className="text-sm font-medium">`, description is `<p className="text-sm text-muted-foreground">`.

---

## 5. Extract page subcomponents

Following the `emails/[id]/components/` precedent, each settings page gets a co-located `components/` directory. All subcomponents are `"use client"` because they receive state/callback props from the parent page.

### `settings/api-keys/components/`

**`create-key-dialog.tsx`**

Props:

```tsx
interface CreateKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  newKeyName: string;
  onNameChange: (name: string) => void;
  onSubmit: () => void;
  newlyCreatedKey: string | null;
  copied: boolean;
  onCopy: (key: string) => void;
}
```

Extracts lines 103–166 from `api-keys/page.tsx`. The `DialogTrigger` and outer `Dialog` open/close stay in the parent page because the trigger is rendered inside `PageHeader`'s `action` prop; the content and logic are in this subcomponent.

**`api-keys-table.tsx`**

Props:

```tsx
interface ApiKeysTableProps {
  keys: ApiKeyRow[];
  loading: boolean;
  onDelete: (keyId: string) => void;
}
```

Extracts lines 170–243 (the `SettingsCard` wrapping the `Table`). Uses `SettingsCard` internally.

### `settings/organization/general/components/`

**`rename-org-card.tsx`**

Props:

```tsx
interface RenameOrgCardProps {
  orgName: string;
  onOrgNameChange: (name: string) => void;
  onSave: () => void;
  saving: boolean;
  isOwner: boolean;
}
```

Extracts lines 207–228. Uses `SettingsCard` and `FormField`.

**`create-org-card.tsx`**

Props:

```tsx
interface CreateOrgCardProps {
  newOrgName: string;
  onOrgNameChange: (name: string) => void;
  onCreate: () => void;
  creating: boolean;
}
```

Extracts lines 176–199 (the no-org branch card). Uses `SettingsCard` and `FormField`.

**`danger-zone-card.tsx`**

Props:

```tsx
interface DangerZoneCardProps {
  orgName: string;
  isLastOwner: boolean;
  isOwner: boolean;
  // Leave dialog
  leaveOpen: boolean;
  onLeaveOpenChange: (open: boolean) => void;
  onLeave: () => void;
  leaving: boolean;
  // Delete dialog
  deleteOpen: boolean;
  onDeleteOpenChange: (open: boolean) => void;
  deleteConfirm: string;
  onDeleteConfirmChange: (value: string) => void;
  onDelete: () => void;
  deleting: boolean;
}
```

Extracts lines 230–334. Uses `SettingsCard` (with `className="border-destructive"`), `DangerZoneRow`, and `FormField` (for the delete-confirm input).

### `settings/organization/members/components/`

**`add-member-dialog.tsx`**

Props:

```tsx
interface AddMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
  onEmailChange: (email: string) => void;
  role: "member" | "admin" | "owner";
  onRoleChange: (role: "member" | "admin" | "owner") => void;
  onSubmit: () => void;
  adding: boolean;
  isOwner: boolean;
}
```

Extracts lines 228–293 (Dialog trigger + content for Add Member). Uses `FormField`.

**`remove-member-dialog.tsx`**

Props:

```tsx
interface RemoveMemberDialogProps {
  target: { name: string } | null;
  onClose: () => void;
  onConfirm: () => void;
  removing: boolean;
}
```

Extracts lines 396–424 (the bottom-level Dialog without a trigger). `open` is derived as `!!target` inside this component.

**`members-table.tsx`**

Props:

```tsx
interface MembersTableProps {
  members: OrgMember[];
  currentUserId: string | undefined;
  isAdmin: boolean;
  isOwner: boolean;
  isLastOwner: boolean;
  updatingRole: string | null;
  onRoleChange: (memberId: string, role: string) => void;
  onRemove: (member: OrgMember) => void;
}
```

Extracts lines 296–394. Uses `SettingsCard`.

---

## 6. File structure after changes

```
src/
  components/
    form-field.tsx                              ← extend with onKeyDown prop
    settings-card.tsx                           ← new
    danger-zone-row.tsx                         ← new
  app/(dashboard)/settings/
    api-keys/
      page.tsx                                  ← simplified, delegates to subcomponents
      components/
        create-key-dialog.tsx                   ← new
        api-keys-table.tsx                      ← new
    organization/
      general/
        page.tsx                                ← simplified, delegates to subcomponents
        components/
          create-org-card.tsx                   ← new
          rename-org-card.tsx                   ← new
          danger-zone-card.tsx                  ← new
      members/
        page.tsx                                ← simplified, delegates to subcomponents
        components/
          add-member-dialog.tsx                 ← new
          remove-member-dialog.tsx              ← new
          members-table.tsx                     ← new
```

---

## 7. Tests

Write tests **before** implementing (TDD). All tests use Vitest + React Testing Library, matching the pattern in `src/components/page-header.test.tsx`.

### `SettingsCard` unit tests (`src/components/settings-card.test.tsx`)

| Case | What to assert |
|---|---|
| Renders title | `getByText("My Title")` is in the document |
| Renders description when provided | description text is in the document |
| No description | no description element rendered |
| Renders children inside content | `getByText("child content")` is in the document |
| className forwarded to Card | root element contains the extra class |
| contentClassName forwarded to CardContent | content wrapper contains the extra class |
| description as JSX node | `<code>` element inside description renders |

### `DangerZoneRow` unit tests (`src/components/danger-zone-row.test.tsx`)

| Case | What to assert |
|---|---|
| Renders title | `getByText("Leave organization")` is in the document |
| Renders description | description text is in the document |
| Renders action | action node is in the document |
| Default variant has border class | wrapper has `rounded-md border` |
| destructive=true adds destructive classes | wrapper has `border-destructive/40` and `bg-destructive/5` classes |
| destructive=false (or omitted) does not add destructive classes | wrapper does not have `border-destructive/40` |

### `FormField` extension tests (`src/components/form-field.test.tsx` — new file)

| Case | What to assert |
|---|---|
| Renders label | `getByLabelText("Name")` resolves to input |
| Renders input with value | input has the provided value |
| onChange fires with new value | mock `onChange` called with typed character |
| onKeyDown fires on Enter | mock `onKeyDown` called when Enter is pressed |
| onKeyDown absent — no error | rendering without onKeyDown throws no error |
| disabled prop disables the input | input has `disabled` attribute |

### Subcomponent tests (co-located with each subcomponent)

**`api-keys/components/api-keys-table.test.tsx`**
- Shows "Loading…" row when `loading=true`
- Shows "No API keys yet" when `keys=[]` and `loading=false`
- Renders a row per key (name, masked prefix, status badge, date)
- Active key shows "Active" badge; disabled shows "Disabled"
- Last-used shows "Never" when `lastRequest` is null
- Delete button calls `onDelete` with the correct key id

**`api-keys/components/create-key-dialog.test.tsx`**
- Renders dialog title "Create API Key" when open
- Shows name input and Create button in initial state
- Create button is disabled when `newKeyName` is empty
- After key creation: shows the key text and Copy button
- Copy button calls `onCopy` with the key value

**`general/components/rename-org-card.test.tsx`**
- Renders "General" card title
- Shows org name input with current value
- Save button is disabled when `isOwner=false`
- Save button is disabled when `orgName` is empty
- Save button calls `onSave` when clicked

**`general/components/create-org-card.test.tsx`**
- Renders "Create an organization" card title
- Shows org name input
- Create button disabled when name is empty or `creating=true`
- Create button calls `onCreate` when clicked

**`general/components/danger-zone-card.test.tsx`**
- Renders "Danger Zone" card title
- Hides Leave row when `isLastOwner=true`
- Shows Leave dialog trigger when not last owner
- Shows Delete row when `isOwner=true`
- Delete dialog Confirm button is disabled until `deleteConfirm === orgName`
- Leave dialog calls `onLeave` on confirm
- Delete dialog calls `onDelete` on confirm

**`members/components/members-table.test.tsx`**
- Renders "Organization members" card title with count
- Shows each member's name and email
- Current user row shows "You" badge
- Admin/non-current-user row shows role select dropdown
- Non-admin rows show badge instead of select
- Remove button calls `onRemove` with the member
- Remove button disabled for the last owner

**`members/components/add-member-dialog.test.tsx`**
- Renders "Add member" dialog title when open
- Shows email input and role select
- Add button disabled when email is empty or `adding=true`
- Add button calls `onSubmit` when clicked
- Owner role option is present when `isOwner=true`, absent when `isOwner=false`

**`members/components/remove-member-dialog.test.tsx`**
- Dialog is closed (not visible) when `target=null`
- Dialog is open when `target` has a name
- Shows member name in description
- Remove button calls `onConfirm`; Cancel calls `onClose`
- Remove button shows "Removing…" and is disabled when `removing=true`

---

## 8. Implementation order

Workers can run in parallel after the shared components are created:

1. **Worker 0 (shared foundations):** Write tests for `SettingsCard`, `DangerZoneRow`, and `FormField` extension → implement all three → confirm `npm run test` passes for these units.
2. **Worker 1 (api-keys page):** Write tests for `api-keys-table` and `create-key-dialog` → implement subcomponents → update `api-keys/page.tsx` to import them.
3. **Worker 2 (general page):** Write tests for `rename-org-card`, `create-org-card`, `danger-zone-card` → implement subcomponents → update `general/page.tsx`.
4. **Worker 3 (members page):** Write tests for `members-table`, `add-member-dialog`, `remove-member-dialog` → implement subcomponents → update `members/page.tsx`.

Workers 1–3 depend on Worker 0 completing `SettingsCard` and `DangerZoneRow` first. Within each worker the TDD order is: test file → implementation → page update.

---

## 9. Validation

```bash
npm run validate
```

This runs: `compile → fallow (dupes regression check) → lint → test → build`

After all changes pass, update the fallow baseline to lock in the improvement:

```bash
npx fallow dupes --write-baseline fallow-dupes-baseline.json
```

Commit the updated `fallow-dupes-baseline.json` alongside the code changes.

Also remove the now-unnecessary `// fallow-ignore-next-line code-duplication` comments at `api-keys/page.tsx` line 7 and `members/page.tsx` line 6 — the actual duplication those guarded has been eliminated.

### Manual smoke test

- `/settings/api-keys` — Create Key dialog opens; table renders; revoke button fires toast
- `/settings/organization/general` (no org) — Create org card appears; form submits
- `/settings/organization/general` (has org) — Rename field; Leave row hidden for last owner; Delete confirm gate works
- `/settings/organization/members` — Add Member dialog; role dropdown; Remove confirmation dialog
