import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { sentEmails } from "@/lib/db/schema";
import { desc, eq, and, like, gte, lte, count, or, sql } from "drizzle-orm";
import { resolveActiveOrganizationId } from "@/lib/db/organization";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { EmailListClient } from "@/components/email-list-client";
import { EmailStats } from "@/components/email-stats";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";

interface PageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    status?: string;
    template?: string;
    tenantId?: string;
    dateFrom?: string;
    dateTo?: string;
  }>;
}

// fallow-ignore-next-line code-duplication
export default async function EmailsPage({ searchParams }: PageProps) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });
  if (!session?.user) redirect("/login");

  const activeOrganizationId = await resolveActiveOrganizationId(session);
  if (!activeOrganizationId) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Email Logs</h1>
          <p className="text-muted-foreground mt-1">Monitor and track your transactional email activity</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>No organization</CardTitle>
            <CardDescription>You need to be part of an organization to view and send emails.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/settings/organization/general" className={buttonVariants({ variant: "default" })}>
              Create an organization
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const pageSize = 25;

  // Overall stats (independent of current filters)
  const statsResult = await db
    .select({
      total: count(),
      sent: sql<number>`count(case when ${sentEmails.status} = 'sent' then 1 end)`,
      failed: sql<number>`count(case when ${sentEmails.status} = 'failed' then 1 end)`,
    })
    .from(sentEmails)
    .where(eq(sentEmails.organizationId, activeOrganizationId));

  const stats = statsResult[0] || { total: 0, sent: 0, failed: 0 };
  const successRate = stats.total > 0 ? Math.round((stats.sent / stats.total) * 100) : 0;

  // Build query conditions for paginated list
  const conditions = [eq(sentEmails.organizationId, activeOrganizationId)];
  if (params.search) {
    conditions.push(
      or(
        like(sentEmails.to, `%${params.search}%`),
        like(sentEmails.subject, `%${params.search}%`)
      )!
    );
  }
  if (params.tenantId) conditions.push(eq(sentEmails.tenantId, params.tenantId));
  if (params.status === "sent" || params.status === "failed")
    conditions.push(eq(sentEmails.status, params.status));
  if (params.template) conditions.push(eq(sentEmails.template, params.template));
  if (params.dateFrom) conditions.push(gte(sentEmails.sentAt, new Date(params.dateFrom)));
  if (params.dateTo) conditions.push(lte(sentEmails.sentAt, new Date(params.dateTo)));

  const where = and(...conditions);

  const [emails, countResult] = await Promise.all([
    db
      .select()
      .from(sentEmails)
      .where(where)
      .orderBy(desc(sentEmails.sentAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ total: count() }).from(sentEmails).where(where),
  ]);

  const total = countResult[0]?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Email Logs</h1>
        <p className="text-muted-foreground mt-1">Monitor and track your transactional email activity</p>
      </div>

      <EmailStats
        total={stats.total}
        sent={stats.sent}
        failed={stats.failed}
        successRate={successRate}
      />

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <EmailListClient
          emails={emails}
          page={page}
          totalPages={totalPages}
          search={params.search ?? ""}
          status={params.status ?? "all"}
          template={params.template ?? "all"}
          dateFrom={params.dateFrom ?? ""}
          dateTo={params.dateTo ?? ""}
        />
      </div>
    </div>
  );
}


