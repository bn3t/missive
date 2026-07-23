"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { Search, Calendar as CalendarIcon, X, MoreHorizontal, ExternalLink, Copy, RotateCcw, Mail, Paperclip } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";

type EmailRow = {
  id: string;
  to: string;
  subject: string;
  template: string | null;
  transport: string | null;
  status: "pending" | "sent" | "failed";
  sentAt: Date;
  hasAttachments?: boolean;
  messageId?: string | null;
};

interface EmailListClientProps {
  emails: EmailRow[];
  page: number;
  totalPages: number;
  search: string;
  status: string;
  template?: string;
  dateFrom: string;
  dateTo: string;
}

function StatusBadge({ status }: { status: "pending" | "sent" | "failed" }) {
  if (status === "sent") {
    return (
      <Badge variant="outline" className="bg-success/10 text-success border-success/30 hover:bg-success/20">
        <span className="mr-1.5 h-2 w-2 rounded-full bg-success" />
        Delivered
      </Badge>
    );
  }
  if (status === "pending") {
    return (
      <Badge variant="outline" className="bg-muted/50 text-muted-foreground border-muted-foreground/30 hover:bg-muted">
        <span className="mr-1.5 h-2 w-2 rounded-full bg-muted-foreground" />
        Pending
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 hover:bg-destructive/20">
      <span className="mr-1.5 h-2 w-2 rounded-full bg-destructive" />
      Failed
    </Badge>
  );
}

interface EmailFiltersProps {
  initialSearch: string;
  initialStatus: string;
  initialDateFrom: string;
  initialDateTo: string;
}

function EmailFilters({
  initialSearch,
  initialStatus,
  initialDateFrom,
  initialDateTo,
}: EmailFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(initialSearch);
  const [status, setStatus] = useState<"all" | "sent" | "failed">(
    (initialStatus as "all" | "sent" | "failed") || "all"
  );
  const [dateRange, setDateRange] = useState<DateRange | undefined>(
    initialDateFrom || initialDateTo
      ? {
          from: initialDateFrom ? new Date(initialDateFrom) : undefined,
          to: initialDateTo ? new Date(initialDateTo) : undefined,
        }
      : undefined
  );

  // Sync with URL params when they change (for browser back/forward)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSearch(initialSearch);
    setStatus((initialStatus as "all" | "sent" | "failed") || "all");
    setDateRange(
      initialDateFrom || initialDateTo
        ? {
            from: initialDateFrom ? new Date(initialDateFrom) : undefined,
            to: initialDateTo ? new Date(initialDateTo) : undefined,
          }
        : undefined
    );
  }, [initialSearch, initialStatus, initialDateFrom, initialDateTo]);

  const updateFilters = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page"); // Reset to page 1
    router.push(`/emails?${params.toString()}`);
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    if (range?.from) {
      params.set("dateFrom", range.from.toISOString().split("T")[0]);
    } else {
      params.delete("dateFrom");
    }
    if (range?.to) {
      params.set("dateTo", range.to.toISOString().split("T")[0]);
    } else {
      params.delete("dateTo");
    }
    router.push(`/emails?${params.toString()}`);
  };

  const clearFilters = () => {
    setSearch("");
    setStatus("all");
    setDateRange(undefined);
    router.push("/emails");
  };

  const hasActiveFilters = search || status !== "all" || dateRange?.from;

  return (
    <div className="flex flex-wrap items-center gap-3 p-4 border-b border-border bg-card">
      {/* Search */}
      <div className="relative flex-1 min-w-[260px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by recipient or subject..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              updateFilters("search", search || null);
            }
          }}
          onBlur={() => updateFilters("search", search || null)}
          className="pl-9"
        />
      </div>

      {/* Date Range */}
      <Popover>
        <PopoverTrigger
          className={cn(
            buttonVariants({ variant: "outline" }),
            "justify-start text-left font-normal min-w-[220px]",
            !dateRange?.from && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
            {dateRange?.from ? (
              dateRange.to ? (
                <>
                  {dateRange.from.toLocaleDateString("en-US", { timeZone: "UTC" })} - {dateRange.to.toLocaleDateString("en-US", { timeZone: "UTC" })}
                </>
              ) : (
                dateRange.from.toLocaleDateString("en-US", { timeZone: "UTC" })
              )
            ) : (
              "Select dates"
            )}
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            selected={dateRange}
            onSelect={handleDateRangeChange}
            autoFocus
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>

      {/* Status Filter */}
      <Select
        value={status}
        onValueChange={(value) => {
          const v = (value || "all") as "all" | "sent" | "failed";
          setStatus(v);
          updateFilters("status", v === "all" ? null : v);
        }}
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="All Statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          <SelectItem value="sent">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-success" />
              Delivered
            </div>
          </SelectItem>
          <SelectItem value="failed">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-destructive" />
              Failed
            </div>
          </SelectItem>
        </SelectContent>
      </Select>

      {/* Clear */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4 mr-1.5" />
          Clear
        </Button>
      )}
    </div>
  );
}

