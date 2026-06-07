import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface EmailMetadataCardProps {
  sentByLabel: string
  fromAddress: string
  to: string
  status: string
  sentAt: Date
  template?: string | null
  tenantId?: string | null
  messageId?: string | null
  transport?: string | null
  errorMessage?: string | null
}

export function EmailMetadataCard({
  sentByLabel,
  fromAddress,
  to,
  status,
  sentAt,
  template,
  tenantId,
  messageId,
  transport,
  errorMessage,
}: EmailMetadataCardProps) {
  return (
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
            <dt className="text-muted-foreground">From</dt>
            <dd className="font-mono">{fromAddress}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Recipient</dt>
            <dd className="font-mono">{to}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Status</dt>
            <dd>
              <Badge variant={status === "sent" ? "default" : "destructive"}>
                {status}
              </Badge>
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Sent at</dt>
            <dd>
              {new Date(sentAt).toLocaleString("en-US", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </dd>
          </div>
          {template && (
            <div>
              <dt className="text-muted-foreground">Template</dt>
              <dd>
                <Badge variant="secondary">{template}</Badge>
              </dd>
            </div>
          )}
          {tenantId && (
            <div>
              <dt className="text-muted-foreground">Tenant</dt>
              <dd className="font-mono">{tenantId}</dd>
            </div>
          )}
          {messageId && (
            <div>
              <dt className="text-muted-foreground">Message ID</dt>
              <dd className="font-mono text-xs truncate">{messageId}</dd>
            </div>
          )}
          {transport && (
            <div>
              <dt className="text-muted-foreground">Transport</dt>
              <dd>
                <Badge variant="secondary" className="uppercase">{transport}</Badge>
              </dd>
            </div>
          )}
          {errorMessage && (
            <div className="col-span-full">
              <dt className="text-muted-foreground">Error</dt>
              <dd className="text-destructive">{errorMessage}</dd>
            </div>
          )}
        </dl>
      </CardContent>
    </Card>
  )
}
