import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmailAttachmentsCard } from "./email-attachments-card";

vi.mock("@/components/pdf-preview-dialog", () => ({
  PdfPreviewDialog: () => <div data-testid="pdf-preview" />,
}));

const imageAttachment = {
  id: "att-1",
  filename: "photo.png",
  contentType: "image/png",
  size: 2048,
};

const pdfAttachment = {
  id: "att-2",
  filename: "invoice.pdf",
  contentType: "application/pdf",
  size: 1048576,
};

describe("EmailAttachmentsCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the 'Attachments' card title", () => {
    render(
      <EmailAttachmentsCard emailId="email-123" attachments={[imageAttachment]} />
    );

    expect(screen.getByText("Attachments")).toBeInTheDocument();
  });

  it("lists each attachment filename", () => {
    render(
      <EmailAttachmentsCard
        emailId="email-123"
        attachments={[imageAttachment, pdfAttachment]}
      />
    );

    expect(screen.getByText("photo.png")).toBeInTheDocument();
    expect(screen.getByText("invoice.pdf")).toBeInTheDocument();
  });

  it("shows the content type badge for each attachment", () => {
    render(
      <EmailAttachmentsCard emailId="email-123" attachments={[imageAttachment]} />
    );

    expect(screen.getByText("image/png")).toBeInTheDocument();
  });

  it("shows the formatted size using formatBytes", () => {
    // 2048 bytes → "2.0 KB"
    render(
      <EmailAttachmentsCard emailId="email-123" attachments={[imageAttachment]} />
    );

    expect(screen.getByText("2.0 KB")).toBeInTheDocument();
  });

  it("renders a Download link with the correct href", () => {
    render(
      <EmailAttachmentsCard emailId="email-123" attachments={[imageAttachment]} />
    );

    const link = screen.getByRole("link", { name: /download/i });
    expect(link).toHaveAttribute(
      "href",
      "/api/emails/email-123/attachments/att-1?download=1"
    );
  });

  it("renders PdfPreviewDialog only for application/pdf attachments", () => {
    render(
      <EmailAttachmentsCard
        emailId="email-123"
        attachments={[imageAttachment, pdfAttachment]}
      />
    );

    // Should appear exactly once — for the PDF attachment
    const previews = screen.getAllByTestId("pdf-preview");
    expect(previews).toHaveLength(1);
  });

  it("does not render PdfPreviewDialog for non-PDF attachments", () => {
    render(
      <EmailAttachmentsCard emailId="email-123" attachments={[imageAttachment]} />
    );

    expect(screen.queryByTestId("pdf-preview")).not.toBeInTheDocument();
  });
});
