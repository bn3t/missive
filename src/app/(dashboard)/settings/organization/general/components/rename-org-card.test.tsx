import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RenameOrgCard } from "./rename-org-card";

const baseProps = {
  orgName: "Acme Corp",
  onOrgNameChange: vi.fn(),
  onSave: vi.fn(),
  saving: false,
  isOwner: true,
};

describe("RenameOrgCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders 'General' card title", () => {
    render(<RenameOrgCard {...baseProps} />);

    expect(screen.getByText("General")).toBeInTheDocument();
  });

  it("shows org name input with current value", () => {
    render(<RenameOrgCard {...baseProps} orgName="Acme Corp" />);

    expect(screen.getByLabelText("Organization name")).toHaveValue("Acme Corp");
  });

  it("Save button is disabled when isOwner=false", () => {
    render(<RenameOrgCard {...baseProps} isOwner={false} />);

    expect(screen.getByRole("button", { name: /save/i })).toBeDisabled();
  });

  it("Save button is disabled when orgName is empty string", () => {
    render(<RenameOrgCard {...baseProps} orgName="" />);

    expect(screen.getByRole("button", { name: /save/i })).toBeDisabled();
  });

  it("Save button calls onSave when clicked with non-empty name and isOwner=true", async () => {
    const onSave = vi.fn();
    render(<RenameOrgCard {...baseProps} onSave={onSave} orgName="Acme Corp" isOwner={true} />);

    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(onSave).toHaveBeenCalledOnce();
  });
});
