"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { SettingsCard } from "@/components/settings-card";
import { Trash2 } from "lucide-react";

export type MemberUser = {
  id: string;
  email: string;
  name: string;
  image: string | null;
};

export type OrgMember = {
  id: string;
  organizationId: string;
  userId: string;
  role: string;
  createdAt: Date | string;
  user: MemberUser;
};

export type OrgData = {
  id: string;
  name: string;
  members: OrgMember[];
};

const ROLE_OPTIONS = [
  { value: "member", label: "Member" },
  { value: "admin", label: "Admin" },
  { value: "owner", label: "Owner" },
];

function canChangeRole(
  member: OrgMember,
  {
    isAdmin,
    owners,
    currentUserId,
  }: {
    isAdmin: boolean;
    owners: OrgMember[];
    currentUserId: string | undefined;
  }
): boolean {
  if (!isAdmin) return false;
  if (
    member.role === "owner" &&
    owners.length === 1 &&
    member.userId === currentUserId
  )
    return false;
  return true;
}

function canRemove(
  member: OrgMember,
  {
    isAdmin,
    owners,
  }: {
    isAdmin: boolean;
    owners: OrgMember[];
  }
): boolean {
  if (!isAdmin) return false;
  if (member.role === "owner" && owners.length === 1) return false;
  return true;
}

function getAvailableRoles(isOwner: boolean) {
  if (isOwner) return ROLE_OPTIONS;
  return ROLE_OPTIONS.filter((r) => r.value !== "owner");
}

interface MembersTableProps {
  members: OrgMember[];
  currentUserId: string | undefined;
  isAdmin: boolean;
  isOwner: boolean;
  isLastOwner: boolean;
  updatingRole: string | null;
  onRoleChange: (memberId: string, role: string) => void;
  onRemove: (member: OrgMember) => void;
}

export function MembersTable({
  members,
  currentUserId,
  isAdmin,
  isOwner: isOwnerProp,
  isLastOwner,
  updatingRole,
  onRoleChange,
  onRemove,
}: MembersTableProps) {
  const owners = members.filter((m) => m.role === "owner");
  const description = `${members.length} member${members.length !== 1 ? "s" : ""}`;

  return (
    <SettingsCard
      title="Organization members"
      description={description}
    >
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
          {members.map((m) => {
            const isCurrentUser = m.userId === currentUserId;
            const isLastOwnerRow = m.role === "owner" && owners.length === 1;
            const disableRole =
              !canChangeRole(m, { isAdmin, owners, currentUserId }) ||
              updatingRole === m.id;
            const disableRemove = !canRemove(m, { isAdmin, owners });

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
                <TableCell className="text-muted-foreground">
                  {m.user.email}
                </TableCell>
                <TableCell>
                  {isAdmin && !isCurrentUser ? (
                    <div
                      title={
                        isLastOwnerRow
                          ? "Promote another member to owner first"
                          : undefined
                      }
                    >
                      <Select
                        value={m.role}
                        onValueChange={(v) => v && onRoleChange(m.id, v)}
                        disabled={disableRole}
                      >
                        <SelectTrigger className="w-28 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {getAvailableRoles(isOwnerProp).map((r) => (
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
                        aria-label="Remove member"
                        disabled={disableRemove}
                        onClick={() => onRemove(m)}
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
    </SettingsCard>
  );
}
