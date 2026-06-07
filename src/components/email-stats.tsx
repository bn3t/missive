"use client"

import { Mail, CheckCircle, AlertTriangle, Clock } from "lucide-react"

interface EmailStatsProps {
  total: number
  sent: number
  failed: number
  successRate: number
}

export function EmailStats({ total, sent, failed, successRate }: EmailStatsProps) {
  const items = [
    {
      label: "Total Sent",
      value: total.toLocaleString(),
      icon: Mail,
      color: "text-foreground",
      bg: "bg-secondary",
    },
    {
      label: "Delivered",
      value: sent.toLocaleString(),
      icon: CheckCircle,
      color: "text-success",
      bg: "bg-success/10",
    },
    {
      label: "Failed",
      value: failed.toLocaleString(),
      icon: AlertTriangle,
      color: "text-destructive",
      bg: "bg-destructive/10",
    },
    {
      label: "Success Rate",
      value: `${successRate}%`,
      icon: Clock,
      color: "text-success",
      bg: "bg-success/10",
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex items-center gap-4 rounded-xl border border-border bg-card p-6"
        >
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${item.bg}`}>
            <item.icon className={`h-6 w-6 ${item.color}`} />
          </div>
          <div>
            <p className="text-4xl font-semibold tracking-tighter text-card-foreground">{item.value}</p>
            <p className="text-sm text-muted-foreground mt-0.5">{item.label}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
