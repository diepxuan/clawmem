import { describe, it, expect, afterEach, vi } from "vitest";
import { apiCall, type ClawMemConfig } from "./api.js";

const cfg: ClawMemConfig = {
  apiBaseUrl: "http://127.0.0.1:7438",
  tokenBudget: 800,
  profile: "balanced",
  enableTools: true,
};

describe("apiCall", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns an empty object for non-JSON responses", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 204,
      json: async () => {
        throw new SyntaxError("Unexpected end of JSON input");
      },
    } as any);

    const result = await apiCall(cfg, "POST", "/reindex", { force: false });

    expect(result).toEqual({ ok: true, status: 204, data: {} });
  });
});
