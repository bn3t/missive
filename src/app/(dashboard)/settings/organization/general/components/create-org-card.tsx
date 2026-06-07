"use client";

import { Button } from "@/components/ui/button";
import { SettingsCard } from "@/components/settings-card";
import { FormField } from "@/components/form-field";

interface CreateOrgCardProps {
  newOrgName: string;
  onOrgNameChange: (name: string) => void;
  onCreate: () => void;
  creating: boolean;
}

export function CreateOrgCard({
  newOrgName,
  onOrgNameChange,
  onCreate,
  creating,
}: CreateOrgCardProps) {
  return (
    <SettingsCard
      title="Create an organization"
      description="Create an organization to start sending emails and collaborating with your team."
      contentClassName="space-y-4"
    >
      <FormField
        id="new-org-name"
        label="Organization name"
        value={newOrgName}
        onChange={onOrgNameChange}
        placeholder="My Organization"
      />
      <Button onClick={onCreate} disabled={creating || !newOrgName.trim()}>
        {creating ? "Creating…" : "Create organization"}
      </Button>
    </SettingsCard>
  );
}
