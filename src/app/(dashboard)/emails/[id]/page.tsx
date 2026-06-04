import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { sentEmails, emailAttachments, member as memberTable, user } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { resolveActiveOrganizationId } from "@/lib/db/organization";
import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Paperclip } from "lucide-react";
import { formatBytes } from "@/lib/utils";
import { PdfPreviewDialog } from "@/components/pdf-preview-dialog";

interface PageProps {
  params: Promise<{ id: string }>;
}

// fallow-ignore-next-line code-duplication
export default async function EmailDetailPage({ params }: PageProps) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });
  if (!session?.user) redirect("/login");

  const activeOrganizationId = await resolveActiveOrganizationId(session);
  if (!activeOrganizationId) notFound();

  const { id } = await params;

  const [email] = await db
    .select()
    .from(sentEmails)
    .where(
      and(
        eq(sentEmails.id, id),
        eq(sentEmails.organizationId, activeOrganizationId)
      )
    )
    .limit(1);

  if (!email) notFound();

  const attachments = email.hasAttachments
    ? await db
        .select({
          id: emailAttachments.id,
          filename: emailAttachments.filename,
          contentType: emailAttachments.contentType,
          size: emailAttachments.size,
        })
        .from(emailAttachments)
        .where(eq(emailAttachments.emailId, email.id))
    : [];

  // Look up the sender
  const [sender] = await db
    .select({ name: user.name, email: user.email })
    .from(user)
    .where(eq(user.id, email.userId))
    .limit(1);

  // Check if sender is still a member of this org
  const [senderMembership] = await db
    .select({ id: memberTable.id })
    .from(memberTable)
    .where(
      and(
        eq(memberTable.userId, email.userId),
        eq(memberTable.organizationId, activeOrganizationId)
      )
    )
    .limit(1);

  const sentByLabel =
    senderMembership && sender
      ? `${sender.name} <${sender.email}>`
      : "Removed user";

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
              <dt className="text-muted-foreground">Sent by</dt>
              <dd>{sentByLabel}</dd>
            </div>
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
            {email.transport && (
              <div>
                <dt className="text-muted-foreground">Transport</dt>
                <dd>
                  <Badge variant="secondary" className="uppercase">{email.transport}</Badge>
                </dd>
              </div>
            )}
            {email.errorMessage && (
              <div className="col-span-full">
                <dt className="text-muted-foreground">Error</dt>
                <dd className="text-destructive">{email.errorMessage}</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      {/* Attachments card */}
      {attachments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Attachments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {attachments.map((att) => (
              <div key={att.id} className="flex items-center gap-3">
                <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="font-mono text-sm">{att.filename}</span>
                <Badge variant="secondary" className="text-xs">{att.contentType}</Badge>
                <span className="text-sm text-muted-foreground">{formatBytes(att.size)}</span>
                <div className="ml-auto flex items-center gap-2">
                  {att.contentType === "application/pdf" && (
                    <PdfPreviewDialog
                      src={`/api/emails/${email.id}/attachments/${att.id}`}
                      filename={att.filename}
                    />
                  )}
                  <Link
                    href={`/api/emails/${email.id}/attachments/${att.id}?download=1`}
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                  >
                    Download
                  </Link>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

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
