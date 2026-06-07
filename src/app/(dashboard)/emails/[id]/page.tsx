import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { sentEmails, emailAttachments, member as memberTable, user } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { resolveActiveOrganizationId } from "@/lib/db/organization";
import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { EmailDetailHeader } from "./components/email-detail-header";
import { EmailMetadataCard } from "./components/email-metadata-card";
import { EmailAttachmentsCard } from "./components/email-attachments-card";
import { EmailHtmlPreview } from "./components/email-html-preview";

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
      <EmailDetailHeader subject={email.subject} />
      <EmailMetadataCard
        sentByLabel={sentByLabel}
        fromAddress={email.fromAddress ?? env.EMAIL_FROM}
        to={email.to}
        status={email.status}
        sentAt={email.sentAt}
        template={email.template}
        tenantId={email.tenantId}
        messageId={email.messageId}
        transport={email.transport}
        errorMessage={email.errorMessage}
      />
      {attachments.length > 0 && (
        <EmailAttachmentsCard emailId={email.id} attachments={attachments} />
      )}
      <EmailHtmlPreview htmlBody={email.htmlBody} />
    </div>
  );
}
