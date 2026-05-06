import { os } from "@orpc/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { member as memberTable } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// Context shape after auth middleware
export interface AuthenticatedContext {
  session: NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;
  activeOrganizationId: string;
}

interface HeadersContext {
  headers: Headers;
}

// Auth middleware — validates session (cookie or API key)
export const authMiddleware = os
  .use(async ({ context, next }) => {
    const headers = (context as HeadersContext).headers;
    const session = await auth.api.getSession({ headers });

    if (!session?.user) {
      throw new Error("Unauthorized");
    }

    // Resolve the active organization ID
    let activeOrganizationId: string | null =
      session.session.activeOrganizationId ?? null;

    if (!activeOrganizationId) {
      // Fallback: look up the user's single membership
      const [membership] = await db
        .select({ organizationId: memberTable.organizationId })
        .from(memberTable)
        .where(eq(memberTable.userId, session.user.id))
        .limit(1);
      activeOrganizationId = membership?.organizationId ?? null;
    }

    if (!activeOrganizationId) {
      throw new Error("No organization membership found");
    }

    return next({
      context: { session, activeOrganizationId } as AuthenticatedContext,
    });
  });
