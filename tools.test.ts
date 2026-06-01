import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createTools } from "./tools.js";
import type { ClawMemConfig } from "./shell.js";

// =============================================================================
// Test setup — mock fetch for REST API simulation
// =============================================================================

const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
};

const mockConfig: ClawMemConfig = {
  clawmemBin: "clawmem",
  tokenBudget: 800,
  profile: "balanced",
  enableTools: true,
  servePort: 7438,
  env: {},
};

const defaultCfg = {
  method: "GET",
  headers: { "Content-Type": "application/json" },
  signal: expect.any(AbortSignal),
};

// Helper: mock fetch for a given path and response
function mockFetch(status: number, body: unknown, _method = "GET", _path = "/") {
  const mockResponse = {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
  vi.spyOn(globalThis, "fetch").mockResolvedValue(mockResponse as any);
}

function mockFetchError(error: Error) {
  vi.spyOn(globalThis, "fetch").mockRejectedValue(error);
}

// =============================================================================
// Test: clawmem_search
// =============================================================================

describe("clawmem_search tool", () => {
  const tools = createTools(mockConfig, mockLogger);
  const searchTool = tools.find((t) => t.name === "clawmem_search")!;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns formatted results on successful search", async () => {
    mockFetch(200, {
      count: 2,
      query: "test query",
      mode: "auto",
      results: [
        { contentType: "note", title: "Meeting notes", score: 0.95, snippet: "Discussed Q3 goals" },
        { contentType: "session", title: "Session summary", score: 0.82 },
      ],
    });

    const result = await searchTool.execute("call-1", { query: "test query" });

    expect(result.content[0].text).toContain("Found 2 results");
    expect(result.content[0].text).toContain("Meeting notes");
    expect(result.content[0].text).toContain("score: 0.95");
    expect(result.content[0].text).toContain("Discussed Q3 goals");
    expect(result.details).toEqual({ count: 2, query: "test query", mode: "auto" });
  });

  it("returns empty message when no results", async () => {
    mockFetch(200, { count: 0, query: "nothing", results: [] });

    const result = await searchTool.execute("call-2", { query: "nothing" });

    expect(result.content[0].text).toBe("No relevant memories found.");
    expect(result.details).toEqual({ count: 0 });
  });

  it("returns error message when API unreachable", async () => {
    mockFetchError(new Error("ECONNREFUSED"));

    const result = await searchTool.execute("call-3", { query: "anything" });

    expect(result.content[0].text).toContain("Search failed");
    expect(result.content[0].text).toContain("ECONNREFUSED");
  });

  it("respects mode, collection, limit, and compact params", async () => {
    mockFetch(200, { count: 1, query: "test", results: [{ title: "One", score: 1.0 }] });

    await searchTool.execute("call-4", {
      query: "test",
      mode: "hybrid",
      collection: "decisions",
      limit: 3,
      compact: false,
    });

    expect(fetch).toHaveBeenCalledWith(
      "http://127.0.0.1:7438/search",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          query: "test",
          mode: "hybrid",
          collection: "decisions",
          limit: 3,
          compact: false,
        }),
      }),
    );
  });

  it("uses defaults for optional params", async () => {
    mockFetch(200, { count: 0, results: [] });

    await searchTool.execute("call-5", { query: "test" });

    expect(fetch).toHaveBeenCalledWith(
      "http://127.0.0.1:7438/search",
      expect.objectContaining({
        body: JSON.stringify({
          query: "test",
          mode: "auto",
          collection: undefined,
          limit: 10,
          compact: true,
        }),
      }),
    );
  });
});

// =============================================================================
// Test: clawmem_get
// =============================================================================

describe("clawmem_get tool", () => {
  const tools = createTools(mockConfig, mockLogger);
  const getTool = tools.find((t) => t.name === "clawmem_get")!;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns formatted document content on success", async () => {
    mockFetch(200, {
      docid: "abc123",
      title: "Project Plan",
      path: "projects/plan.md",
      collection: "work",
      modifiedAt: "2026-06-01T10:00:00Z",
      body: "Q2 deliverables include...",
    });

    const result = await getTool.execute("call-1", { docid: "abc123" });

    expect(result.content[0].text).toContain("# Project Plan");
    expect(result.content[0].text).toContain("Collection: work");
    expect(result.content[0].text).toContain("Modified: 2026-06-01T10:00:00Z");
    expect(result.content[0].text).toContain("Q2 deliverables include...");
    expect(result.details).toEqual({ docid: "abc123", path: "projects/plan.md" });
  });

  it("returns not-found message when docid invalid", async () => {
    mockFetch(404, { error: "Document not found" });

    const result = await getTool.execute("call-2", { docid: "zzzzzz" });

    expect(result.content[0].text).toBe("Document not found: zzzzzz");
  });

  it("handles API unreachable", async () => {
    mockFetchError(new Error("socket hang up"));

    const result = await getTool.execute("call-3", { docid: "abc123" });

    expect(result.content[0].text).toContain("Document not found: abc123");
  });
});

// =============================================================================
// Test: clawmem_session_log
// =============================================================================