function EmailTable({ emails }: { emails: EmailRow[] }) {
  const router = useRouter();

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-border">
            <TableHead className="w-[110px] text-muted-foreground font-normal">ID</TableHead>
            <TableHead className="text-muted-foreground font-normal">To</TableHead>
            <TableHead className="text-muted-foreground font-normal">Subject</TableHead>
            <TableHead className="text-muted-foreground font-normal w-[110px]">Template</TableHead>
            <TableHead className="text-muted-foreground font-normal w-[80px]">Transport</TableHead>
            <TableHead className="text-muted-foreground font-normal w-[110px]">Status</TableHead>
            <TableHead className="text-muted-foreground font-normal w-[130px]">Sent</TableHead>
            <TableHead className="w-[36px]"></TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {emails.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="h-64">
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center mb-4">
                    <Mail className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium text-foreground mb-1">No emails found</h3>
                  <p className="text-sm text-muted-foreground max-w-xs">
                    Try adjusting your search or filter criteria. No matching emails in the log.
                  </p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            emails.map((email) => (
              <TableRow
                key={email.id}
                className="border-border hover:bg-muted group cursor-pointer"
              >
                <TableCell className="font-mono text-xs text-muted-foreground">
                  <Link
                    href={`/emails/${email.id}`}
                    className="hover:text-foreground transition-colors"
                  >
                    {email.id.slice(0, 8)}
                  </Link>
                </TableCell>
                <TableCell className="font-medium text-sm">
                  {email.to}
                </TableCell>
                <TableCell>
                  <Link
                    href={`/emails/${email.id}`}
                    className="hover:text-foreground line-clamp-1 block max-w-md"
                  >
                    {email.subject}
                  </Link>
                </TableCell>
                <TableCell>
                  {email.template ? (
                    <span className="text-xs text-muted-foreground capitalize px-2.5 py-0.5 bg-muted rounded-sm">
                      {email.template}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {email.transport ? (
                    <span className="text-xs text-muted-foreground uppercase px-2.5 py-0.5 bg-muted rounded-sm">
                      {email.transport}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <StatusBadge status={email.status} />
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(email.sentAt), { addSuffix: true })}
                </TableCell>
                <TableCell className="text-center">
                  {email.hasAttachments && (
                    <span title="Has attachments">
                      <Paperclip className="h-4 w-4 text-muted-foreground inline-block" />
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "h-8 w-8 opacity-0 group-hover:opacity-100 transition-all")}>
                      <MoreHorizontal className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => router.push(`/emails/${email.id}`)} className="cursor-pointer">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        View details
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          navigator.clipboard.writeText(email.id);
                        }}
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        Copy ID
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Resend
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

interface EmailPaginationProps {
  page: number;
  totalPages: number;
  emailsCount: number;
}

function EmailPagination({ page, totalPages, emailsCount }: EmailPaginationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const goToPage = (nextPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(nextPage));
    router.push(`/emails?${params.toString()}`);
  };

  return (
    <div className="flex items-center justify-between border-t border-border px-6 py-4 text-sm text-muted-foreground bg-muted">
      <div>
        Showing {emailsCount} of {totalPages > 1 ? "many" : emailsCount} emails
      </div>
      <div className="flex items-center gap-3">
        {totalPages > 1 && (
          <>
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => goToPage(page - 1)}
            >
              Previous
            </Button>
            <span>Page {page} of {totalPages}</span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => goToPage(page + 1)}
            >
              Next
            </Button>
          </>
        )}
      </div>
    </div>
  );
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
  return (
    <div>
      <EmailFilters
        initialSearch={initialSearch}
        initialStatus={initialStatus}
        initialDateFrom={initialDateFrom}
        initialDateTo={initialDateTo}
      />
      <EmailTable emails={emails} />
      <EmailPagination page={page} totalPages={totalPages} emailsCount={emails.length} />
    </div>
  );
}
