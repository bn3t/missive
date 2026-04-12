"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Paperclip, Search, ChevronLeft, ChevronRight, Calendar } from "lucide-react";

type EmailRow = {
  id: string;
  to: string;
  subject: string;
  template: string | null;
  status: string;
  tenantId: string | null;
  hasAttachments: boolean;
  sentAt: Date;
};

interface EmailListClientProps {
  emails: EmailRow[];
  page: number;
  totalPages: number;
  search: string;
  status: string;
  dateFrom: string;
  dateTo: string;
}

export function EmailListClient({
  emails,
  page,
  totalPages,
  search: initialSearch,
  status: initialStatus,
  dateFrom: initialDateFrom,
  dateTo: initialDateTo,
}: EmailListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateFilters(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page"); // Reset page on filter change
    router.push(`/emails?${params.toString()}`);
  }

  return (
    <div className="space-y-4">
      {/* Filters - Resend-inspired */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
        {/* Search */}
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by recipient or subject…"
            defaultValue={initialSearch}
            className="pl-10 h-10"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                updateFilters("search", (e.target as HTMLInputElement).value);
              }
            }}
            onBlur={(e) => {
              updateFilters("search", e.target.value);
            }}
          />
        </div>

        {/* Status filters */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant={initialStatus === "" ? "default" : "outline"}
            size="sm"
            onClick={() => updateFilters("status", "")}
          >
            All
          </Button>
          <Button
            variant={initialStatus === "sent" ? "default" : "outline"}
            size="sm"
            onClick={() => updateFilters("status", "sent")}
          >
            Sent
          </Button>
          <Button
            variant={initialStatus === "failed" ? "default" : "outline"}
            size="sm"
            onClick={() => updateFilters("status", "failed")}
          >
            Failed
          </Button>
        </div>

        {/* Date range */}
        <div className="flex items-center gap-3 shrink-0">
          <div>
            <div className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              FROM
            </div>
            <Input
              type="date"
              defaultValue={initialDateFrom}
              onChange={(e) => updateFilters("dateFrom", e.target.value)}
              className="h-10 w-[140px]"
            />
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              TO
            </div>
            <Input
              type="date"
              defaultValue={initialDateTo}
              onChange={(e) => updateFilters("dateTo", e.target.value)}
              className="h-10 w-[140px]"
            />
          </div>
        </div>

        {/* Clear filters */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            router.push("/emails");
          }}
          className="h-10 shrink-0"
        >
          Clear filters
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">Date</TableHead>
              <TableHead>Recipient</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Template</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[40px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {emails.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No emails found.
                </TableCell>
              </TableRow>
            ) : (
              emails.map((email) => (
                <TableRow key={email.id}>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(email.sentAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {email.to}
                  </TableCell>
                  <TableCell className="max-w-[300px] truncate">
                    <Link
                      href={`/emails/${email.id}`}
                      className="hover:underline"
                    >
                      {email.subject}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {email.template ? (
                      <Badge variant="secondary">{email.template}</Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        email.status === "sent" ? "default" : "destructive"
                      }
                    >
                      {email.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {email.hasAttachments && (
                      <Paperclip className="h-4 w-4 text-muted-foreground" />
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.set("page", String(page - 1));
                router.push(`/emails?${params.toString()}`);
              }}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.set("page", String(page + 1));
                router.push(`/emails?${params.toString()}`);
              }}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
