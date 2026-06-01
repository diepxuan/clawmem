import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ClawMemMemorySearchManager } from "./manager.js";
import type { ClawMemConfig } from "./api.js";

// =============================================================================
// Test setup
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

function mockFetch(status: number, body: unknown) {
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
// Test: search
// =============================================================================

describe("ClawMemMemorySearchManager.search", () => {
  let manager: ClawMemMemorySearchManager;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new ClawMemMemorySearchManager(mockConfig, mockLogger);
  });
  afterEach(() => { vi.restoreAllMocks(); });

  it("returns MemorySearchResult[] on success", async () => {
    mockFetch(200, {
      count: 2,
      results: [
        {
          title: "Note A",
          path: "notes/a.md",
          body: "Content of note A with details",
          score: 0.95,
          contentType: "note",
        },
        {
          title: "Note B",
          path: "notes/b.md",
          body: "Content of note B",
          score: 0.72,
          contentType: "session",
        },
      ],
    });

    const results = await manager.search("test query", { maxResults: 5 });

    expect(results).toHaveLength(2);
    expect(results[0].path).toBe("notes/a.md");
    expect(results[0].score).toBe(0.95);
    expect(results[0].snippet).toContain("Content of note A");
    expect(results[0].source).toBe("memory");
    expect(results[1].path).toBe("notes/b.md");
  });

  it("returns empty array when no results", async () => {
    mockFetch(200, { count: 0, results: [] });
    const results = await manager.search("nothing");
    expect(results).toEqual([]);
  });

  it("returns empty array on API failure", async () => {
    mockFetch(500, { error: "internal error" });
    const results = await manager.search("anything");
    expect(results).toEqual([]);
  });

  it("filters by minScore", async () => {
    mockFetch(200, {
      count: 3,
      results: [
        { title: "High", path: "h.md", body: "high score", score: 0.9 },
        { title: "Low", path: "l.md", body: "low score", score: 0.3 },
        { title: "Mid", path: "m.md", body: "mid score", score: 0.6 },
      ],
    });

    const results = await manager.search("test", { minScore: 0.5 });

    expect(results).toHaveLength(2);
    expect(results.some((r) => r.path === "h.md")).toBe(true);
    expect(results.some((r) => r.path === "m.md")).toBe(true);
    expect(results.some((r) => r.path === "l.md")).toBe(false);
  });

  it("searches sessions when sources=['sessions']", async () => {
    mockFetch(200, {
      sessions: [
        { started_at: "2026-06-01T09:00:00Z", session_id: "abc12345def", prompt_count: 12 },
      ],
    });

    const results = await manager.search("test", { sources: ["sessions"] });

    expect(results).toHaveLength(1);
    expect(results[0].source).toBe("sessions");
    expect(results[0].path).toContain("sessions/");
  });
});

// =============================================================================
// Test: readFile
// =============================================================================

describe("ClawMemMemorySearchManager.readFile", () => {
  let manager: ClawMemMemorySearchManager;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new ClawMemMemorySearchManager(mockConfig, mockLogger);
  });
  afterEach(() => { vi.restoreAllMocks(); });

  it("returns full document content on success", async () => {
    mockFetch(200, {
      docid: "abc123",
      title: "Project Plan",
      path: "projects/plan.md",
      body: "Line 1\nLine 2\nLine 3",
    });

    const result = await manager.readFile({ relPath: "abc123" });

    expect(result.text).toBe("Line 1\nLine 2\nLine 3");
    expect(result.path).toBe("projects/plan.md");
  });

  it("supports line-range slicing with from + lines", async () => {
    mockFetch(200, {
      docid: "abc123",
      path: "doc.md",
      body: "line1\nline2\nline3\nline4\nline5",
    });

    const result = await manager.readFile({ relPath: "abc123", from: 2, lines: 3 });

    expect(result.text).toBe("line2\nline3\nline4");
  });

  it("returns empty text on API failure", async () => {
    mockFetch(404, { error: "not found" });
    const result = await manager.readFile({ relPath: "zzzzzz" });
    expect(result.text).toBe("");
    expect(result.path).toBe("zzzzzz");
  });
});

// =============================================================================
// Test: status
// =============================================================================

describe("ClawMemMemorySearchManager.status", () => {
  let manager: ClawMemMemorySearchManager;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new ClawMemMemorySearchManager(mockConfig, mockLogger);
  });
  afterEach(() => { vi.restoreAllMocks(); });

  it("returns backend=clawmem status", async () => {
    // First call to probeEmbeddingAvailability sets _apiReady
    mockFetch(200, {});

    const status = await manager.status();

    expect(status.backend).toBe("clawmem");
    expect(status.provider).toBe("clawmem-rest");
    expect(status.dbPath).toBe("http://127.0.0.1:7438");
    expect(status.custom).toHaveProperty("profile", "balanced");
    expect(status.custom).toHaveProperty("tokenBudget", 800);
  });
});

// =============================================================================
// Test: probeEmbeddingAvailability
// =============================================================================

describe("ClawMemMemorySearchManager.probeEmbeddingAvailability", () => {
  let manager: ClawMemMemorySearchManager;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new ClawMemMemorySearchManager(mockConfig, mockLogger);
  });
  afterEach(() => { vi.restoreAllMocks(); });

  it("returns ok=true when API reachable", async () => {
    mockFetch(200, {});
    const result = await manager.probeEmbeddingAvailability();
    expect(result.ok).toBe(true);
    expect(result.checked).toBe(true);
  });

  it("returns ok=false when API unreachable", async () => {
    mockFetchError(new Error("ECONNREFUSED"));
    const result = await manager.probeEmbeddingAvailability();
    expect(result.ok).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("caches result on subsequent calls", async () => {
    mockFetch(200, {});
    await manager.probeEmbeddingAvailability();
    const cached = manager.getCachedEmbeddingAvailability();
    expect(cached).not.toBeNull();
    expect(cached!.ok).toBe(true);
  });
});

// =============================================================================
// Test: probeVectorAvailability
// =============================================================================

describe("ClawMemMemorySearchManager.probeVectorAvailability", () => {
  let manager: ClawMemMemorySearchManager;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new ClawMemMemorySearchManager(mockConfig, mockLogger);
  });
  afterEach(() => { vi.restoreAllMocks(); });

  it("returns true when API is reachable", async () => {
    mockFetch(200, {});
    const available = await manager.probeVectorAvailability();
    expect(available).toBe(true);
  });

  it("returns false when API is unreachable", async () => {
    mockFetchError(new Error("ECONNREFUSED"));
    const available = await manager.probeVectorAvailability();
    expect(available).toBe(false);
  });
});
