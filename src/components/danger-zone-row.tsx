import React from "react";
import { cn } from "@/lib/utils";

interface DangerZoneRowProps {
  title: string;
  description: string;
  action: React.ReactNode;
  destructive?: boolean;
}

export function DangerZoneRow({
  title,
  description,
  action,
  destructive,
}: DangerZoneRowProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-md border p-4",
        destructive && "border-destructive/40 bg-destructive/5"
      )}
    >
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="shrink-0 ml-4">{action}</div>
    </div>
  );
}
