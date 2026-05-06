import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SignOutButton } from "./sign-out-button";

vi.mock("@/lib/auth/client", () => ({
  signOut: vi.fn(),
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

  it("renders 'Log out' text", () => {
    render(<SignOutButton />);
    expect(screen.getByText("Log out")).toBeInTheDocument();
  });

  it("calls signOut and redirects to login when clicked", async () => {
    const { signOut } = await import("@/lib/auth/client");
    vi.mocked(signOut).mockResolvedValue(undefined);

    const user = userEvent.setup();
    render(<SignOutButton />);

    await user.click(screen.getByText("Log out"));

    expect(vi.mocked(signOut)).toHaveBeenCalledOnce();
    expect(window.location.href).toBe("/login");
  });
});
