import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { sentEmails } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Paperclip } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EmailDetailPage({ params }: PageProps) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });
  if (!session?.user) redirect("/login");

  const { id } = await params;

  const [email] = await db
    .select()
    .from(sentEmails)
    .where(
      and(
        eq(sentEmails.id, id),
        eq(sentEmails.userId, session.user.id)
      )
    )
    .limit(1);

  if (!email) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/emails">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight truncate">
          {email.subject}
        </h1>
      </div>

      {/* Metadata card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 text-sm md:grid-cols-3">
            <div>
              <dt className="text-muted-foreground">Recipient</dt>
              <dd className="font-mono">{email.to}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Status</dt>
              <dd>
                <Badge variant={email.status === "sent" ? "default" : "destructive"}>
                  {email.status}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Sent at</dt>
              <dd>
                {new Date(email.sentAt).toLocaleString("en-US", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </dd>
            </div>
            {email.template && (
              <div>
                <dt className="text-muted-foreground">Template</dt>
                <dd>
                  <Badge variant="secondary">{email.template}</Badge>
                </dd>
              </div>
            )}
            {email.tenantId && (
              <div>
                <dt className="text-muted-foreground">Tenant</dt>
                <dd className="font-mono">{email.tenantId}</dd>
              </div>
            )}
            {email.messageId && (
              <div>
                <dt className="text-muted-foreground">Message ID</dt>
                <dd className="font-mono text-xs truncate">{email.messageId}</dd>
              </div>
            )}
            <div>
              <dt className="text-muted-foreground">Attachments</dt>
              <dd className="flex items-center gap-1">
                {email.hasAttachments ? (
                  <>
                    <Paperclip className="h-4 w-4" /> Yes
                  </>
                ) : (
                  "None"
                )}
              </dd>
            </div>
            {email.errorMessage && (
              <div className="col-span-full">
                <dt className="text-muted-foreground">Error</dt>
                <dd className="text-destructive">{email.errorMessage}</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      {/* HTML preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">HTML Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border bg-white">
            <iframe
              srcDoc={email.htmlBody}
              className="h-[600px] w-full border-0"
              sandbox="allow-same-origin"
              title="Email HTML preview"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
