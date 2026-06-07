import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { PageHeader } from "./page-header";

describe("PageHeader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the title as a heading", () => {
    render(<PageHeader title="My Page" />);

    expect(screen.getByRole("heading", { name: "My Page" })).toBeInTheDocument();
  });

  it("renders a description when provided", () => {
    render(<PageHeader title="My Page" description="A helpful description" />);

    expect(screen.getByText("A helpful description")).toBeInTheDocument();
  });

  it("does not render a paragraph when no description is provided", () => {
    const { container } = render(<PageHeader title="My Page" />);

    expect(container.querySelector("p")).not.toBeInTheDocument();
  });

  it("renders an icon node when provided", () => {
    render(
      <PageHeader
        title="My Page"
        icon={<span data-testid="test-icon" />}
      />
    );

    expect(screen.getByTestId("test-icon")).toBeInTheDocument();
  });

  it("renders an action node when provided", () => {
    render(
      <PageHeader
        title="My Page"
        action={<button>Do thing</button>}
      />
    );

    expect(screen.getByRole("button", { name: "Do thing" })).toBeInTheDocument();
  });

  it("applies justify-between class to root wrapper when action is present", () => {
    const { container } = render(
      <PageHeader
        title="My Page"
        action={<button>Do thing</button>}
      />
    );

    const root = container.firstChild as HTMLElement;
    expect(root.className).toContain("justify-between");
  });

  it("renders icon and heading within the same left-group container", () => {
    render(
      <PageHeader
        title="My Page"
        icon={<span data-testid="test-icon" />}
        action={<button>Do thing</button>}
      />
    );

    const icon = screen.getByTestId("test-icon");
    const heading = screen.getByRole("heading", { name: "My Page" });

    // Both the icon and heading should share the same parent div (left group)
    expect(icon.closest("div")).toBe(heading.closest("div"));
  });

  it("does not render an icon wrapper when no icon is provided", () => {
    render(<PageHeader title="My Page" />);

    const heading = screen.getByRole("heading", { name: "My Page" });
    // When there's no icon, the heading's parent should not contain any icon element
    const parent = heading.parentElement;
    expect(parent?.querySelector("[data-testid='test-icon']")).not.toBeInTheDocument();
    // Heading should have no preceding sibling icon element within the same container
    expect(heading.previousElementSibling).toBeNull();
  });
});
