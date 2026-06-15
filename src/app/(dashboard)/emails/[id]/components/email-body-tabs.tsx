"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface EmailBodyTabsProps {
  htmlBody: string | null
  textBody: string | null
}

export function EmailBodyTabs({ htmlBody, textBody }: EmailBodyTabsProps) {
  if (!htmlBody && !textBody) return null

  if (htmlBody && !textBody) {
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

  if (!htmlBody && textBody) {
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Preview</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="html" className="flex-col">
          <TabsList className="mb-4 w-fit">
            <TabsTrigger value="html">HTML</TabsTrigger>
            <TabsTrigger value="text">Plain Text</TabsTrigger>
          </TabsList>
          <TabsContent value="html">
            <div className="rounded-md border bg-white">
              <iframe
                srcDoc={htmlBody!}
                className="h-[600px] w-full border-0"
                sandbox="allow-same-origin"
                title="Email HTML preview"
              />
            </div>
          </TabsContent>
          <TabsContent value="text">
            <pre className="whitespace-pre-wrap break-words rounded-md border bg-muted p-4 font-mono text-sm">
              {textBody}
            </pre>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
