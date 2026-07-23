import { db } from "@/lib/db";
import { user, member as memberTable, sentEmails } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, getCallerMembership } from "@/lib/auth/require-org-member";

const addMemberSchema = z.object({
  email: z.email(),
  role: z.enum(["member", "admin", "owner"]).default("member"),
});

export async function POST(request: NextRequest) {
  const authed = await requireSession(request.headers);
  if ("response" in authed) return authed.response;
  const { session } = authed;

  const callerMember = await getCallerMembership(session.user.id);
  if (!callerMember) {
    return NextResponse.json({ error: "You are not part of an organization" }, { status: 403 });
  }

  if (callerMember.role !== "owner" && callerMember.role !== "admin") {
    return NextResponse.json({ error: "Only admins and owners can add members" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = addMemberSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { email, role } = parsed.data;

  // Look up the target user
  const [targetUser] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, email))
    .limit(1);

  if (!targetUser) {
    return NextResponse.json({ error: "No account found with that email" }, { status: 404 });
  }

  // Check if target already belongs to any org
  const [existingMembership] = await db
    .select({ organizationId: memberTable.organizationId })
    .from(memberTable)
    .where(eq(memberTable.userId, targetUser.id))
    .limit(1);

  if (existingMembership) {
    if (existingMembership.organizationId === callerMember.organizationId) {
      return NextResponse.json({ error: "User is already a member of this organization" }, { status: 409 });
    }
    return NextResponse.json({ error: "User already belongs to another organization" }, { status: 409 });
  }

  if (role === "owner" && callerMember.role !== "owner") {
    return NextResponse.json({ error: "Only owners can assign the owner role" }, { status: 403 });
  }

  const memberId = randomUUID();
  await db.insert(memberTable).values({
    id: memberId,
    organizationId: callerMember.organizationId,
    userId: targetUser.id,
    role,
  });

  // Claim orphaned emails sent by this user before they joined an org
  await db
    .update(sentEmails)
    .set({ organizationId: callerMember.organizationId })
    .where(
      and(
        eq(sentEmails.userId, targetUser.id),
        isNull(sentEmails.organizationId)
      )
    );

  return NextResponse.json({
    id: memberId,
    userId: targetUser.id,
    organizationId: callerMember.organizationId,
    role,
  });
}
