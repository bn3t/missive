import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DangerZoneCard } from "./danger-zone-card";

const baseProps = {
  orgName: "Acme Corp",
  isLastOwner: false,
  isOwner: true,
  leaveOpen: false,
  onLeaveOpenChange: vi.fn(),
  onLeave: vi.fn(),
  leaving: false,
  deleteOpen: false,
  onDeleteOpenChange: vi.fn(),
  deleteConfirm: "",
  onDeleteConfirmChange: vi.fn(),
  onDelete: vi.fn(),
  deleting: false,
};

describe("DangerZoneCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders 'Danger Zone' card title", () => {
    render(<DangerZoneCard {...baseProps} />);

    expect(screen.getByText("Danger Zone")).toBeInTheDocument();
  });

  it("hides Leave row when isLastOwner=true", () => {
    render(<DangerZoneCard {...baseProps} isLastOwner={true} />);

    expect(screen.queryByText("Leave organization")).not.toBeInTheDocument();
  });

  it("shows Leave row when isLastOwner=false", () => {
    render(<DangerZoneCard {...baseProps} isLastOwner={false} />);

    expect(screen.getByText("Leave organization")).toBeInTheDocument();
  });

  it("shows Delete row when isOwner=true", () => {
    render(<DangerZoneCard {...baseProps} isOwner={true} />);

    expect(screen.getByText("Delete organization")).toBeInTheDocument();
  });

  it("hides Delete row when isOwner=false", () => {
    render(<DangerZoneCard {...baseProps} isOwner={false} />);

    expect(screen.queryByText("Delete organization")).not.toBeInTheDocument();
  });

  it("Delete confirm button is disabled until deleteConfirm === orgName", async () => {
    render(
      <DangerZoneCard
        {...baseProps}
        deleteOpen={true}
        deleteConfirm=""
        orgName="Acme Corp"
      />
    );

    const deleteButton = screen.getByRole("button", { name: /delete organization/i });
    expect(deleteButton).toBeDisabled();
  });

  it("Leave dialog: confirm button calls onLeave when clicked", async () => {
    const onLeave = vi.fn();
    render(
      <DangerZoneCard
        {...baseProps}
        onLeave={onLeave}
        leaveOpen={true}
      />
    );

    const leaveButton = screen.getByRole("button", { name: /leave organization/i });
    await userEvent.click(leaveButton);

    expect(onLeave).toHaveBeenCalledOnce();
  });

  it("Delete dialog: confirm button calls onDelete when clicked", async () => {
    const onDelete = vi.fn();
    render(
      <DangerZoneCard
        {...baseProps}
        onDelete={onDelete}
        deleteOpen={true}
        deleteConfirm="Acme Corp"
        orgName="Acme Corp"
      />
    );

    const deleteButton = screen.getByRole("button", { name: /delete organization/i });
    await userEvent.click(deleteButton);

    expect(onDelete).toHaveBeenCalledOnce();
  });
});
