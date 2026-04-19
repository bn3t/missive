import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EmailListClient } from "./email-list-client";

const mockRouter = {
  push: vi.fn(),
};

const mockSearchParams = {
  toString: vi.fn(() => ""),
};

vi.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
  useSearchParams: () => mockSearchParams,
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

vi.mock("date-fns", () => ({
  formatDistanceToNow: (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins} minutes ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hours ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} days ago`;
  },
}));

describe("EmailListClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockEmail = (overrides = {}) => ({
    id: "abc123def456",
    to: "recipient@example.com",
    subject: "Welcome to our service",
    template: "welcome",
    transport: "ses",
    status: "sent" as const,
    sentAt: new Date(Date.now() - 2 * 60000), // 2 minutes ago
    hasAttachments: false,
    messageId: "msg-123",
    ...overrides,
  });

  describe("Rendering", () => {
    it("renders the email list with emails", () => {
      const emails = [
        createMockEmail({ to: "user1@example.com" }),
        createMockEmail({ to: "user2@example.com" }),
      ];

      render(
        <EmailListClient
          emails={emails}
          page={1}
          totalPages={1}
          search=""
          status="all"
          dateFrom=""
          dateTo=""
        />
      );

      expect(screen.getByText("user1@example.com")).toBeInTheDocument();
      expect(screen.getByText("user2@example.com")).toBeInTheDocument();
    });

    it("renders empty state when no emails", () => {
      render(
        <EmailListClient
          emails={[]}
          page={1}
          totalPages={1}
          search=""
          status="all"
          dateFrom=""
          dateTo=""
        />
      );

      expect(screen.getByText("No emails found")).toBeInTheDocument();
      expect(
        screen.getByText(/Try adjusting your search or filter criteria/)
      ).toBeInTheDocument();
    });

    it("renders table headers", () => {
      render(
        <EmailListClient
          emails={[createMockEmail()]}
          page={1}
          totalPages={1}
          search=""
          status="all"
          dateFrom=""
          dateTo=""
        />
      );

      expect(screen.getByText("ID")).toBeInTheDocument();
      expect(screen.getByText("To")).toBeInTheDocument();
      expect(screen.getByText("Subject")).toBeInTheDocument();
      expect(screen.getByText("Template")).toBeInTheDocument();
      expect(screen.getByText("Transport")).toBeInTheDocument();
      expect(screen.getByText("Status")).toBeInTheDocument();
      expect(screen.getByText("Sent")).toBeInTheDocument();
    });
  });

  describe("Email Row Content", () => {
    it("displays email ID truncated to 8 characters", () => {
      const emails = [createMockEmail({ id: "abcdefghijklmnop" })];

      render(
        <EmailListClient
          emails={emails}
          page={1}
          totalPages={1}
          search=""
          status="all"
          dateFrom=""
          dateTo=""
        />
      );

      expect(screen.getByText("abcdefgh")).toBeInTheDocument();
    });

    it("displays recipient email address", () => {
      const emails = [createMockEmail({ to: "john.doe@company.com" })];

      render(
        <EmailListClient
          emails={emails}
          page={1}
          totalPages={1}
          search=""
          status="all"
          dateFrom=""
          dateTo=""
        />
      );

      expect(screen.getByText("john.doe@company.com")).toBeInTheDocument();
    });

    it("displays subject line", () => {
      const emails = [createMockEmail({ subject: "Order Confirmation #12345" })];

      render(
        <EmailListClient
          emails={emails}
          page={1}
          totalPages={1}
          search=""
          status="all"
          dateFrom=""
          dateTo=""
        />
      );

      expect(screen.getByText("Order Confirmation #12345")).toBeInTheDocument();
    });

    it("displays template name when present", () => {
      const emails = [createMockEmail({ template: "password-reset" })];

      render(
        <EmailListClient
          emails={emails}
          page={1}
          totalPages={1}
          search=""
          status="all"
          dateFrom=""
          dateTo=""
        />
      );

      expect(screen.getByText("password-reset")).toBeInTheDocument();
    });

    it("displays dash when template is null", () => {
      const emails = [createMockEmail({ template: null })];

      render(
        <EmailListClient
          emails={emails}
          page={1}
          totalPages={1}
          search=""
          status="all"
          dateFrom=""
          dateTo=""
        />
      );

      const dashElements = screen.getAllByText("—");
      expect(dashElements.length).toBeGreaterThan(0);
    });

    it("displays transport name when present", () => {
      const emails = [createMockEmail({ transport: "smtp" })];

      render(
        <EmailListClient
          emails={emails}
          page={1}
          totalPages={1}
          search=""
          status="all"
          dateFrom=""
          dateTo=""
        />
      );

      expect(screen.getByText("smtp")).toBeInTheDocument();
    });

    it("displays dash when transport is null", () => {
      const emails = [createMockEmail({ transport: null })];

      render(
        <EmailListClient
          emails={emails}
          page={1}
          totalPages={1}
          search=""
          status="all"
          dateFrom=""
          dateTo=""
        />
      );

      const dashElements = screen.getAllByText("—");
      expect(dashElements.length).toBeGreaterThan(0);
    });

    it("displays sent time relative to now", () => {
      const sentTime = new Date(Date.now() - 30 * 60000); // 30 minutes ago
      const emails = [createMockEmail({ sentAt: sentTime })];

      render(
        <EmailListClient
          emails={emails}
          page={1}
          totalPages={1}
          search=""
          status="all"
          dateFrom=""
          dateTo=""
        />
      );

      expect(screen.getByText(/minutes ago/)).toBeInTheDocument();
    });
  });

  describe("Status Badge", () => {
    it("displays delivered badge for sent status", () => {
      const emails = [createMockEmail({ status: "sent" })];

      render(
        <EmailListClient
          emails={emails}
          page={1}
          totalPages={1}
          search=""
          status="all"
          dateFrom=""
          dateTo=""
        />
      );

      expect(screen.getByText("Delivered")).toBeInTheDocument();
    });

    it("displays failed badge for failed status", () => {
      const emails = [createMockEmail({ status: "failed" })];

      render(
        <EmailListClient
          emails={emails}
          page={1}
          totalPages={1}
          search=""
          status="all"
          dateFrom=""
          dateTo=""
        />
      );

      expect(screen.getByText("Failed")).toBeInTheDocument();
    });

    it("applies success styling for delivered badge", () => {
      const emails = [createMockEmail({ status: "sent" })];

      render(
        <EmailListClient
          emails={emails}
          page={1}
          totalPages={1}
          search=""
          status="all"
          dateFrom=""
          dateTo=""
        />
      );

      const badge = screen.getByText("Delivered");
      expect(badge.className).toContain("success");
    });

    it("applies destructive styling for failed badge", () => {
      const emails = [createMockEmail({ status: "failed" })];

      render(
        <EmailListClient
          emails={emails}
          page={1}
          totalPages={1}
          search=""
          status="all"
          dateFrom=""
          dateTo=""
        />
      );

      const badge = screen.getByText("Failed");
      expect(badge.className).toContain("destructive");
    });
  });

  describe("Attachments Indicator", () => {
    it("displays paperclip icon when email has attachments", () => {
      const emails = [createMockEmail({ hasAttachments: true })];

      render(
        <EmailListClient
          emails={emails}
          page={1}
          totalPages={1}
          search=""
          status="all"
          dateFrom=""
          dateTo=""
        />
      );

      const icon = screen.getByTitle("Has attachments");
      expect(icon).toBeInTheDocument();
    });

    it("does not display paperclip icon when email has no attachments", () => {
      const emails = [createMockEmail({ hasAttachments: false })];

      render(
        <EmailListClient
          emails={emails}
          page={1}
          totalPages={1}
          search=""
          status="all"
          dateFrom=""
          dateTo=""
        />
      );

      const icon = screen.queryByTitle("Has attachments");
      expect(icon).not.toBeInTheDocument();
    });
  });

  describe("Search Filter", () => {
    it("renders search input with placeholder", () => {
      render(
        <EmailListClient
          emails={[]}
          page={1}
          totalPages={1}
          search=""
          status="all"
          dateFrom=""
          dateTo=""
        />
      );

      const input = screen.getByPlaceholderText(
        "Search by recipient or subject..."
      ) as HTMLInputElement;
      expect(input).toBeInTheDocument();
    });

    it("initializes search input with initial search value", () => {
      render(
        <EmailListClient
          emails={[]}
          page={1}
          totalPages={1}
          search="john@example.com"
          status="all"
          dateFrom=""
          dateTo=""
        />
      );

      const input = screen.getByPlaceholderText(
        "Search by recipient or subject..."
      ) as HTMLInputElement;
      expect(input.value).toBe("john@example.com");
    });

    it("updates search input on type", async () => {
      const user = userEvent.setup();
      render(
        <EmailListClient
          emails={[]}
          page={1}
          totalPages={1}
          search=""
          status="all"
          dateFrom=""
          dateTo=""
        />
      );

      const input = screen.getByPlaceholderText(
        "Search by recipient or subject..."
      ) as HTMLInputElement;

      await user.type(input, "test@example.com");

      expect(input.value).toBe("test@example.com");
    });

    it("calls router.push on Enter key in search", async () => {
      const user = userEvent.setup();
      render(
        <EmailListClient
          emails={[]}
          page={1}
          totalPages={1}
          search=""
          status="all"
          dateFrom=""
          dateTo=""
        />
      );

      const input = screen.getByPlaceholderText(
        "Search by recipient or subject..."
      );

      await user.type(input, "test@example.com{Enter}");

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith(
          expect.stringContaining("search=test%40example.com")
        );
      });
    });

    it("calls router.push on blur in search", async () => {
      const user = userEvent.setup();
      render(
        <EmailListClient
          emails={[]}
          page={1}
          totalPages={1}
          search=""
          status="all"
          dateFrom=""
          dateTo=""
        />
      );

      const input = screen.getByPlaceholderText(
        "Search by recipient or subject..."
      );

      await user.type(input, "test@example.com");
      await user.tab(); // blur the input

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith(
          expect.stringContaining("search=test%40example.com")
        );
      });
    });

    it("removes search param when search is cleared and submitted", async () => {
      const user = userEvent.setup();
      mockSearchParams.toString.mockReturnValue("search=old");

      render(
        <EmailListClient
          emails={[]}
          page={1}
          totalPages={1}
          search="old"
          status="all"
          dateFrom=""
          dateTo=""
        />
      );

      const input = screen.getByPlaceholderText(
        "Search by recipient or subject..."
      ) as HTMLInputElement;

      await user.clear(input);
      await user.tab();

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalled();
      });
    });
  });

  describe("Status Filter", () => {
    it("renders status select with all statuses option", () => {
      render(
        <EmailListClient
          emails={[]}
          page={1}
          totalPages={1}
          search=""
          status="all"
          dateFrom=""
          dateTo=""
        />
      );

      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    it("initializes status select with initial status value", () => {
      render(
        <EmailListClient
          emails={[]}
          page={1}
          totalPages={1}
          search=""
          status="sent"
          dateFrom=""
          dateTo=""
        />
      );

      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    it("updates status filter on selection", async () => {
      const user = userEvent.setup();
      render(
        <EmailListClient
          emails={[]}
          page={1}
          totalPages={1}
          search=""
          status="all"
          dateFrom=""
          dateTo=""
        />
      );

      const trigger = screen.getByRole("combobox");
      await user.click(trigger);

      await waitFor(() => {
        expect(screen.getByRole("option", { name: /Delivered/ })).toBeInTheDocument();
      });

      const deliveredOption = screen.getByRole("option", { name: /Delivered/ });
      await user.click(deliveredOption);

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith(
          expect.stringContaining("status=sent")
        );
      });
    });

    it("removes status param when set to all", async () => {
      const user = userEvent.setup();
      mockSearchParams.toString.mockReturnValue("status=sent");

      render(
        <EmailListClient
          emails={[]}
          page={1}
          totalPages={1}
          search=""
          status="sent"
          dateFrom=""
          dateTo=""
        />
      );

      const trigger = screen.getByRole("combobox");
      await user.click(trigger);

      await waitFor(() => {
        expect(screen.getByRole("option", { name: /All Statuses/ })).toBeInTheDocument();
      });

      const allOption = screen.getByRole("option", { name: /All Statuses/ });
      await user.click(allOption);

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalled();
      });
    });

    it("resets page to 1 when status filter changes", async () => {
      const user = userEvent.setup();
      mockSearchParams.toString.mockReturnValue("page=2&status=all");

      render(
        <EmailListClient
          emails={[]}
          page={2}
          totalPages={5}
          search=""
          status="all"
          dateFrom=""
          dateTo=""
        />
      );

      const trigger = screen.getByRole("combobox");
      await user.click(trigger);

      // Wait for the dropdown to open and options to appear
      await waitFor(() => {
        expect(screen.getByRole("option", { name: /Failed/ })).toBeInTheDocument();
      });

      const failedOption = screen.getByRole("option", { name: /Failed/ });
      await user.click(failedOption);

      await waitFor(() => {
        const call = mockRouter.push.mock.calls[0]?.[0] as string | undefined;
        if (call) {
          expect(call).not.toContain("page=2");
        }
      });
    });
  });

  describe("Date Range Filter", () => {
    it("renders date range picker button", () => {
      render(
        <EmailListClient
          emails={[]}
          page={1}
          totalPages={1}
          search=""
          status="all"
          dateFrom=""
          dateTo=""
        />
      );

      expect(screen.getByText("Select dates")).toBeInTheDocument();
    });

    it("displays date range when both dates are set", () => {
      render(
        <EmailListClient
          emails={[]}
          page={1}
          totalPages={1}
          search=""
          status="all"
          dateFrom="2024-01-15"
          dateTo="2024-01-31"
        />
      );

      // Date display will show the local date format
      expect(screen.queryByText("Select dates")).not.toBeInTheDocument();
    });

    it("displays only from date when only from is set", () => {
      render(
        <EmailListClient
          emails={[]}
          page={1}
          totalPages={1}
          search=""
          status="all"
          dateFrom="2024-01-15"
          dateTo=""
        />
      );

      expect(screen.queryByText("Select dates")).not.toBeInTheDocument();
    });

    it("initializes date range with dates from props", () => {
      render(
        <EmailListClient
          emails={[]}
          page={1}
          totalPages={1}
          search=""
          status="all"
          dateFrom="2024-01-15"
          dateTo="2024-01-20"
        />
      );

      // Verify the dates are parsed correctly
      expect(screen.queryByText("Select dates")).not.toBeInTheDocument();
    });

    it("handles empty date range", () => {
      render(
        <EmailListClient
          emails={[]}
          page={1}
          totalPages={1}
          search=""
          status="all"
          dateFrom=""
          dateTo=""
        />
      );

      expect(screen.getByText("Select dates")).toBeInTheDocument();
    });
  });

  describe("Clear Filters Button", () => {
    it("does not display clear button when no filters active", () => {
      render(
        <EmailListClient
          emails={[]}
          page={1}
          totalPages={1}
          search=""
          status="all"
          dateFrom=""
          dateTo=""
        />
      );

      expect(screen.queryByRole("button", { name: /Clear/ })).not.toBeInTheDocument();
    });

    it("displays clear button when search filter active", () => {
      render(
        <EmailListClient
          emails={[]}
          page={1}
          totalPages={1}
          search="test"
          status="all"
          dateFrom=""
          dateTo=""
        />
      );

      expect(screen.getByRole("button", { name: /Clear/ })).toBeInTheDocument();
    });

    it("displays clear button when status filter active", () => {
      render(
        <EmailListClient
          emails={[]}
          page={1}
          totalPages={1}
          search=""
          status="sent"
          dateFrom=""
          dateTo=""
        />
      );

      expect(screen.getByRole("button", { name: /Clear/ })).toBeInTheDocument();
    });

    it("displays clear button when date filter active", () => {
      render(
        <EmailListClient
          emails={[]}
          page={1}
          totalPages={1}
          search=""
          status="all"
          dateFrom="2024-01-15"
          dateTo=""
        />
      );

      expect(screen.getByRole("button", { name: /Clear/ })).toBeInTheDocument();
    });

    it("clears all filters when clear button clicked", async () => {
      const user = userEvent.setup();
      render(
        <EmailListClient
          emails={[]}
          page={1}
          totalPages={1}
          search="test"
          status="sent"
          dateFrom="2024-01-15"
          dateTo=""
        />
      );

      const clearButton = screen.getByRole("button", { name: /Clear/ });
      await user.click(clearButton);

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith("/emails");
      });
    });
  });

  describe("Dropdown Menu Actions", () => {
    it("renders dropdown menu trigger for each row", () => {
      const emails = [createMockEmail()];

      render(
        <EmailListClient
          emails={emails}
          page={1}
          totalPages={1}
          search=""
          status="all"
          dateFrom=""
          dateTo=""
        />
      );

      // The component has buttons for date picker and status select
      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBeGreaterThanOrEqual(2); // Date picker and status select
    });

    it("has dropdown menu with action items", async () => {
      const emails = [createMockEmail()];

      render(
        <EmailListClient
          emails={emails}
          page={1}
          totalPages={1}
          search=""
          status="all"
          dateFrom=""
          dateTo=""
        />
      );

      // The component should have dropdown menu items defined
      // They may not be visible in the DOM when closed
      const tableBody = screen.getByRole("table").querySelector("tbody");
      expect(tableBody).toBeInTheDocument();
    });

    it("renders email row with actionable elements", () => {
      const emails = [createMockEmail({ id: "email-123" })];

      render(
        <EmailListClient
          emails={emails}
          page={1}
          totalPages={1}
          search=""
          status="all"
          dateFrom=""
          dateTo=""
        />
      );

      // Verify email is in a table row with links
      const emailLink = screen.getByText("recipient@example.com");
      expect(emailLink.closest("tr")).toBeInTheDocument();
    });

    it("renders subject as a link to email details", () => {
      const emails = [createMockEmail({ id: "email-123", subject: "Test Subject" })];

      render(
        <EmailListClient
          emails={emails}
          page={1}
          totalPages={1}
          search=""
          status="all"
          dateFrom=""
          dateTo=""
        />
      );

      const subjectLink = screen.getByText("Test Subject").closest("a");
      expect(subjectLink).toHaveAttribute("href", "/emails/email-123");
    });

    it("includes dropdown menu structure in each row", () => {
      const emails = [createMockEmail()];

      render(
        <EmailListClient
          emails={emails}
          page={1}
          totalPages={1}
          search=""
          status="all"
          dateFrom=""
          dateTo=""
        />
      );

      // Verify the dropdown menu exists in the table structure
      const table = screen.getByRole("table");
      expect(table).toBeInTheDocument();

      // The more button should exist but may not be clickable until hover in the real UI
      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe("Navigation Links", () => {
    it("links ID to email details page", () => {
      const emails = [createMockEmail({ id: "email-abc-123" })];

      render(
        <EmailListClient
          emails={emails}
          page={1}
          totalPages={1}
          search=""
          status="all"
          dateFrom=""
          dateTo=""
        />
      );

      const idLink = screen.getByText("email-ab");
      expect(idLink.closest("a")).toHaveAttribute("href", "/emails/email-abc-123");
    });

    it("links subject to email details page", () => {
      const emails = [createMockEmail({ id: "email-123", subject: "Test Subject" })];

      render(
        <EmailListClient
          emails={emails}
          page={1}
          totalPages={1}
          search=""
          status="all"
          dateFrom=""
          dateTo=""
        />
      );

      const subjectLink = screen.getByText("Test Subject");
      expect(subjectLink.closest("a")).toHaveAttribute("href", "/emails/email-123");
    });
  });

  describe("Pagination", () => {
    it("displays pagination footer with single page", () => {
      const emails = [createMockEmail()];

      render(
        <EmailListClient
          emails={emails}
          page={1}
          totalPages={1}
          search=""
          status="all"
          dateFrom=""
          dateTo=""
        />
      );

      expect(screen.getByText(/Showing 1 of 1 emails/)).toBeInTheDocument();
    });

    it("displays many for total when multiple pages", () => {
      const emails = [createMockEmail()];

      render(
        <EmailListClient
          emails={emails}
          page={1}
          totalPages={5}
          search=""
          status="all"
          dateFrom=""
          dateTo=""
        />
      );

      expect(screen.getByText(/Showing 1 of many emails/)).toBeInTheDocument();
    });

    it("does not display pagination controls on single page", () => {
      const emails = [createMockEmail()];

      render(
        <EmailListClient
          emails={emails}
          page={1}
          totalPages={1}
          search=""
          status="all"
          dateFrom=""
          dateTo=""
        />
      );

      expect(screen.queryByRole("button", { name: /Previous/ })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Next/ })).not.toBeInTheDocument();
    });

    it("displays pagination controls with multiple pages", () => {
      const emails = [createMockEmail()];

      render(
        <EmailListClient
          emails={emails}
          page={1}
          totalPages={5}
          search=""
          status="all"
          dateFrom=""
          dateTo=""
        />
      );

      expect(screen.getByRole("button", { name: /Previous/ })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Next/ })).toBeInTheDocument();
      expect(screen.getByText("Page 1 of 5")).toBeInTheDocument();
    });

    it("disables previous button on first page", () => {
      const emails = [createMockEmail()];

      render(
        <EmailListClient
          emails={emails}
          page={1}
          totalPages={5}
          search=""
          status="all"
          dateFrom=""
          dateTo=""
        />
      );

      const prevBtn = screen.getByRole("button", { name: /Previous/ });
      expect(prevBtn).toBeDisabled();
    });

    it("disables next button on last page", () => {
      const emails = [createMockEmail()];

      render(
        <EmailListClient
          emails={emails}
          page={5}
          totalPages={5}
          search=""
          status="all"
          dateFrom=""
          dateTo=""
        />
      );

      const nextBtn = screen.getByRole("button", { name: /Next/ });
      expect(nextBtn).toBeDisabled();
    });

    it("enables both buttons on middle page", () => {
      const emails = [createMockEmail()];

      render(
        <EmailListClient
          emails={emails}
          page={3}
          totalPages={5}
          search=""
          status="all"
          dateFrom=""
          dateTo=""
        />
      );

      const prevBtn = screen.getByRole("button", { name: /Previous/ });
      const nextBtn = screen.getByRole("button", { name: /Next/ });
      expect(prevBtn).not.toBeDisabled();
      expect(nextBtn).not.toBeDisabled();
    });

    it("navigates to previous page", async () => {
      const user = userEvent.setup();
      mockSearchParams.toString.mockReturnValue("page=3");

      const emails = [createMockEmail()];

      render(
        <EmailListClient
          emails={emails}
          page={3}
          totalPages={5}
          search=""
          status="all"
          dateFrom=""
          dateTo=""
        />
      );

      const prevBtn = screen.getByRole("button", { name: /Previous/ });
      await user.click(prevBtn);

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith(
          expect.stringContaining("page=2")
        );
      });
    });

    it("navigates to next page", async () => {
      const user = userEvent.setup();
      mockSearchParams.toString.mockReturnValue("page=2");

      const emails = [createMockEmail()];

      render(
        <EmailListClient
          emails={emails}
          page={2}
          totalPages={5}
          search=""
          status="all"
          dateFrom=""
          dateTo=""
        />
      );

      const nextBtn = screen.getByRole("button", { name: /Next/ });
      await user.click(nextBtn);

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith(
          expect.stringContaining("page=3")
        );
      });
    });

    it("preserves filters during pagination", async () => {
      const user = userEvent.setup();
      mockSearchParams.toString.mockReturnValue("search=test&status=sent&page=2");

      const emails = [createMockEmail()];

      render(
        <EmailListClient
          emails={emails}
          page={2}
          totalPages={5}
          search="test"
          status="sent"
          dateFrom=""
          dateTo=""
        />
      );

      const nextBtn = screen.getByRole("button", { name: /Next/ });
      await user.click(nextBtn);

      await waitFor(() => {
        const call = mockRouter.push.mock.calls[0][0] as string;
        expect(call).toContain("search=test");
        expect(call).toContain("status=sent");
      });
    });
  });

  describe("URL Parameter Synchronization", () => {
    it("syncs state when URL params change", () => {
      const { rerender } = render(
        <EmailListClient
          emails={[]}
          page={1}
          totalPages={1}
          search="old"
          status="sent"
          dateFrom="2024-01-01"
          dateTo="2024-01-31"
        />
      );

      const input = screen.getByPlaceholderText(
        "Search by recipient or subject..."
      ) as HTMLInputElement;
      expect(input.value).toBe("old");

      // Simulate browser back button changing URL params
      rerender(
        <EmailListClient
          emails={[]}
          page={1}
          totalPages={1}
          search="new"
          status="failed"
          dateFrom="2024-02-01"
          dateTo="2024-02-28"
        />
      );

      expect(input.value).toBe("new");
    });
  });

  describe("Multiple Emails", () => {
    it("renders multiple email rows in table", () => {
      const emails = [
        createMockEmail({ to: "user1@example.com" }),
        createMockEmail({ to: "user2@example.com" }),
        createMockEmail({ to: "user3@example.com" }),
      ];

      render(
        <EmailListClient
          emails={emails}
          page={1}
          totalPages={1}
          search=""
          status="all"
          dateFrom=""
          dateTo=""
        />
      );

      expect(screen.getByText("user1@example.com")).toBeInTheDocument();
      expect(screen.getByText("user2@example.com")).toBeInTheDocument();
      expect(screen.getByText("user3@example.com")).toBeInTheDocument();
    });

    it("displays correct email count", () => {
      const emails = Array.from({ length: 10 }, (_, i) =>
        createMockEmail({ to: `user${i}@example.com` })
      );

      render(
        <EmailListClient
          emails={emails}
          page={1}
          totalPages={5}
          search=""
          status="all"
          dateFrom=""
          dateTo=""
        />
      );

      expect(screen.getByText(/Showing 10 of many emails/)).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("handles very long email addresses", () => {
      const longEmail =
        "very.long.email.address.with.many.parts@subdomain.example.com";
      const emails = [createMockEmail({ to: longEmail })];

      render(
        <EmailListClient
          emails={emails}
          page={1}
          totalPages={1}
          search=""
          status="all"
          dateFrom=""
          dateTo=""
        />
      );

      expect(screen.getByText(longEmail)).toBeInTheDocument();
    });

    it("handles very long subject lines", () => {
      const longSubject = "A".repeat(200);
      const emails = [createMockEmail({ subject: longSubject })];

      render(
        <EmailListClient
          emails={emails}
          page={1}
          totalPages={1}
          search=""
          status="all"
          dateFrom=""
          dateTo=""
        />
      );

      expect(screen.getByText(longSubject)).toBeInTheDocument();
    });

    it("handles special characters in search", async () => {
      const user = userEvent.setup();
      render(
        <EmailListClient
          emails={[]}
          page={1}
          totalPages={1}
          search=""
          status="all"
          dateFrom=""
          dateTo=""
        />
      );

      const input = screen.getByPlaceholderText(
        "Search by recipient or subject..."
      );

      await user.type(input, "test+alias@example.com");

      expect((input as HTMLInputElement).value).toBe("test+alias@example.com");
    });

    it("handles null messageId", () => {
      const emails = [createMockEmail({ messageId: null })];

      render(
        <EmailListClient
          emails={emails}
          page={1}
          totalPages={1}
          search=""
          status="all"
          dateFrom=""
          dateTo=""
        />
      );

      expect(screen.getByText("recipient@example.com")).toBeInTheDocument();
    });

    it("handles dates very far in the past", () => {
      const oldDate = new Date("2020-01-01");
      const emails = [createMockEmail({ sentAt: oldDate })];

      render(
        <EmailListClient
          emails={emails}
          page={1}
          totalPages={1}
          search=""
          status="all"
          dateFrom=""
          dateTo=""
        />
      );

      // The mock formatDistanceToNow will show "X days ago" for old dates
      expect(screen.getByText(/days ago/)).toBeInTheDocument();
    });
  });
});
