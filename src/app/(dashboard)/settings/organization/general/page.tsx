"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { organization, useSession } from "@/lib/auth/client";
import { Building2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { toast } from "sonner";
import { CreateOrgCard } from "./components/create-org-card";
import { RenameOrgCard } from "./components/rename-org-card";
import { DangerZoneCard } from "./components/danger-zone-card";

type OrgMember = {
  id: string;
  userId: string;
  role: string;
};

type OrgData = {
  id: string;
  name: string;
  slug: string;
  members: OrgMember[];
};


export default function OrganizationGeneralPage() {
  const router = useRouter();
  const { data: sessionData } = useSession();

  const [org, setOrg] = useState<OrgData | null>(null);
  const [loading, setLoading] = useState(true);
  const [orgName, setOrgName] = useState("");
  const [saving, setSaving] = useState(false);

  // Create form state
  const [newOrgName, setNewOrgName] = useState(() =>
    sessionData?.user?.name ? `${sessionData.user.name}'s Organization` : ""
  );
  const [creating, setCreating] = useState(false);

  // Delete dialog state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Leave dialog state
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    async function load() {
      const { data, error } = await organization.getFullOrganization();
      if (error || !data) {
        setLoading(false);
        return;
      }
      setOrg(data as OrgData);
      setOrgName(data.name);
      setLoading(false);
    }

    load();
  }, []);

  const currentUserId = sessionData?.user?.id;
  const owners = org?.members.filter((m) => m.role === "owner") ?? [];
  const currentMember = org?.members.find((m) => m.userId === currentUserId);
  const isOwner = currentMember?.role === "owner";
  const isLastOwner = isOwner && owners.length === 1;

  async function handleCreate() {
    if (!newOrgName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/organization/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: newOrgName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to create organization");
        return;
      }
      toast.success("Organization created");
      window.location.reload();
    } catch {
      toast.error("Failed to create organization");
    } finally {
      setCreating(false);
    }
  }

  async function handleSave() {
    if (!org || !orgName.trim()) return;
    setSaving(true);
    const { error } = await organization.update({
      organizationId: org.id,
      data: { name: orgName.trim() },
    });
    setSaving(false);
    if (error) {
      toast.error("Failed to update organization name");
    } else {
      toast.success("Organization name updated");
      setOrg((prev) => (prev ? { ...prev, name: orgName.trim() } : prev));
    }
  }

  async function handleLeave() {
    if (!org) return;
    setLeaving(true);
    const { error } = await organization.leave({
      organizationId: org.id,
    });
    setLeaving(false);
    if (error) {
      toast.error("Failed to leave organization");
    } else {
      toast.success("You have left the organization");
      router.push("/login");
    }
  }

  async function handleDelete() {
    if (!org || deleteConfirm !== org.name) return;
    setDeleting(true);
    const { error } = await organization.delete({
      organizationId: org.id,
    });
    setDeleting(false);
    if (error) {
      toast.error("Failed to delete organization");
    } else {
      toast.success("Organization deleted");
      router.push("/login");
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-2xl">
        <PageHeader icon={<Building2 className="h-6 w-6" />} title="Organization Settings" />
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="space-y-6 max-w-2xl">
        <PageHeader icon={<Building2 className="h-6 w-6" />} title="Organization" />
        <CreateOrgCard
          newOrgName={newOrgName}
          onOrgNameChange={setNewOrgName}
          onCreate={handleCreate}
          creating={creating}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader icon={<Building2 className="h-6 w-6" />} title="Organization Settings" />
      <RenameOrgCard
        orgName={orgName}
        onOrgNameChange={setOrgName}
        onSave={handleSave}
        saving={saving}
        isOwner={isOwner}
      />
      <DangerZoneCard
        orgName={org.name}
        isLastOwner={isLastOwner}
        isOwner={isOwner}
        leaveOpen={leaveOpen}
        onLeaveOpenChange={setLeaveOpen}
        onLeave={handleLeave}
        leaving={leaving}
        deleteOpen={deleteOpen}
        onDeleteOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) setDeleteConfirm("");
        }}
        deleteConfirm={deleteConfirm}
        onDeleteConfirmChange={setDeleteConfirm}
        onDelete={handleDelete}
        deleting={deleting}
      />
    </div>
  );
}
