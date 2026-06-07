"use client";

import { useCallback, useEffect, useState } from "react";
import { organization, useSession } from "@/lib/auth/client";
import { Users } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { toast } from "sonner";
import { MembersTable, OrgMember, OrgData } from "./components/members-table";
import { AddMemberDialog } from "./components/add-member-dialog";
import { RemoveMemberDialog } from "./components/remove-member-dialog";

export default function OrganizationMembersPage() {
  const { data: sessionData } = useSession();

  const [org, setOrg] = useState<OrgData | null>(null);
  const [loading, setLoading] = useState(true);

  // Add member dialog state
  const [addOpen, setAddOpen] = useState(false);
  const [addEmail, setAddEmail] = useState("");
  const [addRole, setAddRole] = useState<"member" | "admin" | "owner">("member");
  const [adding, setAdding] = useState(false);

  // Remove dialog state
  const [removeTarget, setRemoveTarget] = useState<OrgMember | null>(null);
  const [removing, setRemoving] = useState(false);

  const [updatingRole, setUpdatingRole] = useState<string | null>(null);

  const loadOrg = useCallback(async () => {
    const { data, error } = await organization.getFullOrganization();
    if (error || !data) {
      toast.error("Failed to load organization members");
      setLoading(false);
      return;
    }
    setOrg(data as OrgData);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadOrg();
  }, [loadOrg]);

  const currentUserId = sessionData?.user?.id;
  const currentMember = org?.members.find((m) => m.userId === currentUserId);
  const isOwner = currentMember?.role === "owner";
  const isAdmin = currentMember?.role === "admin" || isOwner;
  const owners = org?.members.filter((m) => m.role === "owner") ?? [];
  const isLastOwner = isOwner && owners.length === 1;

  async function handleAddMember() {
    if (!org || !addEmail.trim()) return;
    setAdding(true);

    try {
      const res = await fetch("/api/organization/add-member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: addEmail.trim(), role: addRole }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to add member");
        return;
      }

      toast.success(`Member added as ${addRole}`);
      setAddEmail("");
      setAddRole("member");
      setAddOpen(false);
      await loadOrg();
    } catch {
      toast.error("Failed to add member");
    } finally {
      setAdding(false);
    }
  }

  async function handleRoleChange(memberId: string, newRole: string) {
    if (!org) return;
    setUpdatingRole(memberId);
    const { error } = await organization.updateMemberRole({
      memberId,
      role: newRole,
      organizationId: org.id,
    });
    setUpdatingRole(null);
    if (error) {
      toast.error("Failed to update role");
    } else {
      toast.success("Role updated");
      await loadOrg();
    }
  }

  async function handleRemove() {
    if (!org || !removeTarget) return;
    setRemoving(true);
    const { error } = await organization.removeMember({
      memberIdOrEmail: removeTarget.id,
      organizationId: org.id,
    });
    setRemoving(false);
    if (error) {
      toast.error("Failed to remove member");
    } else {
      toast.success("Member removed");
      setRemoveTarget(null);
      await loadOrg();
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader icon={<Users className="h-6 w-6" />} title="Members" />
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="space-y-6">
        <PageHeader icon={<Users className="h-6 w-6" />} title="Members" />
        <p className="text-muted-foreground">No organization found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Users className="h-6 w-6" />}
        title="Members"
        action={isAdmin && (
          <AddMemberDialog
            open={addOpen}
            onOpenChange={(open) => {
              setAddOpen(open);
              if (!open) { setAddEmail(""); setAddRole("member"); }
            }}
            email={addEmail}
            onEmailChange={setAddEmail}
            role={addRole}
            onRoleChange={setAddRole}
            onSubmit={handleAddMember}
            adding={adding}
            isOwner={isOwner}
          />
        )}
      />
      <MembersTable
        members={org.members}
        currentUserId={currentUserId}
        isAdmin={isAdmin}
        isOwner={isOwner}
        isLastOwner={isLastOwner}
        updatingRole={updatingRole}
        onRoleChange={handleRoleChange}
        onRemove={setRemoveTarget}
      />
      <RemoveMemberDialog
        target={removeTarget ? { name: removeTarget.user.name } : null}
        onClose={() => setRemoveTarget(null)}
        onConfirm={handleRemove}
        removing={removing}
      />
    </div>
  );
}
