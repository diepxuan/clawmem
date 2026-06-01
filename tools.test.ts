import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createTools } from "./tools.js";
import type { ClawMemConfig } from "./api.js";

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
  apiBaseUrl: "http://127.0.0.1:7438",
  tokenBudget: 800,
  profile: "balanced",
  enableTools: true,
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
// Test: memory_search (standard)
// =============================================================================

describe("memory_search tool (standard)", () => {
  const tools = createTools(mockConfig, mockLogger);
  const searchTool = tools.find((t) => t.name === "memory_search")!;

  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { vi.restoreAllMocks(); });

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

  it("respects corpus=sessions parameter", async () => {
    mockFetch(200, {
      sessions: [
        { started_at: "2026-06-01T09:00:00Z", session_id: "abc12345def", prompt_count: 12 },
      ],
    });

    const result = await searchTool.execute("call-4", { query: "test", corpus: "sessions" });

    expect(result.content[0].text).toContain("Recent sessions:");
    expect(result.content[0].text).toContain("abc12345");
  });

  it("respects mode, collection, limit, and compact params", async () => {
    mockFetch(200, { count: 1, query: "test", results: [{ title: "One", score: 1.0 }] });

    await searchTool.execute("call-5", {
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
    await searchTool.execute("call-6", { query: "test" });
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
// Test: memory_get (standard)
// =============================================================================

describe("memory_get tool (standard)", () => {
  const tools = createTools(mockConfig, mockLogger);
  const getTool = tools.find((t) => t.name === "memory_get")!;

  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { vi.restoreAllMocks(); });

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

  it("supports line-range slicing (from + lines)", async () => {
    mockFetch(200, {
      docid: "abc123",
      title: "Big doc",
      path: "big.md",
      collection: "notes",
      modifiedAt: "2026-06-01T10:00:00Z",
      body: "line1\nline2\nline3\nline4\nline5",
    });

    const result = await getTool.execute("call-2", { docid: "abc123", from: 2, lines: 3 });

    expect(result.content[0].text).toContain("line2");
    expect(result.content[0].text).toContain("line3");
    expect(result.content[0].text).toContain("line4");
    expect(result.content[0].text).not.toContain("line1");
    expect(result.content[0].text).not.toContain("line5");
  });

  it("returns not-found message when docid invalid", async () => {
    mockFetch(404, { error: "Document not found" });
    const result = await getTool.execute("call-3", { docid: "zzzzzz" });
    expect(result.content[0].text).toBe("Document not found: zzzzzz");
  });
});

// =============================================================================
// Test: memory_recall (standard)
// =============================================================================

describe("memory_recall tool (standard)", () => {
  const tools = createTools(mockConfig, mockLogger);
  const recallTool = tools.find((t) => t.name === "memory_recall")!;

  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { vi.restoreAllMocks(); });

  it("returns merged context on success", async () => {
    mockFetch(200, {
      results: [
        { title: "Memo A", body: "Content A" },
        { title: "Memo B", body: "Content B" },
      ],
    });

    const result = await recallTool.execute("call-1", { query: "recall test" });

    expect(result.content[0].text).toContain("Recalled 2 memories");
    expect(result.content[0].text).toContain("## Memo A");
    expect(result.content[0].text).toContain("Content A");
    expect(result.content[0].text).toContain("## Memo B");
    expect(result.content[0].text).toContain("Content B");
  });

  it("returns empty when no results", async () => {
    mockFetch(200, { results: [] });
    const result = await recallTool.execute("call-2", { query: "nothing" });
    expect(result.content[0].text).toBe("No relevant memories recalled.");
  });
});

// =============================================================================
// Test: memory_store (standard)
// =============================================================================

describe("memory_store tool (standard)", () => {
  const tools = createTools(mockConfig, mockLogger);
  const storeTool = tools.find((t) => t.name === "memory_store")!;

  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { vi.restoreAllMocks(); });

  it("stores memory and returns docid", async () => {
    mockFetch(200, { docid: "new123", path: "memory/new.md" });

    const result = await storeTool.execute("call-1", {
      text: "Important fact to remember",
      collection: "decisions",
      title: "Decision 1",
    });

    expect(result.content[0].text).toContain("Memory stored");
    expect(result.details).toEqual({ docid: "new123", path: "memory/new.md" });
    expect(fetch).toHaveBeenCalledWith(
      "http://127.0.0.1:7438/documents",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          body: "Important fact to remember",
          collection: "decisions",
          title: "Decision 1",
        }),
      }),
    );
  });

  it("uses default collection when not specified", async () => {
    mockFetch(200, { docid: "ok" });
    await storeTool.execute("call-2", { text: "A fact" });
    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          body: "A fact",
          collection: "memory",
          title: undefined,
        }),
      }),
    );
  });

  it("returns error on failure", async () => {
    mockFetch(500, { error: "internal error" });
    const result = await storeTool.execute("call-3", { text: "fail" });
    expect(result.content[0].text).toContain("Failed to store memory");
  });
});

// =============================================================================
// Test: legacy clawmem_* tools (backward compatibility)
// =============================================================================

