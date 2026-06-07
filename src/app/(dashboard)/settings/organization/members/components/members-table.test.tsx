import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MembersTable, OrgMember } from "./members-table";

const makeUser = (id: string, name: string, email: string) => ({
  id,
  email,
  name,
  image: null,
});

const makeMember = (
  id: string,
  userId: string,
  role: string,
  name: string,
  email: string
): OrgMember => ({
  id,
  organizationId: "org-1",
  userId,
  role,
  createdAt: new Date("2024-01-01"),
  user: makeUser(userId, name, email),
});

const alice = makeMember("m-1", "u-1", "owner", "Alice", "alice@example.com");
const bob = makeMember("m-2", "u-2", "member", "Bob", "bob@example.com");

describe("MembersTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders 'Organization members' card title", () => {
    render(
      <MembersTable
        members={[alice, bob]}
        currentUserId="u-1"
        isAdmin={true}
        isOwner={true}
        isLastOwner={false}
        updatingRole={null}
        onRoleChange={vi.fn()}
        onRemove={vi.fn()}
      />
    );

    expect(screen.getByText("Organization members")).toBeInTheDocument();
  });

  it("shows member count in description for plural", () => {
    render(
      <MembersTable
        members={[alice, bob]}
        currentUserId="u-1"
        isAdmin={true}
        isOwner={true}
        isLastOwner={false}
        updatingRole={null}
        onRoleChange={vi.fn()}
        onRemove={vi.fn()}
      />
    );

    expect(screen.getByText("2 members")).toBeInTheDocument();
  });

  it("shows '1 member' (singular) when count is 1", () => {
    render(
      <MembersTable
        members={[alice]}
        currentUserId="u-1"
        isAdmin={true}
        isOwner={true}
        isLastOwner={true}
        updatingRole={null}
        onRoleChange={vi.fn()}
        onRemove={vi.fn()}
      />
    );

    expect(screen.getByText("1 member")).toBeInTheDocument();
  });

  it("shows each member's name and email", () => {
    render(
      <MembersTable
        members={[alice, bob]}
        currentUserId="u-99"
        isAdmin={false}
        isOwner={false}
        isLastOwner={false}
        updatingRole={null}
        onRoleChange={vi.fn()}
        onRemove={vi.fn()}
      />
    );

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("alice@example.com")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("bob@example.com")).toBeInTheDocument();
  });

  it("shows 'You' badge on the current user row", () => {
    render(
      <MembersTable
        members={[alice, bob]}
        currentUserId="u-1"
        isAdmin={false}
        isOwner={false}
        isLastOwner={false}
        updatingRole={null}
        onRoleChange={vi.fn()}
        onRemove={vi.fn()}
      />
    );

    expect(screen.getByText("You")).toBeInTheDocument();
  });

  it("shows remove button for admin viewing non-current-user", () => {
    render(
      <MembersTable
        members={[alice, bob]}
        currentUserId="u-1"
        isAdmin={true}
        isOwner={true}
        isLastOwner={false}
        updatingRole={null}
        onRoleChange={vi.fn()}
        onRemove={vi.fn()}
      />
    );

    // bob (u-2) is not the current user (u-1), so trash button should appear
    const trashButtons = screen.getAllByRole("button", { name: /remove/i });
    expect(trashButtons.length).toBeGreaterThan(0);
  });

  it("calls onRemove with the member object when remove button is clicked", async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();

    render(
      <MembersTable
        members={[alice, bob]}
        currentUserId="u-1"
        isAdmin={true}
        isOwner={true}
        isLastOwner={false}
        updatingRole={null}
        onRoleChange={vi.fn()}
        onRemove={onRemove}
      />
    );

    const removeButtons = screen.getAllByRole("button", { name: /remove/i });
    await user.click(removeButtons[0]);

    expect(onRemove).toHaveBeenCalledWith(bob);
  });
});
