import { os } from "@orpc/server";
import { auth } from "@/lib/auth/server";
import { resolveActiveOrganizationId } from "@/lib/db/organization";

// Context shape after auth middleware
interface AuthenticatedContext {
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

    const activeOrganizationId = await resolveActiveOrganizationId(session);
    if (!activeOrganizationId) {
      throw new Error("No organization membership found");
    }

    return next({
      context: { session, activeOrganizationId } as AuthenticatedContext,
    });
  });
