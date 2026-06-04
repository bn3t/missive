"use client";

import { useEffect, useState } from "react";
import { organization, useSession } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
// fallow-ignore-next-line code-duplication
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

type MemberUser = {
  id: string;
  email: string;
  name: string;
  image: string | null;
};

type OrgMember = {
  id: string;
  organizationId: string;
  userId: string;
  role: string;
  createdAt: Date | string;
  user: MemberUser;
};

type OrgData = {
  id: string;
  name: string;
  members: OrgMember[];
};

const ROLE_OPTIONS = [
  { value: "member", label: "Member" },
  { value: "admin", label: "Admin" },
  { value: "owner", label: "Owner" },
];

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

  async function loadOrg() {
    const { data, error } = await organization.getFullOrganization();
    if (error || !data) {
      toast.error("Failed to load organization members");
      setLoading(false);
      return;
    }
    setOrg(data as OrgData);
    setLoading(false);
  }

  useEffect(() => {
     
    loadOrg();
  }, []);

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

  function canChangeRole(member: OrgMember): boolean {
    if (!isAdmin) return false;
    // Last owner's row role dropdown should be disabled
    if (member.role === "owner" && owners.length === 1 && member.userId === currentUserId) {
      return false;
    }
    // Only owners can promote to owner (handled in available options)
    return true;
  }

  function canRemove(member: OrgMember): boolean {
    if (!isAdmin) return false;
    // Cannot remove the last owner
    if (member.role === "owner" && owners.length === 1) return false;
    return true;
  }

  function getAvailableRoles() {
    if (isOwner) {
      return ROLE_OPTIONS;
    }
    // Admins can only assign member or admin
    return ROLE_OPTIONS.filter((r) => r.value !== "owner");
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6" />
          <h1 className="text-2xl font-bold tracking-tight">Members</h1>
        </div>
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6" />
          <h1 className="text-2xl font-bold tracking-tight">Members</h1>
        </div>
        <p className="text-muted-foreground">No organization found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6" />
          <h1 className="text-2xl font-bold tracking-tight">Members</h1>
        </div>

        {isAdmin && (
          <Dialog
            open={addOpen}
            onOpenChange={(open) => {
              setAddOpen(open);
              if (!open) {
                setAddEmail("");
                setAddRole("member");
              }
            }}
          >
            <DialogTrigger render={<Button />}>
              <Plus className="mr-2 h-4 w-4" />
              Add member
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add member</DialogTitle>
                <DialogDescription>
                  Enter the email address of an existing Missive user to add them to your
                  organization.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="member-email">Email address</Label>
                  <Input
                    id="member-email"
                    type="email"
                    placeholder="user@example.com"
                    value={addEmail}
                    onChange={(e) => setAddEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddMember();
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="member-role">Role</Label>
                  <Select
                    value={addRole}
                    onValueChange={(v) => setAddRole(v as typeof addRole)}
                  >
                    <SelectTrigger id="member-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      {isOwner && <SelectItem value="owner">Owner</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleAddMember}
                  disabled={adding || !addEmail.trim()}
                >
                  {adding ? "Adding…" : "Add member"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Organization members</CardTitle>
          <CardDescription>
            {org.members.length} member{org.members.length !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {org.members.map((m) => {
                const isCurrentUser = m.userId === currentUserId;
                const isLastOwnerRow = m.role === "owner" && owners.length === 1;
                const disableRole = !canChangeRole(m) || updatingRole === m.id;
                const disableRemove = !canRemove(m);

                return (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">
                      {m.user.name}
                      {isCurrentUser && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          You
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{m.user.email}</TableCell>
                    <TableCell>
                      {isAdmin && !isCurrentUser ? (
                        <div title={isLastOwnerRow ? "Promote another member to owner first" : undefined}>
                          <Select
                            value={m.role}
                            onValueChange={(v) => v && handleRoleChange(m.id, v)}
                            disabled={disableRole}
                          >
                            <SelectTrigger className="w-28 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {getAvailableRoles().map((r) => (
                                <SelectItem key={r.value} value={r.value}>
                                  {r.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ) : (
                        <Badge
                          variant={m.role === "owner" ? "default" : "secondary"}
                          className="capitalize"
                        >
                          {m.role}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(m.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {isAdmin && !isCurrentUser && (
                        <div
                          title={
                            disableRemove
                              ? "Promote another member to owner first"
                              : undefined
                          }
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={disableRemove}
                            onClick={() => setRemoveTarget(m)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      )}
                      {isLastOwner && isCurrentUser && (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Remove confirmation dialog */}
      <Dialog
        open={!!removeTarget}
        onOpenChange={(open) => {
          if (!open) setRemoveTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove member?</DialogTitle>
            <DialogDescription>
              {removeTarget && (
                <>
                  <strong>{removeTarget.user.name}</strong> will be removed from the
                  organization and lose access immediately.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRemove} disabled={removing}>
              {removing ? "Removing…" : "Remove member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
