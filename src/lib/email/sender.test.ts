import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────────────────
// vi.mock factories are hoisted — no external variables may be referenced inside them.

vi.mock("@/lib/env", () => ({
  env: { EMAIL_FROM: "default@example.com" },
  configuredTransports: new Set(["ses"]),
}));

vi.mock("./transport", () => ({
  sendViaTransport: vi.fn(),
}));

// DB mock: use vi.fn() inline; we'll wire up the implementation in beforeEach.
vi.mock("@/lib/db", () => {
  const mockWhere = vi.fn();
  const mockSet = vi.fn(() => ({ where: mockWhere }));
  const mockUpdate = vi.fn(() => ({ set: mockSet }));
  const mockValues = vi.fn();
  const mockInsert = vi.fn(() => ({ values: mockValues }));
  const mockTransaction = vi.fn();
  return {
    db: {
      transaction: mockTransaction,
      update: mockUpdate,
    },
  };
});

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { sendEmail } from "./sender";
import { sendViaTransport } from "./transport";
import { db } from "@/lib/db";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const baseInput = {
  to: "recipient@example.com",
  subject: "Hello",
  html: "<p>Hello</p>",
  transport: "ses" as const,
  userId: "user-1",
  organizationId: "org-1",
};

describe("sendEmail — from resolution", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Wire up the chainable db.update mock after clearAllMocks resets everything
    const mockWhere = vi.fn().mockResolvedValue(undefined);
    const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
    (db.update as ReturnType<typeof vi.fn>).mockReturnValue({ set: mockSet });

    // Wire up db.transaction to call the callback with a tx object
    const mockTxValues = vi.fn().mockResolvedValue(undefined);
    const mockTxInsert = vi.fn().mockReturnValue({ values: mockTxValues });
    const tx = { insert: mockTxInsert };
    type Tx = typeof tx;
    (db.transaction as ReturnType<typeof vi.fn>).mockImplementation(
      async (cb: (tx: Tx) => Promise<void>) => cb(tx)
    );

    // Default: transport succeeds
    (sendViaTransport as ReturnType<typeof vi.fn>).mockResolvedValue({ messageId: "<msg@example.com>" });
  });

  it("uses input.from when provided, not EMAIL_FROM", async () => {
    const result = await sendEmail({ ...baseInput, from: "alice@x.com" });

    expect(sendViaTransport).toHaveBeenCalledWith(
      "ses",
      expect.objectContaining({ from: "alice@x.com" })
    );
    expect(result.from).toBe("alice@x.com");
  });

  it("falls back to EMAIL_FROM when input.from is omitted", async () => {
    const result = await sendEmail({ ...baseInput });

    expect(sendViaTransport).toHaveBeenCalledWith(
      "ses",
      expect.objectContaining({ from: "default@example.com" })
    );
    expect(result.from).toBe("default@example.com");
  });

  it("falls back to EMAIL_FROM when input.from is whitespace-only", async () => {
    const result = await sendEmail({ ...baseInput, from: "   " });

    expect(sendViaTransport).toHaveBeenCalledWith(
      "ses",
      expect.objectContaining({ from: "default@example.com" })
    );
    expect(result.from).toBe("default@example.com");
  });

  it("returns status 'sent' and the resolved from on success", async () => {
    const result = await sendEmail({ ...baseInput, from: "sender@brand.com" });

    expect(result.status).toBe("sent");
    expect(result.from).toBe("sender@brand.com");
    expect(typeof result.id).toBe("string");
  });

  it("returns status 'failed' and from when transport throws", async () => {
    (sendViaTransport as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("SMTP refused"));

    const result = await sendEmail({ ...baseInput, from: "alice@x.com" });

    expect(result.status).toBe("failed");
    expect(result.from).toBe("alice@x.com");
    expect(result.error).toBe("SMTP refused");
  });
});
