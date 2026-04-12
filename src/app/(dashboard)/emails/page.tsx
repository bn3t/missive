import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { sentEmails } from "@/lib/db/schema";
import { desc, eq, and, like, gte, lte, count, or } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { EmailListClient } from "@/components/email-list-client";
import { Mail } from "lucide-react";

interface PageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    status?: string;
    tenantId?: string;
    dateFrom?: string;
    dateTo?: string;
  }>;
}

export default async function EmailsPage({ searchParams }: PageProps) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });
  if (!session?.user) redirect("/login");

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const pageSize = 25;

  // Build query conditions
  const conditions = [eq(sentEmails.userId, session.user.id)];
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
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <Mail className="h-6 w-6" />
          <h1 className="text-2xl font-bold tracking-tight">Emails</h1>
          <span className="text-sm text-muted-foreground">
            {total} total sent
          </span>
        </div>
        <p className="text-muted-foreground">Transactional email log and delivery inspector. Clone of Resend activity view.</p>
      </div>

      <EmailListClient
        emails={emails}
        page={page}
        totalPages={totalPages}
        search={params.search ?? ""}
        status={params.status ?? ""}
        dateFrom={params.dateFrom ?? ""}
        dateTo={params.dateTo ?? ""}
      />
    </div>
  );
}
