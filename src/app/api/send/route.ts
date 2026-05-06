import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { member as memberTable } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { sendEmail, TransportNotConfiguredError } from "@/lib/email/sender";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const sendEmailSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  html: z.string().min(1),
  transport: z.enum(["ses", "smtp"]),
  template: z.string().optional(),
  tenantId: z.string().optional(),
  attachments: z
    .array(
      z.object({
        filename: z.string(),
        content: z.string(),
        contentType: z.string(),
      })
    )
    .optional(),
});

export async function POST(request: NextRequest) {
  // Authenticate via Better Auth — supports both session cookie and API key
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Resolve organization ID: prefer session field, fallback to member lookup
  let activeOrganizationId: string | null =
    session.session.activeOrganizationId ?? null;

  if (!activeOrganizationId) {
    const [membership] = await db
      .select({ organizationId: memberTable.organizationId })
      .from(memberTable)
      .where(eq(memberTable.userId, session.user.id))
      .limit(1);
    activeOrganizationId = membership?.organizationId ?? null;
  }

  if (!activeOrganizationId) {
    return NextResponse.json(
      { error: "You must belong to an organization to send emails" },
      { status: 403 }
    );
  }

  // Parse and validate request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = sendEmailSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  try {
    const result = await sendEmail({
      ...parsed.data,
      userId: session.user.id,
      organizationId: activeOrganizationId,
    });

    const status = result.status === "sent" ? 200 : 502;
    return NextResponse.json(result, { status });
  } catch (error) {
    if (error instanceof TransportNotConfiguredError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
