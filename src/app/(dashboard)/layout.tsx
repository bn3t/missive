import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { member, organization } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { DashboardHeader } from "@/components/dashboard-header";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session?.user) {
    redirect("/login");
  }

  // Resolve organization name for the header
  const [membership] = await db
    .select({ organizationId: member.organizationId })
    .from(member)
    .where(eq(member.userId, session.user.id))
    .limit(1);

  let orgName: string | undefined;
  if (membership) {
    const [org] = await db
      .select({ name: organization.name })
      .from(organization)
      .where(eq(organization.id, membership.organizationId))
      .limit(1);
    orgName = org?.name;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <DashboardHeader user={session.user} organizationName={orgName} />
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
