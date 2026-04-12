"use client";

import { useState, useEffect } from "react";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { KeyRound, Plus, Trash2, Copy, Check } from "lucide-react";
import { toast } from "sonner";

type ApiKeyRow = {
  id: string;
  name: string | null;
  start: string | null;
  prefix: string | null;
  enabled: boolean;
  expiresAt: Date | null;
  createdAt: Date;
  lastRequest: Date | null;
};

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function fetchKeys() {
    setLoading(true);
    const result = await authClient.apiKey.list();
    if (result.data) {
      setKeys(result.data as unknown as ApiKeyRow[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchKeys();
  }, []);

  async function handleCreate() {
    if (!newKeyName.trim()) return;
    const result = await authClient.apiKey.create({
      name: newKeyName.trim(),
    });
    if (result.data) {
      setNewlyCreatedKey(result.data.key);
      setNewKeyName("");
      await fetchKeys();
    }
  }

  async function handleDelete(keyId: string) {
    await authClient.apiKey.delete({ keyId });
    toast.success("API key revoked");
    await fetchKeys();
  }

  async function copyKey(key: string) {
    await navigator.clipboard.writeText(key);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <KeyRound className="h-6 w-6" />
          <h1 className="text-2xl font-bold tracking-tight">API Keys</h1>
        </div>

        <Dialog
          open={createOpen}
          onOpenChange={(open) => {
            setCreateOpen(open);
            if (!open) setNewlyCreatedKey(null);
          }}
        >
          <DialogTrigger>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Key
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create API Key</DialogTitle>
              <DialogDescription>
                Generate a new API key for sending transactional emails.
                The full key will only be shown once.
              </DialogDescription>
            </DialogHeader>

            {newlyCreatedKey ? (
              <div className="space-y-3">
                <div className="rounded-md border bg-muted p-3">
                  <code className="break-all text-sm">{newlyCreatedKey}</code>
                </div>
                <p className="text-sm text-destructive">
                  ⚠️ Copy this key now. You won&apos;t be able to see it again.
                </p>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => copyKey(newlyCreatedKey)}
                >
                  {copied ? (
                    <Check className="mr-2 h-4 w-4" />
                  ) : (
                    <Copy className="mr-2 h-4 w-4" />
                  )}
                  {copied ? "Copied!" : "Copy Key"}
                </Button>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="key-name">Name</Label>
                  <Input
                    id="key-name"
                    placeholder="e.g., production, staging"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreate();
                    }}
                  />
                </div>
                <DialogFooter>
                  <Button onClick={handleCreate} disabled={!newKeyName.trim()}>
                    Create
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your API Keys</CardTitle>
          <CardDescription>
            Use these keys to authenticate requests to <code className="text-xs">POST /api/send</code>.
            Pass them as <code className="text-xs">x-api-key</code> header or{" "}
            <code className="text-xs">Authorization: Bearer mk_…</code>.
          </CardDescription>
        </CardHeader>
        <CardContent>
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
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : keys.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
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
                        onClick={() => handleDelete(key.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
