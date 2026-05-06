"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { organization, useSession } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Building2, Trash2, LogOut } from "lucide-react";
import { toast } from "sonner";

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
  const [newOrgName, setNewOrgName] = useState("");
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  // Set default org name from session when we know there's no org
  useEffect(() => {
    if (!loading && !org && sessionData?.user?.name) {
      setNewOrgName(`${sessionData.user.name}'s Organization`);
    }
  }, [loading, org, sessionData?.user?.name]);

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
        <div className="flex items-center gap-3">
          <Building2 className="h-6 w-6" />
          <h1 className="text-2xl font-bold tracking-tight">Organization Settings</h1>
        </div>
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="space-y-6 max-w-2xl">
        <div className="flex items-center gap-3">
          <Building2 className="h-6 w-6" />
          <h1 className="text-2xl font-bold tracking-tight">Organization</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Create an organization</CardTitle>
            <CardDescription>
              Create an organization to start sending emails and collaborating with your team.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-org-name">Organization name</Label>
              <Input
                id="new-org-name"
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                placeholder="My Organization"
              />
            </div>
            <Button onClick={handleCreate} disabled={creating || !newOrgName.trim()}>
              {creating ? "Creating…" : "Create organization"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Building2 className="h-6 w-6" />
        <h1 className="text-2xl font-bold tracking-tight">Organization Settings</h1>
      </div>

      {/* Rename section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">General</CardTitle>
          <CardDescription>Update your organization&apos;s display name.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="org-name">Organization name</Label>
            <Input
              id="org-name"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="My Organization"
              disabled={!isOwner}
            />
          </div>
          <Button onClick={handleSave} disabled={saving || !orgName.trim() || !isOwner}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-base text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            Irreversible actions. Proceed with caution.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Leave organization */}
          {!isLastOwner && (
            <div className="flex items-center justify-between rounded-md border p-4">
              <div>
                <p className="text-sm font-medium">Leave organization</p>
                <p className="text-sm text-muted-foreground">
                  Remove yourself from this organization. You will lose access immediately.
                </p>
              </div>
              <Dialog open={leaveOpen} onOpenChange={setLeaveOpen}>
                <DialogTrigger render={<Button variant="outline" className="shrink-0 ml-4" />}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Leave
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Leave organization?</DialogTitle>
                    <DialogDescription>
                      You will be removed from <strong>{org.name}</strong> and lose access
                      immediately. This cannot be undone.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setLeaveOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleLeave}
                      disabled={leaving}
                    >
                      {leaving ? "Leaving…" : "Leave organization"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}

          {/* Delete organization */}
          {isOwner && (
            <div className="flex items-center justify-between rounded-md border border-destructive/40 bg-destructive/5 p-4">
              <div>
                <p className="text-sm font-medium">Delete organization</p>
                <p className="text-sm text-muted-foreground">
                  Permanently delete this organization and all its data. This cannot be undone.
                </p>
              </div>
              <Dialog
                open={deleteOpen}
                onOpenChange={(open) => {
                  setDeleteOpen(open);
                  if (!open) setDeleteConfirm("");
                }}
              >
                <DialogTrigger render={<Button variant="destructive" className="shrink-0 ml-4" />}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Delete organization?</DialogTitle>
                    <DialogDescription>
                      This will permanently delete <strong>{org.name}</strong> and all associated
                      data. To confirm, type the organization name below.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-2">
                    <Label htmlFor="delete-confirm">
                      Type <strong>{org.name}</strong> to confirm
                    </Label>
                    <Input
                      id="delete-confirm"
                      value={deleteConfirm}
                      onChange={(e) => setDeleteConfirm(e.target.value)}
                      placeholder={org.name}
                    />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleDelete}
                      disabled={deleting || deleteConfirm !== org.name}
                    >
                      {deleting ? "Deleting…" : "Delete organization"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
