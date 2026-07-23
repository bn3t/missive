import { sendEmail, TransportNotConfiguredError } from "@/lib/email/sender";
import { resolveActiveOrganizationId } from "@/lib/db/organization";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth/require-org-member";

const sendEmailSchema = z
  .object({
    to: z.email(),
    subject: z.string().min(1),
    html: z.string().min(1).optional(),
    text: z.string().min(1).optional(),
    transport: z.enum(["ses", "smtp"]),
    template: z.string().optional(),
    tenantId: z.string().optional(),
    from: z.string().trim().min(1).max(320).optional(),
    replyTo: z.string().trim().min(1).max(320).optional(),
    attachments: z
      .array(
        z.object({
          filename: z.string(),
          content: z.string(),
          contentType: z.string(),
        })
      )
      .optional(),
  })
  .refine((d) => d.html || d.text, {
    message: "At least one of 'html' or 'text' is required",
  });

export async function POST(request: NextRequest) {
  // Authenticate via Better Auth — supports both session cookie and API key
  const authed = await requireSession(request.headers);
  if ("response" in authed) return authed.response;
  const { session } = authed;

  const activeOrganizationId = await resolveActiveOrganizationId(session);
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
