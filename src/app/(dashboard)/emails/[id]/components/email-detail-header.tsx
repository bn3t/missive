import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

interface EmailDetailHeaderProps {
  subject: string
}

export function EmailDetailHeader({ subject }: EmailDetailHeaderProps) {
  return (
    <div className="flex items-center gap-3">
      <Link href="/emails">
        <Button variant="ghost" size="icon">
          <ArrowLeft className="h-4 w-4" />
        </Button>
      </Link>
      <h1 className="text-2xl font-bold tracking-tight truncate">{subject}</h1>
    </div>
  )
}
