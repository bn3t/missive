import { db } from "@/lib/db";
import { member as memberTable } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

type SessionLike = {
  session: { activeOrganizationId?: string | null };
  user: { id: string };
};

export async function resolveActiveOrganizationId(session: SessionLike): Promise<string | null> {
  let activeOrganizationId: string | null = session.session.activeOrganizationId ?? null;
  if (!activeOrganizationId) {
    const [membership] = await db
      .select({ organizationId: memberTable.organizationId })
      .from(memberTable)
      .where(eq(memberTable.userId, session.user.id))
      .limit(1);
    activeOrganizationId = membership?.organizationId ?? null;
  }
  return activeOrganizationId;
}
