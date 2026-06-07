"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FormField } from "@/components/form-field";
import { cn } from "@/lib/utils";
import { Plus, Copy, Check } from "lucide-react";

interface CreateKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  newKeyName: string;
  onNameChange: (name: string) => void;
  onSubmit: () => void;
  newlyCreatedKey: string | null;
  copied: boolean;
  onCopy: (key: string) => void;
}

export function CreateKeyDialog({
  open,
  onOpenChange,
  newKeyName,
  onNameChange,
  onSubmit,
  newlyCreatedKey,
  copied,
  onCopy,
}: CreateKeyDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger className={cn(buttonVariants())}>
        <Plus className="mr-2 h-4 w-4" />
        Create Key
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create API Key</DialogTitle>
          <DialogDescription>
            Generate a new API key for sending transactional emails. The full
            key will only be shown once.
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
              onClick={() => onCopy(newlyCreatedKey)}
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
            <FormField
              id="key-name"
              label="Name"
              placeholder="e.g., production, staging"
              value={newKeyName}
              onChange={onNameChange}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSubmit();
              }}
            />
            <DialogFooter>
              <Button onClick={onSubmit} disabled={!newKeyName.trim()}>
                Create
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