describe("clawmem_search tool (legacy)", () => {
  const tools = createTools(mockConfig, mockLogger);
  const searchTool = tools.find((t) => t.name === "clawmem_search")!;

  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { vi.restoreAllMocks(); });

  it("returns formatted results on successful search", async () => {
    mockFetch(200, {
      count: 2,
      query: "test query",
      mode: "auto",
      results: [
        { contentType: "note", title: "Meeting notes", score: 0.95, snippet: "Discussed Q3 goals" },
      ],
    });

    const result = await searchTool.execute("call-1", { query: "test query" });

    expect(result.content[0].text).toContain("Found 2 results");
    expect(result.content[0].text).toContain("Meeting notes");
    expect(result.details).toEqual({ count: 2, query: "test query", mode: "auto" });
  });

  it("handles API unreachable", async () => {
    mockFetchError(new Error("ECONNREFUSED"));
    const result = await searchTool.execute("call-2", { query: "anything" });
    expect(result.content[0].text).toContain("Search failed");
  });
});

describe("clawmem_get tool (legacy)", () => {
  const tools = createTools(mockConfig, mockLogger);
  const getTool = tools.find((t) => t.name === "clawmem_get")!;

  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { vi.restoreAllMocks(); });

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
    expect(result.details).toEqual({ docid: "abc123", path: "projects/plan.md" });
  });

  it("handles API unreachable", async () => {
    mockFetch(404, { error: "Document not found" });
    const result = await getTool.execute("call-2", { docid: "zzzzzz" });
    expect(result.content[0].text).toBe("Document not found: zzzzzz");
  });
});

describe("clawmem_session_log tool (legacy)", () => {
  const tools = createTools(mockConfig, mockLogger);
  const logTool = tools.find((t) => t.name === "clawmem_session_log")!;

  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { vi.restoreAllMocks(); });

  it("returns formatted session list on success", async () => {
    mockFetch(200, {
      sessions: [
        { started_at: "2026-06-01T09:00:00Z", session_id: "abc12345def", prompt_count: 12 },
      ],
    });

    const result = await logTool.execute("call-1", { limit: 1 });

    expect(result.content[0].text).toContain("Recent sessions:");
    expect(result.content[0].text).toContain("abc12345");
    expect(result.content[0].text).toContain("12 prompts");
  });

  it("handles API unreachable", async () => {
    mockFetchError(new Error("ECONNREFUSED"));
    const result = await logTool.execute("call-2", {});
    expect(result.content[0].text).toContain("Failed to retrieve sessions");
  });
});

describe("clawmem_timeline tool (legacy)", () => {
  const tools = createTools(mockConfig, mockLogger);
  const timelineTool = tools.find((t) => t.name === "clawmem_timeline")!;

  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { vi.restoreAllMocks(); });

  it("returns formatted timeline with before/after entries", async () => {
    mockFetch(200, {
      anchor: { title: "Current doc", modifiedAt: "2026-06-01T12:00:00Z" },
      before: [{ title: "Previous", modifiedAt: "2026-06-01T11:00:00Z", collection: "notes" }],
      after: [{ title: "Next", modifiedAt: "2026-06-01T13:00:00Z", collection: "notes" }],
    });

    const result = await timelineTool.execute("call-1", { docid: "abc123" });

    expect(result.content[0].text).toContain("**Before:**");
    expect(result.content[0].text).toContain("Previous");
    expect(result.content[0].text).toContain("**→ Current doc**");
    expect(result.content[0].text).toContain("**After:**");
    expect(result.content[0].text).toContain("Next");
  });

  it("passes before/after/same_collection query params", async () => {
    mockFetch(200, { anchor: {}, before: [], after: [] });
    await timelineTool.execute("call-2", {
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

describe("clawmem_similar tool (legacy)", () => {
  const tools = createTools(mockConfig, mockLogger);
  const similarTool = tools.find((t) => t.name === "clawmem_similar")!;

  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { vi.restoreAllMocks(); });

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
  });

  it("handles API unreachable", async () => {
    mockFetchError(new Error("ECONNREFUSED"));
    const result = await similarTool.execute("call-2", { docid: "abc123" });
    expect(result.content[0].text).toContain("Similar search failed");
  });
});

// =============================================================================
// Test: createTools returns correct tool set
// =============================================================================

describe("createTools", () => {
  it("returns all tools by default (standard + legacy)", () => {
    const tools = createTools(mockConfig, mockLogger);
    expect(tools).toHaveLength(9);
    expect(tools.map((t) => t.name)).toEqual([
      "memory_search",
      "memory_get",
      "memory_recall",
      "memory_store",
      "clawmem_search",
      "clawmem_get",
      "clawmem_session_log",
      "clawmem_timeline",
      "clawmem_similar",
    ]);
  });

  it("returns only standard tools when includeLegacy=false", () => {
    const tools = createTools(mockConfig, mockLogger, {
      includeStandard: true,
      includeLegacy: false,
    });
    expect(tools).toHaveLength(4);
    expect(tools.map((t) => t.name)).toEqual([
      "memory_search",
      "memory_get",
      "memory_recall",
      "memory_store",
    ]);
  });

  it("returns only legacy tools when includeStandard=false", () => {
    const tools = createTools(mockConfig, mockLogger, {
      includeStandard: false,
      includeLegacy: true,
    });
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
