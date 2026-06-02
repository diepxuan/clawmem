import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHermesClawMemTools } from "./bridge.js";
import type { ClawMemConfig } from "../api.js";

const cfg: ClawMemConfig = {
  apiBaseUrl: "http://127.0.0.1:7438",
  tokenBudget: 800,
  profile: "balanced",
  enableTools: true,
};

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function getTool(name: string) {
  const tool = createHermesClawMemTools(cfg).find((t) => t.name === name);
  if (!tool) throw new Error(`missing tool: ${name}`);
  return tool;
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("createHermesClawMemTools", () => {
  it("registers 5 Hermes-compatible tools", () => {
    const names = createHermesClawMemTools(cfg).map((t) => t.name);
    expect(names).toEqual([
      "clawmem_search",
      "clawmem_get",
      "clawmem_store",
      "clawmem_session_log",
      "clawmem_similar",
    ]);
  });

  it("clawmem_search returns formatted results", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
      count: 1,
      query: "release",
      mode: "hybrid",
      results: [{
        title: "Release notes",
        path: "docs/release.md",
        contentType: "note",
        score: 0.91,
        snippet: "0.0.2 Hermes integration",
      }],
    }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await getTool("clawmem_search").execute({ query: "release", mode: "hybrid" });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:7438/search",
      expect.objectContaining({ method: "POST" }),
    );
    expect(result.content[0].text).toContain("Found 1 results");
    expect(result.content[0].text).toContain("0.0.2 Hermes integration");
    expect(result.details).toEqual({ count: 1, query: "release", mode: "hybrid" });
  });

  it("clawmem_search returns empty message when no results", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ count: 0, results: [] })));

    const result = await getTool("clawmem_search").execute({ query: "missing" });

    expect(result.content[0].text).toBe("No relevant memories found.");
    expect(result.details).toEqual({ count: 0 });
  });

  it("clawmem_get returns a document", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({
      docid: "abc123",
      path: "notes/a.md",
      title: "Note A",
      collection: "memory",
      modifiedAt: "2026-06-02",
      body: "Full body",
    })));

    const result = await getTool("clawmem_get").execute({ docid: "abc123" });

    expect(result.content[0].text).toContain("# Note A");
    expect(result.content[0].text).toContain("Full body");
    expect(result.details).toEqual({ docid: "abc123", path: "notes/a.md" });
  });

  it("clawmem_store stores a memory", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ docid: "def456", path: "memory/def456.md" }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await getTool("clawmem_store").execute({
      text: "Remember this",
      collection: "memory",
      title: "Fact",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:7438/documents",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ body: "Remember this", collection: "memory", title: "Fact" }),
      }),
    );
    expect(result.content[0].text).toBe("Memory stored: def456");
    expect(result.details).toEqual({ docid: "def456", path: "memory/def456.md" });
  });

  it("clawmem_session_log returns recent sessions", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({
      sessions: [{ session_id: "1234567890abcdef", started_at: "2026-06-02", prompt_count: 3 }],
    })));

    const result = await getTool("clawmem_session_log").execute({ limit: 1 });

    expect(result.content[0].text).toContain("Recent sessions");
    expect(result.content[0].text).toContain("12345678");
    expect(result.details).toEqual({ count: 1 });
  });

  it("clawmem_similar returns similar documents", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({
      similar: [{ title: "Similar note", path: "notes/s.md", score: 0.82 }],
    })));

    const result = await getTool("clawmem_similar").execute({ docid: "abc123", limit: 1 });

    expect(result.content[0].text).toContain("Similar documents");
    expect(result.content[0].text).toContain("Similar note");
    expect(result.details).toEqual({ count: 1 });
  });

  it("tools fail open when API is unreachable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("connection refused")));

    const result = await getTool("clawmem_search").execute({ query: "anything" });

    expect(result.content[0].text).toContain("Search failed");
    expect(result.content[0].text).toContain("ClawMem API unreachable");
  });

  it("passes bearer token when configured", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ count: 0, results: [] }));
    vi.stubGlobal("fetch", fetchMock);
    const secureCfg = { ...cfg, apiToken: "secret-token" };
    const tool = createHermesClawMemTools(secureCfg).find((t) => t.name === "clawmem_search");

    await tool?.execute({ query: "token" });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:7438/search",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer secret-token" }),
      }),
    );
  });
});
