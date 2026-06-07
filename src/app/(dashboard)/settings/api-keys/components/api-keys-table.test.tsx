import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiKeysTable } from "./api-keys-table";
import type { ApiKeyRow } from "./api-keys-table";

const baseKey: ApiKeyRow = {
  id: "key-1",
  name: "production",
  start: "mk_prod",
  prefix: "mk_",
  enabled: true,
  expiresAt: null,
  createdAt: new Date("2024-01-15T00:00:00Z"),
  lastRequest: null,
};

describe("ApiKeysTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows 'Loading…' text when loading is true", () => {
    render(<ApiKeysTable keys={[]} loading={true} onDelete={vi.fn()} />);

    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("shows 'No API keys yet' text when keys is empty and loading is false", () => {
    render(<ApiKeysTable keys={[]} loading={false} onDelete={vi.fn()} />);

    expect(
      screen.getByText(/No API keys yet/i)
    ).toBeInTheDocument();
  });

  it("renders a row per key with name and masked prefix", () => {
    const keys: ApiKeyRow[] = [
      { ...baseKey, id: "key-1", name: "production", start: "mk_prod" },
      { ...baseKey, id: "key-2", name: "staging", start: "mk_stag" },
    ];
    render(<ApiKeysTable keys={keys} loading={false} onDelete={vi.fn()} />);

    expect(screen.getByText("production")).toBeInTheDocument();
    expect(screen.getByText("staging")).toBeInTheDocument();
    expect(screen.getByText("mk_prod")).toBeInTheDocument();
    expect(screen.getByText("mk_stag")).toBeInTheDocument();
  });

  it("shows 'Active' badge for an enabled key", () => {
    const keys: ApiKeyRow[] = [{ ...baseKey, enabled: true }];
    render(<ApiKeysTable keys={keys} loading={false} onDelete={vi.fn()} />);

    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("shows 'Disabled' badge for a disabled key", () => {
    const keys: ApiKeyRow[] = [{ ...baseKey, enabled: false }];
    render(<ApiKeysTable keys={keys} loading={false} onDelete={vi.fn()} />);

    expect(screen.getByText("Disabled")).toBeInTheDocument();
  });

  it("shows 'Never' when lastRequest is null", () => {
    const keys: ApiKeyRow[] = [{ ...baseKey, lastRequest: null }];
    render(<ApiKeysTable keys={keys} loading={false} onDelete={vi.fn()} />);

    expect(screen.getByText("Never")).toBeInTheDocument();
  });

  it("calls onDelete with the correct key id when delete button is clicked", async () => {
    const onDelete = vi.fn();
    const keys: ApiKeyRow[] = [{ ...baseKey, id: "key-abc" }];
    render(<ApiKeysTable keys={keys} loading={false} onDelete={onDelete} />);

    const deleteButton = screen.getByRole("button");
    await userEvent.click(deleteButton);

    expect(onDelete).toHaveBeenCalledWith("key-abc");
  });
});
