import { os } from "@orpc/server";
import { auth } from "@/lib/auth/server";
import type { headers } from "next/headers";

// Context shape after auth middleware
export interface AuthenticatedContext {
  session: NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;
}

// Auth middleware — validates session (cookie or API key)
export const authMiddleware = os
  .use(async ({ context, next }) => {
    // The headers are injected by the route handler
    const headers = (context as any).headers as Headers;
    const session = await auth.api.getSession({ headers });

    if (!session?.user) {
      throw new Error("Unauthorized");
    }

    return next({
      context: { session } as AuthenticatedContext,
    });
  });
