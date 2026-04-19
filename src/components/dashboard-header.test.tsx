import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { DashboardHeader } from "./dashboard-header";

vi.mock("next/navigation", () => ({
  usePathname: () => "/emails",
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: "light", setTheme: vi.fn() }),
}));

vi.mock("./sign-out-button", () => ({
  SignOutButton: () => <button>Sign out</button>,
}));

describe("DashboardHeader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the brand and navigation links", () => {
    render(<DashboardHeader />);

    expect(screen.getByText("Missive")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Emails" })).toHaveAttribute("href", "/emails");
    expect(screen.getByRole("link", { name: "API Keys" })).toHaveAttribute(
      "href",
      "/settings/api-keys",
    );
    expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute("href", "/settings");
  });

  it("highlights the active route", () => {
    render(<DashboardHeader />);

    const active = screen.getByRole("link", { name: "Emails" });
    expect(active.className).toContain("bg-secondary");
  });

  it("derives initials from the user name", () => {
    render(<DashboardHeader user={{ name: "Ada Lovelace", email: "ada@example.com" }} />);

    expect(screen.getByText("AL")).toBeInTheDocument();
  });

  it("falls back to default initials when no user is provided", () => {
    render(<DashboardHeader />);

    expect(screen.getByText("JD")).toBeInTheDocument();
  });

  it("caps initials at two characters", () => {
    render(<DashboardHeader user={{ name: "alan mathison turing" }} />);

    expect(screen.getByText("AM")).toBeInTheDocument();
  });
});
