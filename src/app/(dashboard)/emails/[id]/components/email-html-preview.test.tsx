import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmailHtmlPreview } from "./email-html-preview";

describe("EmailHtmlPreview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the 'HTML Preview' card title", () => {
    render(<EmailHtmlPreview htmlBody="<p>Hello</p>" />);

    expect(screen.getByText("HTML Preview")).toBeInTheDocument();
  });

  it("renders an iframe with srcDoc equal to the provided HTML string", () => {
    const html = "<h1>Welcome</h1><p>This is a test email.</p>";
    render(<EmailHtmlPreview htmlBody={html} />);

    const iframe = screen.getByTitle(/email html preview/i) as HTMLIFrameElement;
    expect(iframe).toBeInTheDocument();
    expect(iframe.getAttribute("srcdoc")).toBe(html);
  });

  it("sets sandbox='allow-same-origin' on the iframe", () => {
    render(<EmailHtmlPreview htmlBody="<p>Hello</p>" />);

    const iframe = screen.getByTitle(/email html preview/i);
    expect(iframe).toHaveAttribute("sandbox", "allow-same-origin");
  });

  it("renders without crashing when htmlBody is null", () => {
    render(<EmailHtmlPreview htmlBody={null} />);

    // The component should render (title still present) even without content
    expect(screen.getByText("HTML Preview")).toBeInTheDocument();

    // The iframe, if rendered, should have a null/undefined/empty srcDoc
    const iframe = screen.queryByTitle(/email html preview/i) as HTMLIFrameElement | null;
    if (iframe) {
      const srcDoc = iframe.getAttribute("srcdoc");
      expect(srcDoc === null || srcDoc === "" || srcDoc === "null").toBe(true);
    }
  });
});
