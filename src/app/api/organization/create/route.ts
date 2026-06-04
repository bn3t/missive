import { db } from "@/lib/db";
import { organization as organizationTable, member as memberTable, session as sessionTable, sentEmails } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, getCallerMembership } from "@/lib/auth/require-org-member";

const createOrgSchema = z.object({
  name: z.string().min(1).max(100),
});

export async function POST(request: NextRequest) {
  const authed = await requireSession(request.headers);
  if ("response" in authed) return authed.response;
  const { session } = authed;

  const existing = await getCallerMembership(session.user.id);
  if (existing) {
    return NextResponse.json({ error: "You already belong to an organization" }, { status: 409 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createOrgSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { name } = parsed.data;

  // Generate slug from name
  const baseSlug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-") || "org";
  const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 8)}`;

  const orgId = randomUUID();
  const memberId = randomUUID();

  await db.insert(organizationTable).values({
    id: orgId,
    name,
    slug,
  });

  await db.insert(memberTable).values({
    id: memberId,
    organizationId: orgId,
    userId: session.user.id,
    role: "owner",
  });

  // Set active organization on the current session
  await db
    .update(sessionTable)
    .set({ activeOrganizationId: orgId })
    .where(eq(sessionTable.id, session.session.id));

  // Claim orphaned emails sent by this user before they had an org
  await db
    .update(sentEmails)
    .set({ organizationId: orgId })
    .where(
      and(
        eq(sentEmails.userId, session.user.id),
        isNull(sentEmails.organizationId)
      )
    );

  return NextResponse.json({
    id: orgId,
    name,
    slug,
  });
}
