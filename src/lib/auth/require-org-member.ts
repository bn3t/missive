import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { member as memberTable } from "@/lib/db/schema";
import { APIError } from "better-auth/api";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

type AuthedSession = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;

export async function requireSession(
  headers: Headers
): Promise<{ session: AuthedSession } | { response: NextResponse }> {
  let session: Awaited<ReturnType<typeof auth.api.getSession>>;
  try {
    session = await auth.api.getSession({ headers });
  } catch (error) {
    // The apiKey plugin throws (instead of returning null) on an invalid, disabled or expired key
    if (error instanceof APIError && (error.statusCode === 401 || error.statusCode === 403)) {
      return {
        response: NextResponse.json(
          { error: error.body?.message ?? "Unauthorized", code: error.body?.code },
          { status: error.statusCode }
        ),
      };
    }
    throw error;
  }
  if (!session?.user) {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { session };
}

export async function getCallerMembership(userId: string) {
  const [callerMember] = await db
    .select({ organizationId: memberTable.organizationId, role: memberTable.role })
    .from(memberTable)
    .where(eq(memberTable.userId, userId))
    .limit(1);
  return callerMember ?? null;
}
