import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { SettingsCard } from "./settings-card";

describe("SettingsCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the title", () => {
    render(<SettingsCard title="My Title">content</SettingsCard>);

    expect(screen.getByText("My Title")).toBeInTheDocument();
  });

  it("renders the description when provided", () => {
    render(
      <SettingsCard title="My Title" description="Helpful description">
        content
      </SettingsCard>
    );

    expect(screen.getByText("Helpful description")).toBeInTheDocument();
  });

  it("does not render a description when not provided", () => {
    render(<SettingsCard title="My Title">content</SettingsCard>);

    expect(screen.queryByText("Helpful description")).not.toBeInTheDocument();
  });

  it("renders children inside the content area", () => {
    render(<SettingsCard title="My Title">child content</SettingsCard>);

    expect(screen.getByText("child content")).toBeInTheDocument();
  });

  it("forwards className to the root Card element", () => {
    const { container } = render(
      <SettingsCard title="My Title" className="extra-class">
        content
      </SettingsCard>
    );

    const root = container.firstChild as HTMLElement;
    expect(root.className).toContain("extra-class");
  });

  it("forwards contentClassName to the CardContent element", () => {
    const { container } = render(
      <SettingsCard title="My Title" contentClassName="content-extra">
        content
      </SettingsCard>
    );

    const contentEl = container.querySelector('[data-slot="card-content"]') as HTMLElement;
    expect(contentEl.className).toContain("content-extra");
  });

  it("renders a JSX node as description", () => {
    render(
      <SettingsCard
        title="My Title"
        description={<span>Use <code>npm run dev</code> to start</span>}
      >
        content
      </SettingsCard>
    );

    expect(screen.getByText("npm run dev")).toBeInTheDocument();
    expect(document.querySelector("code")).toBeInTheDocument();
  });
});
