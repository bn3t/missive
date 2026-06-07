import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddMemberDialog } from "./add-member-dialog";

const defaultProps = {
  open: true,
  onOpenChange: vi.fn(),
  email: "",
  onEmailChange: vi.fn(),
  role: "member" as const,
  onRoleChange: vi.fn(),
  onSubmit: vi.fn(),
  adding: false,
  isOwner: false,
};

describe("AddMemberDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders dialog title 'Add member' when open=true", () => {
    render(<AddMemberDialog {...defaultProps} open={true} />);

    expect(
      screen.getByRole("heading", { name: "Add member" })
    ).toBeInTheDocument();
  });

  it("shows email input when open=true", () => {
    render(<AddMemberDialog {...defaultProps} open={true} />);

    expect(
      screen.getByPlaceholderText("user@example.com")
    ).toBeInTheDocument();
  });

  it("Add button is disabled when email is empty string", () => {
    render(<AddMemberDialog {...defaultProps} email="" />);

    const addButtons = screen.getAllByRole("button", { name: /add member/i });
    // The submit button inside the dialog footer
    const submitButton = addButtons.find(
      (btn) => btn.tagName === "BUTTON" && btn.closest("[role='dialog']")
    );
    expect(submitButton).toBeDisabled();
  });

  it("Add button is disabled when adding=true", () => {
    render(<AddMemberDialog {...defaultProps} email="user@example.com" adding={true} />);

    expect(screen.getByRole("button", { name: /removing…|adding…/i })).toBeDisabled();
  });

  it("Add button calls onSubmit when email is non-empty and adding=false", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <AddMemberDialog
        {...defaultProps}
        email="user@example.com"
        adding={false}
        onSubmit={onSubmit}
      />
    );

    const addButtons = screen.getAllByRole("button", { name: /^add member$/i });
    const submitButton = addButtons[addButtons.length - 1];
    await user.click(submitButton);

    expect(onSubmit).toHaveBeenCalled();
  });

  it("'Owner' role option is present when isOwner=true", async () => {
    const user = userEvent.setup();

    render(<AddMemberDialog {...defaultProps} isOwner={true} />);

    const trigger = screen.getByRole("combobox");
    await user.click(trigger);

    await waitFor(() => {
      expect(screen.getByRole("option", { name: "Owner" })).toBeInTheDocument();
    });
  });

  it("'Owner' role option is absent when isOwner=false", async () => {
    const user = userEvent.setup();

    render(<AddMemberDialog {...defaultProps} isOwner={false} />);

    const trigger = screen.getByRole("combobox");
    await user.click(trigger);

    await waitFor(() => {
      expect(screen.getByRole("option", { name: "Member" })).toBeInTheDocument();
    });
    expect(screen.queryByRole("option", { name: "Owner" })).not.toBeInTheDocument();
  });
});
