"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { LogOut, Trash2 } from "lucide-react";
import { SettingsCard } from "@/components/settings-card";
import { DangerZoneRow } from "@/components/danger-zone-row";
import { FormField } from "@/components/form-field";

interface DangerZoneCardProps {
  orgName: string;
  isLastOwner: boolean;
  isOwner: boolean;
  leaveOpen: boolean;
  onLeaveOpenChange: (open: boolean) => void;
  onLeave: () => void;
  leaving: boolean;
  deleteOpen: boolean;
  onDeleteOpenChange: (open: boolean) => void;
  deleteConfirm: string;
  onDeleteConfirmChange: (value: string) => void;
  onDelete: () => void;
  deleting: boolean;
}

export function DangerZoneCard({
  orgName,
  isLastOwner,
  isOwner,
  leaveOpen,
  onLeaveOpenChange,
  onLeave,
  leaving,
  deleteOpen,
  onDeleteOpenChange,
  deleteConfirm,
  onDeleteConfirmChange,
  onDelete,
  deleting,
}: DangerZoneCardProps) {
  return (
    <SettingsCard
      title="Danger Zone"
      description="Irreversible actions. Proceed with caution."
      className="border-destructive"
      contentClassName="space-y-4"
    >
      {!isLastOwner && (
        <DangerZoneRow
          title="Leave organization"
          description="Remove yourself from this organization. You will lose access immediately."
          action={
            <Dialog open={leaveOpen} onOpenChange={onLeaveOpenChange}>
              <DialogTrigger render={<Button variant="outline" />}>
                <LogOut className="mr-2 h-4 w-4" />
                Leave
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Leave organization?</DialogTitle>
                  <DialogDescription>
                    You will be removed from <strong>{orgName}</strong> and lose
                    access immediately.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => onLeaveOpenChange(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={onLeave}
                    disabled={leaving}
                  >
                    {leaving ? "Leaving…" : "Leave organization"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          }
        />
      )}

      {isOwner && (
        <DangerZoneRow
          title="Delete organization"
          description="Permanently delete this organization and all its data. This cannot be undone."
          destructive={true}
          action={
            <Dialog open={deleteOpen} onOpenChange={onDeleteOpenChange}>
              <DialogTrigger render={<Button variant="destructive" />}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete organization?</DialogTitle>
                  <DialogDescription>
                    This will permanently delete <strong>{orgName}</strong> and
                    all associated data. To confirm, type the organization name
                    below.
                  </DialogDescription>
                </DialogHeader>
                <FormField
                  id="delete-confirm"
                  label={`Type ${orgName} to confirm`}
                  value={deleteConfirm}
                  onChange={onDeleteConfirmChange}
                  placeholder={orgName}
                />
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => onDeleteOpenChange(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={onDelete}
                    disabled={deleting || deleteConfirm !== orgName}
                  >
                    {deleting ? "Deleting…" : "Delete organization"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          }
        />
      )}
    </SettingsCard>
  );
}
