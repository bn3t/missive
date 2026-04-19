import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SignOutButton } from "./sign-out-button";

// Mock the auth client
vi.mock("@/lib/auth/client", () => ({
  signOut: vi.fn(),
}));

// Mock lucide-react
vi.mock("lucide-react", () => ({
  LogOut: ({ className }: { className: string }) => (
    <svg data-testid="logout-icon" className={className} />
  ),
}));

describe("SignOutButton", () => {
  let originalLocation: Location;

  beforeEach(() => {
    originalLocation = window.location;
    Object.defineProperty(window, "location", {
      value: { href: "" },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, "location", {
      value: originalLocation,
      writable: true,
      configurable: true,
    });
  });

  it("renders the sign-out button with logout icon", () => {
    render(<SignOutButton />);

    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass("bg-clip-padding"); // Button class

    const icon = screen.getByTestId("logout-icon");
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveClass("h-4 w-4");
  });

  it("renders button with ghost variant and icon size", () => {
    render(<SignOutButton />);

    const button = screen.getByRole("button");
    // Ghost variant and icon size are applied through className
    expect(button.className).toContain("size-8"); // icon size = 8
    expect(button.className).toContain("hover:bg-muted"); // ghost variant
  });

  it("calls signOut when button is clicked", async () => {
    const { signOut } = await import("@/lib/auth/client");
    vi.mocked(signOut).mockResolvedValue(undefined);

    const user = userEvent.setup();
    render(<SignOutButton />);

    const button = screen.getByRole("button");
    await user.click(button);

    expect(vi.mocked(signOut)).toHaveBeenCalledOnce();
  });

  it("redirects to login page after successful sign-out", async () => {
    const { signOut } = await import("@/lib/auth/client");
    vi.mocked(signOut).mockResolvedValue(undefined);

    const user = userEvent.setup();
    render(<SignOutButton />);

    const button = screen.getByRole("button");
    await user.click(button);

    expect(window.location.href).toBe("/login");
  });


  it("button is clickable and has proper accessibility", async () => {
    const { signOut } = await import("@/lib/auth/client");
    vi.mocked(signOut).mockResolvedValue(undefined);

    const user = userEvent.setup();
    render(<SignOutButton />);

    const button = screen.getByRole("button");
    expect(button).not.toBeDisabled();

    await user.click(button);
    expect(vi.mocked(signOut)).toHaveBeenCalled();
  });

  it("awaits signOut completion before redirecting", async () => {
    const { signOut } = await import("@/lib/auth/client");
    const hrefAssignments: string[] = [];

    // Track href assignments
    Object.defineProperty(window, "location", {
      value: {
        get href() {
          return hrefAssignments[hrefAssignments.length - 1] || "";
        },
        set href(value: string) {
          hrefAssignments.push(value);
        },
      },
      writable: true,
      configurable: true,
    });

    vi.mocked(signOut).mockResolvedValue(undefined);

    const user = userEvent.setup();
    render(<SignOutButton />);

    const button = screen.getByRole("button");
    await user.click(button);

    expect(vi.mocked(signOut)).toHaveBeenCalled();
    expect(hrefAssignments[0]).toBe("/login");
  });
});
