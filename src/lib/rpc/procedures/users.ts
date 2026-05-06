import { z } from "zod";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { authMiddleware } from "../middleware";

export const findUserByEmail = authMiddleware
  .input(z.object({ email: z.string().email() }))
  .output(
    z.object({ id: z.string(), email: z.string(), name: z.string() }).nullable()
  )
  .handler(async ({ input }) => {
    const [found] = await db
      .select({ id: user.id, email: user.email, name: user.name })
      .from(user)
      .where(eq(user.email, input.email))
      .limit(1);
    return found ?? null;
  });
