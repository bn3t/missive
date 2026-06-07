import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { EmailsPageSkeleton } from "./emails-page-skeleton";

describe("EmailsPageSkeleton", () => {
  it("renders without crashing", () => {
    const { container } = render(<EmailsPageSkeleton />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it("renders 4 stats card skeletons", () => {
    const { container } = render(<EmailsPageSkeleton />);
    // Each stats card has a rounded-xl class with border
    const statCards = container.querySelectorAll(
      ".rounded-xl.border.border-border.bg-card.p-6"
    );
    expect(statCards).toHaveLength(4);
  });

  it("renders 10 email row skeletons", () => {
    const { container } = render(<EmailsPageSkeleton />);
    // Rows are inside the list container (border-b p-4 flex)
    const listContainer = container.querySelector(
      ".rounded-xl.border.border-border.bg-card.overflow-hidden"
    );
    expect(listContainer).toBeInTheDocument();
    const rows = listContainer!.querySelectorAll(".flex.items-center.gap-4.border-b.p-4");
    expect(rows).toHaveLength(10);
  });

  it("renders a filters bar skeleton inside the list container", () => {
    const { container } = render(<EmailsPageSkeleton />);
    const listContainer = container.querySelector(
      ".rounded-xl.border.border-border.bg-card.overflow-hidden"
    );
    const filtersBar = listContainer!.querySelector(".flex.items-center.gap-3.p-4.border-b");
    expect(filtersBar).toBeInTheDocument();
  });

  it("renders a page header skeleton", () => {
    const { container } = render(<EmailsPageSkeleton />);
    // The root has space-y-8 and the header is its first child
    const root = container.firstChild as HTMLElement;
    const header = root.firstChild as HTMLElement;
    expect(header.className).toContain("flex");
    expect(header.className).toContain("items-center");
  });
});
