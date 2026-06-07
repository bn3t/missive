import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { DangerZoneRow } from "./danger-zone-row";

describe("DangerZoneRow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the title", () => {
    render(
      <DangerZoneRow
        title="Leave organization"
        description="This action cannot be undone."
        action={<button>Leave</button>}
      />
    );

    expect(screen.getByText("Leave organization")).toBeInTheDocument();
  });

  it("renders the description", () => {
    render(
      <DangerZoneRow
        title="Leave organization"
        description="This action cannot be undone."
        action={<button>Leave</button>}
      />
    );

    expect(screen.getByText("This action cannot be undone.")).toBeInTheDocument();
  });

  it("renders the action node", () => {
    render(
      <DangerZoneRow
        title="Leave organization"
        description="This action cannot be undone."
        action={<button>Leave</button>}
      />
    );

    expect(screen.getByRole("button", { name: "Leave" })).toBeInTheDocument();
  });

  it("default variant has rounded-md border class on wrapper", () => {
    const { container } = render(
      <DangerZoneRow
        title="Leave organization"
        description="This action cannot be undone."
        action={<button>Leave</button>}
      />
    );

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain("rounded-md");
    expect(wrapper.className).toContain("border");
  });

  it("adds destructive classes when destructive is true", () => {
    const { container } = render(
      <DangerZoneRow
        title="Leave organization"
        description="This action cannot be undone."
        action={<button>Leave</button>}
        destructive
      />
    );

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain("border-destructive/40");
    expect(wrapper.className).toContain("bg-destructive/5");
  });

  it("does not add destructive classes when destructive is false", () => {
    const { container } = render(
      <DangerZoneRow
        title="Leave organization"
        description="This action cannot be undone."
        action={<button>Leave</button>}
        destructive={false}
      />
    );

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).not.toContain("border-destructive/40");
  });
});
