import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface EmailHtmlPreviewProps {
  htmlBody: string | null
}

export function EmailHtmlPreview({ htmlBody }: EmailHtmlPreviewProps) {
  if (!htmlBody) return null
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">HTML Preview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border bg-white">
          <iframe
            srcDoc={htmlBody}
            className="h-[600px] w-full border-0"
            sandbox="allow-same-origin"
            title="Email HTML preview"
          />
        </div>
      </CardContent>
    </Card>
  )
}
