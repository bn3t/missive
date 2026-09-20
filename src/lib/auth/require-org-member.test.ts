import { describe, it, expect, vi, beforeEach } from "vitest";
import { APIError } from "better-auth/api";

const getSession = vi.fn();

vi.mock("@/lib/auth/server", () => ({
  auth: { api: { getSession: (...args: unknown[]) => getSession(...args) } },
}));
vi.mock("@/lib/db", () => ({ db: {} }));

import { requireSession } from "./require-org-member";

describe("requireSession", () => {
  beforeEach(() => {
    getSession.mockReset();
  });

  it("returns the session when authenticated", async () => {
    const session = { user: { id: "u1" }, session: {} };
    getSession.mockResolvedValue(session);

    const result = await requireSession(new Headers());

    expect(result).toEqual({ session });
  });

  it("returns 401 when there is no session", async () => {
    getSession.mockResolvedValue(null);

    const result = await requireSession(new Headers());

    expect("response" in result && result.response.status).toBe(401);
  });

  it("returns 401 with the error code when the API key is invalid", async () => {
    getSession.mockRejectedValue(
      new APIError("UNAUTHORIZED", { code: "INVALID_API_KEY", message: "Invalid API key." })
    );

    const result = await requireSession(new Headers({ "x-api-key": "mk_bad" }));

    if (!("response" in result)) throw new Error("expected a response");
    expect(result.response.status).toBe(401);
    expect(await result.response.json()).toEqual({
      error: "Invalid API key.",
      code: "INVALID_API_KEY",
    });
  });

  it("rethrows unexpected errors", async () => {
    getSession.mockRejectedValue(new Error("db down"));

    await expect(requireSession(new Headers())).rejects.toThrow("db down");
  });
});
