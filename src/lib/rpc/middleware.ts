import { os } from "@orpc/server";
import { auth } from "@/lib/auth/server";

// Context shape after auth middleware
export interface AuthenticatedContext {
  session: NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;
}

interface HeadersContext {
  headers: Headers;
}

// Auth middleware — validates session (cookie or API key)
export const authMiddleware = os
  .use(async ({ context, next }) => {
    // The headers are injected by the route handler
    const headers = (context as HeadersContext).headers;
    const session = await auth.api.getSession({ headers });

    if (!session?.user) {
      throw new Error("Unauthorized");
    }

    return next({
      context: { session } as AuthenticatedContext,
    });
  });