describe("clawmem_session_log tool", () => {
  const tools = createTools(mockConfig, mockLogger);
  const logTool = tools.find((t) => t.name === "clawmem_session_log")!;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns formatted session list on success", async () => {
    mockFetch(200, {
      sessions: [
        { started_at: "2026-06-01T09:00:00Z", session_id: "abc12345def", prompt_count: 12 },
        { started_at: "2026-05-31T15:00:00Z", session_id: "def67890abc", prompt_count: 5 },
      ],
    });

    const result = await logTool.execute("call-1", { limit: 2 });

    expect(result.content[0].text).toContain("Recent sessions:");
    expect(result.content[0].text).toContain("abc12345");
    expect(result.content[0].text).toContain("12 prompts");
    expect(result.content[0].text).toContain("def67890");
    expect(result.content[0].text).toContain("5 prompts");
  });

  it("returns empty message when no sessions", async () => {
    mockFetch(200, { sessions: [] });

    const result = await logTool.execute("call-2", {});

    expect(result.content[0].text).toBe("No session history found.");
  });

  it("handles API unreachable", async () => {
    mockFetchError(new Error("ECONNREFUSED"));

    const result = await logTool.execute("call-3", {});

    expect(result.content[0].text).toContain("Failed to retrieve sessions");
  });
});

// =============================================================================
// Test: clawmem_timeline
// =============================================================================

describe("clawmem_timeline tool", () => {
  const tools = createTools(mockConfig, mockLogger);
  const timelineTool = tools.find((t) => t.name === "clawmem_timeline")!;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns formatted timeline with before/after entries", async () => {
    mockFetch(200, {
      anchor: { title: "Current doc", modifiedAt: "2026-06-01T12:00:00Z" },
      before: [
        { title: "Previous", modifiedAt: "2026-06-01T11:00:00Z", collection: "notes" },
      ],
      after: [
        { title: "Next", modifiedAt: "2026-06-01T13:00:00Z", collection: "notes" },
      ],
    });

    const result = await timelineTool.execute("call-1", { docid: "abc123" });

    expect(result.content[0].text).toContain("**Before:**");
    expect(result.content[0].text).toContain("Previous");
    expect(result.content[0].text).toContain("**→ Current doc**");
    expect(result.content[0].text).toContain("**After:**");
    expect(result.content[0].text).toContain("Next");
  });

  it("handles timeline failure", async () => {
    mockFetch(500, { error: "internal error" });

    const result = await timelineTool.execute("call-2", { docid: "abc123" });

    expect(result.content[0].text).toContain("Timeline failed");
  });

  it("passes before/after/same_collection query params", async () => {
    mockFetch(200, { anchor: {}, before: [], after: [] });

    await timelineTool.execute("call-3", {
      docid: "abc123",
      before: 3,
      after: 7,
      same_collection: true,
    });

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("before=3&after=7&same_collection=true"),
      expect.any(Object),
    );
  });
});

// =============================================================================
// Test: clawmem_similar
// =============================================================================

describe("clawmem_similar tool", () => {
  const tools = createTools(mockConfig, mockLogger);
  const similarTool = tools.find((t) => t.name === "clawmem_similar")!;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns formatted similar documents list", async () => {
    mockFetch(200, {
      similar: [
        { title: "Similar A", path: "notes/a.md", score: 0.92 },
        { title: "Similar B", path: "notes/b.md", score: 0.87 },
      ],
    });

    const result = await similarTool.execute("call-1", { docid: "abc123" });

    expect(result.content[0].text).toContain("Similar documents:");
    expect(result.content[0].text).toContain("Similar A");
    expect(result.content[0].text).toContain("similarity: 0.92");
    expect(result.content[0].text).toContain("Similar B");
    expect(result.content[0].text).toContain("similarity: 0.87");
  });

  it("returns empty message when no similar docs", async () => {
    mockFetch(200, { similar: [] });

    const result = await similarTool.execute("call-2", { docid: "abc123" });

    expect(result.content[0].text).toBe("No similar documents found.");
  });

  it("handles API unreachable", async () => {
    mockFetchError(new Error("ECONNREFUSED"));

    const result = await similarTool.execute("call-3", { docid: "abc123" });

    expect(result.content[0].text).toContain("Similar search failed");
  });

  it("passes limit as query param", async () => {
    mockFetch(200, { similar: [] });

    await similarTool.execute("call-4", { docid: "abc123", limit: 10 });

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("limit=10"),
      expect.any(Object),
    );
  });

  it("uses default limit of 5", async () => {
    mockFetch(200, { similar: [] });

    await similarTool.execute("call-5", { docid: "abc123" });

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("limit=5"),
      expect.any(Object),
    );
  });
});

// =============================================================================
// Test: createTools returns all 5 tools
// =============================================================================

describe("createTools", () => {
  it("returns exactly 5 tools with expected names", () => {
    const tools = createTools(mockConfig, mockLogger);
    expect(tools).toHaveLength(5);
    expect(tools.map((t) => t.name)).toEqual([
      "clawmem_search",
      "clawmem_get",
      "clawmem_session_log",
      "clawmem_timeline",
      "clawmem_similar",
    ]);
  });

  it("each tool has label and description", () => {
    const tools = createTools(mockConfig, mockLogger);
    for (const tool of tools) {
      expect(tool.label).toBeTruthy();
      expect(tool.description).toBeTruthy();
      expect(tool.parameters).toBeTruthy();
    }
  });
});
