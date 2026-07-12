"use client";

import { useState, useEffect } from "react";
import { authClient } from "@/lib/auth/client";
import { KeyRound } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { toast } from "sonner";
import { CreateKeyDialog } from "./components/create-key-dialog";
import { ApiKeysTable } from "./components/api-keys-table";
import type { ApiKeyRow } from "./components/api-keys-table";

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
      setKeys(result.data.apiKeys as unknown as ApiKeyRow[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
      <PageHeader
        icon={<KeyRound className="h-6 w-6" />}
        title="API Keys"
        action={
          <CreateKeyDialog
            open={createOpen}
            onOpenChange={(open) => {
              setCreateOpen(open);
              if (!open) setNewlyCreatedKey(null);
            }}
            newKeyName={newKeyName}
            onNameChange={setNewKeyName}
            onSubmit={handleCreate}
            newlyCreatedKey={newlyCreatedKey}
            copied={copied}
            onCopy={copyKey}
          />
        }
      />
      <ApiKeysTable keys={keys} loading={loading} onDelete={handleDelete} />
    </div>
  );
}
