import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RemoveMemberDialog } from "./remove-member-dialog";

describe("RemoveMemberDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("dialog is closed/not visible when target=null", () => {
    render(
      <RemoveMemberDialog
        target={null}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        removing={false}
      />
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("dialog is open when target has a name", () => {
    render(
      <RemoveMemberDialog
        target={{ name: "Alice" }}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        removing={false}
      />
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("shows member name in the description text", () => {
    render(
      <RemoveMemberDialog
        target={{ name: "Alice" }}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        removing={false}
      />
    );

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(
      screen.getByText(/will be removed from the organization/i)
    ).toBeInTheDocument();
  });

  it("Remove button calls onConfirm when clicked", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    render(
      <RemoveMemberDialog
        target={{ name: "Alice" }}
        onClose={vi.fn()}
        onConfirm={onConfirm}
        removing={false}
      />
    );

    await user.click(screen.getByRole("button", { name: /^remove member$/i }));

    expect(onConfirm).toHaveBeenCalled();
  });

  it("Cancel button calls onClose when clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <RemoveMemberDialog
        target={{ name: "Alice" }}
        onClose={onClose}
        onConfirm={vi.fn()}
        removing={false}
      />
    );

    await user.click(screen.getByRole("button", { name: /cancel/i }));

    expect(onClose).toHaveBeenCalled();
  });

  it("Remove button shows 'Removing…' and is disabled when removing=true", () => {
    render(
      <RemoveMemberDialog
        target={{ name: "Alice" }}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        removing={true}
      />
    );

    const btn = screen.getByRole("button", { name: /removing…/i });
    expect(btn).toBeDisabled();
  });
});
