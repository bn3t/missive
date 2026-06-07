"use client";

import { Button } from "@/components/ui/button";
import { SettingsCard } from "@/components/settings-card";
import { FormField } from "@/components/form-field";

interface RenameOrgCardProps {
  orgName: string;
  onOrgNameChange: (name: string) => void;
  onSave: () => void;
  saving: boolean;
  isOwner: boolean;
}

export function RenameOrgCard({
  orgName,
  onOrgNameChange,
  onSave,
  saving,
  isOwner,
}: RenameOrgCardProps) {
  return (
    <SettingsCard
      title="General"
      description="Update your organization's display name."
      contentClassName="space-y-4"
    >
      <FormField
        id="org-name"
        label="Organization name"
        value={orgName}
        onChange={onOrgNameChange}
        placeholder="My Organization"
        disabled={!isOwner}
      />
      <Button
        onClick={onSave}
        disabled={saving || !orgName.trim() || !isOwner}
      >
        {saving ? "Saving…" : "Save"}
      </Button>
    </SettingsCard>
  );
}
