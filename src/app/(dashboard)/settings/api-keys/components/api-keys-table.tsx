"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trash2 } from "lucide-react";
import { SettingsCard } from "@/components/settings-card";

export type ApiKeyRow = {
  id: string;
  name: string | null;
  start: string | null;
  prefix: string | null;
  enabled: boolean;
  expiresAt: Date | null;
  createdAt: Date;
  lastRequest: Date | null;
};

interface ApiKeysTableProps {
  keys: ApiKeyRow[];
  loading: boolean;
  onDelete: (keyId: string) => void;
}

export function ApiKeysTable({ keys, loading, onDelete }: ApiKeysTableProps) {
  return (
    <SettingsCard
      title="Your API Keys"
      description={
        <>
          Use these keys to authenticate requests to{" "}
          <code className="text-xs">POST /api/send</code>. Pass them as{" "}
          <code className="text-xs">x-api-key</code> header or{" "}
          <code className="text-xs">Authorization: Bearer mk_…</code>.
        </>
      }
      contentClassName="p-0"
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Key</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Last Used</TableHead>
            <TableHead className="w-[60px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell
                colSpan={6}
                className="h-24 text-center text-muted-foreground"
              >
                Loading…
              </TableCell>
            </TableRow>
          ) : keys.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={6}
                className="h-24 text-center text-muted-foreground"
              >
                No API keys yet. Create one to get started.
              </TableCell>
            </TableRow>
          ) : (
            keys.map((key) => (
              <TableRow key={key.id}>
                <TableCell className="font-medium">
                  {key.name ?? "Unnamed"}
                </TableCell>
                <TableCell>
                  <code className="text-xs text-muted-foreground">
                    {key.start ?? "••••"}
                  </code>
                </TableCell>
                <TableCell>
                  <Badge variant={key.enabled ? "default" : "secondary"}>
                    {key.enabled ? "Active" : "Disabled"}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(key.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {key.lastRequest
                    ? new Date(key.lastRequest).toLocaleDateString()
                    : "Never"}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(key.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </SettingsCard>
  );
}
