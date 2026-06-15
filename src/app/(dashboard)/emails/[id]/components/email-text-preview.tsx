import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface EmailTextPreviewProps {
  textBody: string | null
}

export function EmailTextPreview({ textBody }: EmailTextPreviewProps) {
  if (!textBody) return null
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Plain Text</CardTitle>
      </CardHeader>
      <CardContent>
        <pre className="whitespace-pre-wrap break-words rounded-md border bg-muted p-4 font-mono text-sm">
          {textBody}
        </pre>
      </CardContent>
    </Card>
  )
}
