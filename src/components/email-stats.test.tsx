import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmailStats } from "./email-stats";

describe("EmailStats", () => {
  it("renders all four stat cards with correct labels", () => {
    render(<EmailStats total={100} sent={85} failed={15} successRate={85} />);

    expect(screen.getByText("Total Sent")).toBeInTheDocument();
    expect(screen.getByText("Delivered")).toBeInTheDocument();
    expect(screen.getByText("Failed")).toBeInTheDocument();
    expect(screen.getByText("Success Rate")).toBeInTheDocument();
  });

  it("displays total count with locale formatting", () => {
    render(<EmailStats total={1000} sent={850} failed={150} successRate={85} />);

    expect(screen.getByText("1,000")).toBeInTheDocument();
  });

  it("displays sent count with locale formatting", () => {
    render(<EmailStats total={5000} sent={4500} failed={500} successRate={90} />);

    expect(screen.getByText("4,500")).toBeInTheDocument();
  });

  it("displays failed count with locale formatting", () => {
    render(<EmailStats total={10000} sent={9500} failed={500} successRate={95} />);

    expect(screen.getByText("500")).toBeInTheDocument();
  });

  it("displays success rate as percentage", () => {
    render(<EmailStats total={100} sent={95} failed={5} successRate={95} />);

    expect(screen.getByText("95%")).toBeInTheDocument();
  });

  it("handles zero values correctly", () => {
    render(<EmailStats total={0} sent={0} failed={0} successRate={0} />);

    expect(screen.getAllByText("0")).toHaveLength(3);
    expect(screen.getByText("0%")).toBeInTheDocument();
  });

  it("handles large numbers with proper locale formatting", () => {
    render(<EmailStats total={1000000} sent={950000} failed={50000} successRate={95} />);

    expect(screen.getByText("1,000,000")).toBeInTheDocument();
    expect(screen.getByText("950,000")).toBeInTheDocument();
    expect(screen.getByText("50,000")).toBeInTheDocument();
  });

  it("displays 100% success rate correctly", () => {
    render(<EmailStats total={100} sent={100} failed={0} successRate={100} />);

    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("applies correct CSS classes to stat cards", () => {
    const { container } = render(
      <EmailStats total={100} sent={85} failed={15} successRate={85} />
    );

    const grid = container.querySelector(".grid");
    expect(grid).toHaveClass("grid-cols-2");
    expect(grid).toHaveClass("lg:grid-cols-4");
    expect(grid).toHaveClass("gap-4");
  });

  it("renders Mail, CheckCircle, AlertTriangle, and Clock icons", () => {
    const { container } = render(
      <EmailStats total={100} sent={85} failed={15} successRate={85} />
    );

    const svgs = container.querySelectorAll("svg");
    expect(svgs.length).toBe(4);
  });

  it("applies correct icon background colors", () => {
    const { container } = render(
      <EmailStats total={100} sent={85} failed={15} successRate={85} />
    );

    const iconContainers = container.querySelectorAll(".flex.h-12.w-12");
    expect(iconContainers[0]).toHaveClass("bg-secondary");
    expect(iconContainers[1]).toHaveClass("bg-success/10");
    expect(iconContainers[2]).toHaveClass("bg-destructive/10");
    expect(iconContainers[3]).toHaveClass("bg-success/10");
  });

  it("applies correct text colors to icons", () => {
    const { container } = render(
      <EmailStats total={100} sent={85} failed={15} successRate={85} />
    );

    const icons = container.querySelectorAll(".h-6.w-6");
    expect(icons[0]).toHaveClass("text-foreground");
    expect(icons[1]).toHaveClass("text-success");
    expect(icons[2]).toHaveClass("text-destructive");
    expect(icons[3]).toHaveClass("text-success");
  });

  it("renders stat values with correct typography", () => {
    const { container } = render(
      <EmailStats total={1500} sent={1275} failed={225} successRate={85} />
    );

    const values = container.querySelectorAll(".text-4xl.font-semibold");
    expect(values.length).toBe(4);
    expect(values[0]).toHaveTextContent("1,500");
    expect(values[1]).toHaveTextContent("1,275");
    expect(values[2]).toHaveTextContent("225");
    expect(values[3]).toHaveTextContent("85%");
  });

  it("renders each card with border and rounded corners", () => {
    const { container } = render(
      <EmailStats total={100} sent={85} failed={15} successRate={85} />
    );

    const cards = container.querySelectorAll(".rounded-xl.border.border-border.bg-card");
    expect(cards.length).toBe(4);
  });

  it("handles decimal success rates", () => {
    render(<EmailStats total={1000} sent={857} failed={143} successRate={85.7} />);

    expect(screen.getByText("85.7%")).toBeInTheDocument();
  });

  it("displays all stats with consistent padding", () => {
    const { container } = render(
      <EmailStats total={100} sent={85} failed={15} successRate={85} />
    );

    const cards = container.querySelectorAll(".p-6");
    expect(cards.length).toBe(4);
  });

  it("renders labels with muted foreground text", () => {
    const { container } = render(
      <EmailStats total={100} sent={85} failed={15} successRate={85} />
    );

    const labels = container.querySelectorAll(".text-sm.text-muted-foreground");
    expect(labels.length).toBe(4);
  });

  it("maps all items with correct order", () => {
    render(<EmailStats total={100} sent={85} failed={15} successRate={85} />);

    const labels = ["Total Sent", "Delivered", "Failed", "Success Rate"];
    labels.forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });
});
