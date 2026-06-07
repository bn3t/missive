import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmailMetadataCard } from "./email-metadata-card";

const baseSentAt = new Date("2024-03-15T14:30:00Z");

const baseProps = {
  sentByLabel: "Ada Lovelace <ada@example.com>",
  fromAddress: "noreply@example.com",
  to: "recipient@example.com",
  status: "sent",
  sentAt: baseSentAt,
};

describe("EmailMetadataCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the 'Details' card title", () => {
    render(<EmailMetadataCard {...baseProps} />);

    expect(screen.getByText("Details")).toBeInTheDocument();
  });

  it("shows the recipient (to) value", () => {
    render(<EmailMetadataCard {...baseProps} to="someone@test.com" />);

    expect(screen.getByText("someone@test.com")).toBeInTheDocument();
  });

  it("shows the status badge", () => {
    render(<EmailMetadataCard {...baseProps} status="sent" />);

    expect(screen.getByText("sent")).toBeInTheDocument();
  });

  it("shows the sent-at date in medium date / short time format", () => {
    render(<EmailMetadataCard {...baseProps} sentAt={baseSentAt} />);

    const formatted = baseSentAt.toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    });
    expect(screen.getByText(formatted)).toBeInTheDocument();
  });

  it("shows a template badge when template is provided", () => {
    render(<EmailMetadataCard {...baseProps} template="welcome-email" />);

    expect(screen.getByText("welcome-email")).toBeInTheDocument();
  });

  it("does not render a template section when template is null", () => {
    render(<EmailMetadataCard {...baseProps} template={null} />);

    expect(screen.queryByText("Template")).not.toBeInTheDocument();
  });

  it("shows tenantId when provided", () => {
    render(<EmailMetadataCard {...baseProps} tenantId="tenant-abc-123" />);

    expect(screen.getByText("tenant-abc-123")).toBeInTheDocument();
  });

  it("shows messageId when provided", () => {
    render(<EmailMetadataCard {...baseProps} messageId="<msg-id-001@example.com>" />);

    expect(screen.getByText("<msg-id-001@example.com>")).toBeInTheDocument();
  });

  it("shows transport when provided", () => {
    render(<EmailMetadataCard {...baseProps} transport="ses" />);

    expect(screen.getByText(/ses/i)).toBeInTheDocument();
  });

  it("shows error message text when errorMessage is set", () => {
    render(<EmailMetadataCard {...baseProps} errorMessage="SMTP connection refused" />);

    expect(screen.getByText("SMTP connection refused")).toBeInTheDocument();
  });

  it("shows 'Removed user' label when sentByLabel is 'Removed user'", () => {
    render(<EmailMetadataCard {...baseProps} sentByLabel="Removed user" />);

    expect(screen.getByText("Removed user")).toBeInTheDocument();
  });

  it("shows the From address", () => {
    render(<EmailMetadataCard {...baseProps} fromAddress="noreply@example.com" />);

    expect(screen.getByText("noreply@example.com")).toBeInTheDocument();
  });

  it("renders From address in monospace", () => {
    const { container } = render(<EmailMetadataCard {...baseProps} fromAddress="noreply@example.com" />);

    const monoEl = container.querySelector("dd.font-mono");
    expect(monoEl).not.toBeNull();
    expect(monoEl?.textContent).toBe("noreply@example.com");
  });
});
