import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CreateOrgCard } from "./create-org-card";

const baseProps = {
  newOrgName: "My Organization",
  onOrgNameChange: vi.fn(),
  onCreate: vi.fn(),
  creating: false,
};

describe("CreateOrgCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders 'Create an organization' card title", () => {
    render(<CreateOrgCard {...baseProps} />);

    expect(screen.getByText("Create an organization")).toBeInTheDocument();
  });

  it("shows org name input", () => {
    render(<CreateOrgCard {...baseProps} newOrgName="My Org" />);

    expect(screen.getByLabelText("Organization name")).toBeInTheDocument();
    expect(screen.getByLabelText("Organization name")).toHaveValue("My Org");
  });

  it("Create button is disabled when newOrgName is empty string", () => {
    render(<CreateOrgCard {...baseProps} newOrgName="" />);

    expect(
      screen.getByRole("button", { name: /create organization/i })
    ).toBeDisabled();
  });

  it("Create button is disabled when creating=true", () => {
    render(<CreateOrgCard {...baseProps} creating={true} />);

    expect(
      screen.getByRole("button", { name: /creating/i })
    ).toBeDisabled();
  });

  it("Create button calls onCreate when clicked with non-empty name", async () => {
    const onCreate = vi.fn();
    render(<CreateOrgCard {...baseProps} onCreate={onCreate} newOrgName="My Org" />);

    await userEvent.click(
      screen.getByRole("button", { name: /create organization/i })
    );

    expect(onCreate).toHaveBeenCalledOnce();
  });
});
