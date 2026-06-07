import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Paperclip } from "lucide-react"
import { formatBytes } from "@/lib/utils"
import { PdfPreviewDialog } from "@/components/pdf-preview-dialog"

interface AttachmentRow {
  id: string
  filename: string
  contentType: string
  size: number
}

interface EmailAttachmentsCardProps {
  emailId: string
  attachments: AttachmentRow[]
}

export function EmailAttachmentsCard({ emailId, attachments }: EmailAttachmentsCardProps) {
  return (
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
                  src={`/api/emails/${emailId}/attachments/${att.id}`}
                  filename={att.filename}
                />
              )}
              <Link
                href={`/api/emails/${emailId}/attachments/${att.id}?download=1`}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Download
              </Link>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
