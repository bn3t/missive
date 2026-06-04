import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { emailAttachments, sentEmails } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { resolveActiveOrganizationId } from "@/lib/db/organization";
import { NextRequest } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const activeOrganizationId = await resolveActiveOrganizationId(session);
  if (!activeOrganizationId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: emailId, attachmentId } = await params;

  const [attachment] = await db
    .select({ emailAttachments })
    .from(emailAttachments)
    .innerJoin(sentEmails, eq(emailAttachments.emailId, sentEmails.id))
    .where(
      and(
        eq(emailAttachments.id, attachmentId),
        eq(emailAttachments.emailId, emailId),
        eq(sentEmails.organizationId, activeOrganizationId)
      )
    )
    .limit(1)
    .then((rows) => rows.map((r) => r.emailAttachments));

  if (!attachment) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const isDownload =
    new URL(request.url).searchParams.get("download") === "1";

  const encodedFilename = encodeURIComponent(attachment.filename);
  const disposition = isDownload ? "attachment" : "inline";
  // RFC 5987: include both ASCII fallback and UTF-8 encoded form
  const contentDisposition = `${disposition}; filename="${attachment.filename.replace(/[^\x20-\x7e]/g, "_")}"; filename*=UTF-8''${encodedFilename}`;

  return new Response(new Uint8Array(attachment.content), {
    status: 200,
    headers: {
      "Content-Type": attachment.contentType,
      "Content-Length": String(attachment.size),
      "Content-Disposition": contentDisposition,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
