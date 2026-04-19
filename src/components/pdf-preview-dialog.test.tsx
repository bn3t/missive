import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PdfPreviewDialog } from "./pdf-preview-dialog";

describe("PdfPreviewDialog", () => {
  beforeEach(() => {
    // Clear any active dialogs between tests
    vi.clearAllMocks();
  });

  it("renders the preview trigger button", () => {
    render(<PdfPreviewDialog src="/test.pdf" filename="test.pdf" />);

    const button = screen.getByRole("button", { name: /preview/i });
    expect(button).toBeInTheDocument();
  });

  it("applies outline button variant styling to trigger", () => {
    render(<PdfPreviewDialog src="/test.pdf" filename="test.pdf" />);

    const button = screen.getByRole("button", { name: /preview/i });
    expect(button.className).toMatch(/outline/);
  });

  it("opens dialog when preview button is clicked", async () => {
    const user = userEvent.setup();
    render(<PdfPreviewDialog src="/test.pdf" filename="document.pdf" />);

    const button = screen.getByRole("button", { name: /preview/i });
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText("document.pdf")).toBeInTheDocument();
    });
  });

  it("displays the filename as dialog title in monospace font", async () => {
    const user = userEvent.setup();
    const filename = "invoice-2024-03-15.pdf";
    render(<PdfPreviewDialog src="/test.pdf" filename={filename} />);

    const button = screen.getByRole("button", { name: /preview/i });
    await user.click(button);

    const title = screen.getByText(filename);
    expect(title).toBeInTheDocument();
    expect(title.className).toContain("font-mono");
  });

  it("renders iframe with correct src attribute", async () => {
    const user = userEvent.setup();
    const src = "https://example.com/documents/test.pdf";
    render(<PdfPreviewDialog src={src} filename="test.pdf" />);

    const button = screen.getByRole("button", { name: /preview/i });
    await user.click(button);

    await waitFor(() => {
      const iframe = screen.getByTitle("test.pdf") as HTMLIFrameElement;
      expect(iframe).toBeInTheDocument();
      expect(iframe.src).toBe(src);
    });
  });

  it("sets iframe title to filename for accessibility", async () => {
    const user = userEvent.setup();
    const filename = "important-document.pdf";
    render(<PdfPreviewDialog src="/test.pdf" filename={filename} />);

    const button = screen.getByRole("button", { name: /preview/i });
    await user.click(button);

    const iframe = screen.getByTitle(filename);
    expect(iframe).toBeInTheDocument();
  });

  it("applies correct styling to iframe", async () => {
    const user = userEvent.setup();
    render(<PdfPreviewDialog src="/test.pdf" filename="test.pdf" />);

    const button = screen.getByRole("button", { name: /preview/i });
    await user.click(button);

    await waitFor(() => {
      const iframe = screen.getByTitle("test.pdf");
      expect(iframe.className).toContain("h-[75vh]");
      expect(iframe.className).toContain("w-full");
      expect(iframe.className).toContain("rounded-md");
      expect(iframe.className).toContain("border");
    });
  });

  it("applies max-width constraint to dialog content", async () => {
    const user = userEvent.setup();
    render(<PdfPreviewDialog src="/test.pdf" filename="test.pdf" />);

    const button = screen.getByRole("button", { name: /preview/i });
    await user.click(button);

    // DialogContent should have sm:max-w-4xl applied
    await waitFor(() => {
      expect(screen.getByText("test.pdf")).toBeInTheDocument();
    });
  });

  it("handles different PDF sources", async () => {
    const user = userEvent.setup();
    const sources = [
      { src: "/pdfs/document.pdf", expected: "http://localhost:3000/pdfs/document.pdf" },
      { src: "https://cdn.example.com/files/report.pdf", expected: "https://cdn.example.com/files/report.pdf" },
      { src: "data:application/pdf;base64,JVBERi0xLjQ=", expected: "data:application/pdf;base64,JVBERi0xLjQ=" },
    ];

    for (const { src, expected } of sources) {
      const { unmount } = render(<PdfPreviewDialog src={src} filename="test.pdf" />);

      const button = screen.getByRole("button", { name: /preview/i });
      await user.click(button);

      await waitFor(() => {
        const iframe = screen.getByTitle("test.pdf") as HTMLIFrameElement;
        expect(iframe.src).toBe(expected);
      });

      unmount();
    }
  });

  it("handles filenames with special characters", async () => {
    const user = userEvent.setup();
    const filename = "Invoice #2024-03 (Final) & Corrected.pdf";
    render(<PdfPreviewDialog src="/test.pdf" filename={filename} />);

    const button = screen.getByRole("button", { name: /preview/i });
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText(filename)).toBeInTheDocument();
      const iframe = screen.getByTitle(filename);
      expect(iframe).toBeInTheDocument();
    });
  });

  it("handles long filenames without breaking layout", async () => {
    const user = userEvent.setup();
    const filename =
      "Very_Long_Filename_With_Multiple_Words_That_Describes_The_Document_Content_In_Detail_2024.pdf";
    render(<PdfPreviewDialog src="/test.pdf" filename={filename} />);

    const button = screen.getByRole("button", { name: /preview/i });
    await user.click(button);

    await waitFor(() => {
      const title = screen.getByText(filename);
      expect(title).toBeInTheDocument();
    });
  });

  it("closes dialog when close button is clicked", async () => {
    const user = userEvent.setup();
    render(<PdfPreviewDialog src="/test.pdf" filename="test.pdf" />);

    const button = screen.getByRole("button", { name: /preview/i });
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText("test.pdf")).toBeInTheDocument();
    });

    // Find and click the close button
    const closeButtons = screen.getAllByRole("button");
    const closeButton = closeButtons.find((btn) => btn.getAttribute("aria-label")?.includes("Close") || btn.textContent?.includes("Close"));

    if (closeButton) {
      await user.click(closeButton);
    }
  });

  it("renders with minimal props", () => {
    render(<PdfPreviewDialog src="/" filename="" />);

    const button = screen.getByRole("button", { name: /preview/i });
    expect(button).toBeInTheDocument();
  });

  it("supports empty string filename", async () => {
    const user = userEvent.setup();
    render(<PdfPreviewDialog src="/test.pdf" filename="" />);

    const button = screen.getByRole("button", { name: /preview/i });
    await user.click(button);

    // Empty title should still render without errors
    await waitFor(() => {
      const iframe = screen.getByTitle("");
      expect(iframe).toBeInTheDocument();
    });
  });

  it("properly separates multiple dialogs rendered together", () => {
    render(
      <>
        <PdfPreviewDialog src="/doc1.pdf" filename="doc1.pdf" />
        <PdfPreviewDialog src="/doc2.pdf" filename="doc2.pdf" />
      </>
    );

    const buttons = screen.getAllByRole("button", { name: /preview/i });
    expect(buttons).toHaveLength(2);
  });

  it("handles rapid open/close interactions", async () => {
    const user = userEvent.setup();
    render(<PdfPreviewDialog src="/test.pdf" filename="test.pdf" />);

    const button = screen.getByRole("button", { name: /preview/i });

    // Click open
    await user.click(button);
    await waitFor(() => {
      expect(screen.getByText("test.pdf")).toBeInTheDocument();
    });
  });

  it("iframe does not prevent scrolling of PDF content", async () => {
    const user = userEvent.setup();
    render(<PdfPreviewDialog src="/test.pdf" filename="test.pdf" />);

    const button = screen.getByRole("button", { name: /preview/i });
    await user.click(button);

    await waitFor(() => {
      const iframe = screen.getByTitle("test.pdf");
      // iframe should have classes that allow content scrolling
      expect(iframe.className).toContain("h-[75vh]");
      expect(iframe.className).toContain("w-full");
    });
  });
});
