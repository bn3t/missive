/**
 * One-time migration: backfill organizations for existing users and link sent_emails rows.
 *
 * Run with:  npx tsx src/lib/db/migrate-organizations.ts
 *
 * The script is idempotent — it checks whether an org/member already exists before creating.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { randomUUID } from "crypto";
import { eq, isNull } from "drizzle-orm";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toKebabCase(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function randomSuffix(length = 6): string {
  return Math.random().toString(36).slice(2, 2 + length);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // Dynamic imports so dotenv has already run before db/index.ts reads DATABASE_URL
  const { db } = await import("@/lib/db");
  const {
    user,
    organization: organizationTable,
    member: memberTable,
    session: sessionTable,
    sentEmails,
  } = await import("@/lib/db/schema");

  console.log("Starting organization backfill migration…");

  // 1. For each user without a membership, create an org + member row.
  const allUsers = await db.select().from(user);
  console.log(`Found ${allUsers.length} user(s) to process.`);

  for (const u of allUsers) {
    // Check if the user already has a membership
    const [existingMember] = await db
      .select({ organizationId: memberTable.organizationId })
      .from(memberTable)
      .where(eq(memberTable.userId, u.id))
      .limit(1);

    if (existingMember) {
      console.log(`  User ${u.email}: already has org ${existingMember.organizationId}, skipping.`);
      continue;
    }

    // Derive org name
    const displayName = u.name?.trim()
      ? u.name.trim()
      : u.email.split("@")[0];
    const orgName = `${displayName}'s Organization`;

    // Derive a unique slug
    const baseSlug = toKebabCase(orgName) || "org";
    const slug = `${baseSlug}-${randomSuffix()}`;

    const orgId = randomUUID();
    await db.insert(organizationTable).values({
      id: orgId,
      name: orgName,
      slug,
    });

    await db.insert(memberTable).values({
      id: randomUUID(),
      organizationId: orgId,
      userId: u.id,
      role: "owner",
    });

    console.log(`  User ${u.email}: created org "${orgName}" (${orgId}).`);
  }

  // 2. Backfill sent_emails rows that have NULL organizationId.
  const emailsWithoutOrg = await db
    .select({ id: sentEmails.id, userId: sentEmails.userId })
    .from(sentEmails)
    .where(isNull(sentEmails.organizationId));

  console.log(`\nFound ${emailsWithoutOrg.length} sent_email row(s) with NULL organizationId.`);

  for (const email of emailsWithoutOrg) {
    const [membership] = await db
      .select({ organizationId: memberTable.organizationId })
      .from(memberTable)
      .where(eq(memberTable.userId, email.userId))
      .limit(1);

    if (!membership) {
      console.warn(`  Email ${email.id}: no membership found for user ${email.userId}, skipping.`);
      continue;
    }

    await db
      .update(sentEmails)
      .set({ organizationId: membership.organizationId })
      .where(eq(sentEmails.id, email.id));
  }

  console.log("  sent_emails backfill complete.");

  // 3. Backfill session.activeOrganizationId for all sessions that have it null.
  const sessionsWithoutOrg = await db
    .select({ id: sessionTable.id, userId: sessionTable.userId })
    .from(sessionTable)
    .where(isNull(sessionTable.activeOrganizationId));

  console.log(`\nFound ${sessionsWithoutOrg.length} session(s) with NULL activeOrganizationId.`);

  for (const sess of sessionsWithoutOrg) {
    const [membership] = await db
      .select({ organizationId: memberTable.organizationId })
      .from(memberTable)
      .where(eq(memberTable.userId, sess.userId))
      .limit(1);

    if (!membership) {
      console.warn(`  Session ${sess.id}: no membership found for user ${sess.userId}, skipping.`);
      continue;
    }

    await db
      .update(sessionTable)
      .set({ activeOrganizationId: membership.organizationId })
      .where(eq(sessionTable.id, sess.id));
  }

  console.log("  session backfill complete.");

  // 4. Verification: ensure zero NULL organizationId rows remain in sent_emails.
  const remaining = await db
    .select({ id: sentEmails.id })
    .from(sentEmails)
    .where(isNull(sentEmails.organizationId));

  if (remaining.length > 0) {
    console.error(
      `\nWARNING: ${remaining.length} sent_email row(s) still have NULL organizationId. ` +
        "These belong to users with no membership — please investigate."
    );
    process.exit(1);
  }

  console.log("\nVerification passed: zero NULL organizationId rows in sent_emails.");
  console.log("Migration complete.");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
