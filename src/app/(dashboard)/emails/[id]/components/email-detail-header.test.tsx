import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmailDetailHeader } from "./email-detail-header";

describe("EmailDetailHeader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the subject as a heading", () => {
    render(<EmailDetailHeader subject="Welcome to Missive" />);

    expect(
      screen.getByRole("heading", { name: "Welcome to Missive" })
    ).toBeInTheDocument();
  });

  it("renders a back link to /emails", () => {
    render(<EmailDetailHeader subject="Welcome to Missive" />);

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/emails");
  });
});
