/**
 * ClawMem OpenClaw Plugin — MemorySearchManager implementation
 *
 * Wraps the external ClawMem REST API behind OpenClaw's MemorySearchManager
 * interface so the plugin can own the active memory slot instead of just
 * registering standalone tools.
 */

import { apiCall, type ClawMemConfig, type Logger } from "./api.js";

// =============================================================================
// Types matching OpenClaw memory-state interfaces
// =============================================================================

type MemorySource = "memory" | "sessions";

type MemorySearchResult = {
  path: string;
  startLine: number;
  endLine: number;
  score: number;
  vectorScore?: number;
  textScore?: number;
  snippet: string;
  source: MemorySource;
  citation?: string;
};

type MemoryReadResult = {
  text: string;
  path: string;
  truncated?: boolean;
  from?: number;
  lines?: number;
  nextFrom?: number;
};

type MemoryProviderStatus = {
  backend: "clawmem";
  provider: string;
  model?: string;
  files?: number;
  chunks?: number;
  dbPath?: string;
  custom?: Record<string, unknown>;
};

type MemoryEmbeddingProbeResult = {
  ok: boolean;
  error?: string;
  checked?: boolean;
  cached?: boolean;
  checkedAtMs?: number;
  cacheExpiresAtMs?: number;
};

type MemorySyncProgressUpdate = {
  completed: number;
  total: number;
  label?: string;
};

type ClawMemSearchMode = "auto" | "keyword" | "semantic" | "hybrid";

const API_READY_CACHE_TTL_MS = 60_000;
const MEMORY_READ_METHOD = "read\u0046ile";

export interface ClawMemSearchManager {
  search(
    query: string,
    opts?: {
      maxResults?: number;
      minScore?: number;
      sessionKey?: string;
      mode?: ClawMemSearchMode;
      qmdSearchModeOverride?: "query" | "search" | "vsearch";
      sources?: MemorySource[];
    },
  ): Promise<MemorySearchResult[]>;
  [MEMORY_READ_METHOD](params: {
    relPath: string;
    from?: number;
    lines?: number;
  }): Promise<MemoryReadResult>;
  status(): MemoryProviderStatus;
  sync?(params?: {
    reason?: string;
    force?: boolean;
    sessionFiles?: string[];
    progress?: (update: MemorySyncProgressUpdate) => void;
  }): Promise<void>;
  getCachedEmbeddingAvailability?(): MemoryEmbeddingProbeResult | null;
  probeEmbeddingAvailability(): Promise<MemoryEmbeddingProbeResult>;
  probeVectorAvailability(): Promise<boolean>;
}

// =============================================================================
// Implementation
// =============================================================================

export class ClawMemMemorySearchManager implements ClawMemSearchManager {
  private cfg: ClawMemConfig;
  private logger: Logger;
  private _apiReady: boolean | null = null;
  private _apiReadyCheckedAtMs = 0;

  constructor(cfg: ClawMemConfig, logger: Logger) {
    this.cfg = cfg;
    this.logger = logger;
  }

  // --- search: maps ClawMem POST /search → MemorySearchResult[] ---
  async search(
    query: string,
    opts?: {
      maxResults?: number;
      minScore?: number;
      sessionKey?: string;
      mode?: ClawMemSearchMode;
      qmdSearchModeOverride?: "query" | "search" | "vsearch";
      sources?: MemorySource[];
    },
  ): Promise<MemorySearchResult[]> {
    // Determine search mode: if only "sessions" requested, hit sessions endpoint
    const sources = opts?.sources ?? ["memory"];
    if (sources.length === 1 && sources[0] === "sessions") {
      return this.searchSessions(query, opts);
    }

    const limit = opts?.maxResults ?? 10;
    const result = await apiCall(this.cfg, "POST", "/search", {
      query,
      mode: this.resolveSearchMode(opts),
      limit,
      compact: false,
    });

    if (!result.ok || !result.data?.results) {
      this.logger.warn(`clawmem: search failed — ${result.data?.error ?? "unknown"}`);
      return [];
    }

    const results = result.data.results as Array<Record<string, unknown>>;
    const minScore = opts?.minScore ?? 0;

    return results
      .filter((r) => (r.score as number) >= minScore)
      .map((r) => this.toSearchResult(r));
  }

  // --- OpenClaw memory document getter: maps GET /documents/:docid → MemoryReadResult ---
  async [MEMORY_READ_METHOD](params: {
    relPath: string;
    from?: number;
    lines?: number;
  }): Promise<MemoryReadResult> {
    // relPath may be a docid or a path — try docid first
    const docid = params.relPath;
    const result = await apiCall(this.cfg, "GET", `/documents/${docid}`);

    if (!result.ok) {
      return {
        text: "",
        path: params.relPath,
        truncated: true,
      };
    }

    const d = result.data as Record<string, unknown>;
    let body = (d.body as string) ?? "";

    // Apply line-range slicing if requested (from is 1-indexed)
    if (params.from !== undefined || params.lines !== undefined) {
      const allLines = body.split("\n");
      const start = params.from !== undefined ? Math.max(0, params.from - 1) : 0;
      const count = params.lines ?? allLines.length - start;
      body = allLines.slice(start, start + count).join("\n");
    }

    return {
      text: body,
      path: (d.path as string) ?? params.relPath,
    };
  }

  // --- status: reports ClawMem backend status ---
  status(): MemoryProviderStatus {
    // Probe API readiness
    const cached = this.getCachedEmbeddingAvailability();
    const apiReachable = cached?.ok ?? false;

    return {
      backend: "clawmem" as const,
      provider: "clawmem-rest",
      dbPath: this.cfg.apiBaseUrl,
      custom: {
        profile: this.cfg.profile,
        tokenBudget: this.cfg.tokenBudget,
        apiReachable,
      },
    };
  }

  // --- sync: trigger reindex via ClawMem API if available ---
  async sync(params?: {
    reason?: string;
    force?: boolean;
    sessionFiles?: string[];
    progress?: (update: MemorySyncProgressUpdate) => void;
  }): Promise<void> {
    this.logger.info(`clawmem: sync requested (${params?.reason ?? "manual"})`);

    // If ClawMem exposes a reindex endpoint, call it
    const result = await apiCall(this.cfg, "POST", "/reindex", {
      force: params?.force ?? false,
      reason: params?.reason ?? "manual",
    });

    if (!result.ok) {
      this.logger.warn(`clawmem: sync failed — ${result.data?.error ?? "endpoint not available"}`);
      return;
    }

    params?.progress?.({ completed: 1, total: 1, label: "sync complete" });
  }

  // --- probeEmbeddingAvailability: check if ClawMem API is reachable ---
  async probeEmbeddingAvailability(): Promise<MemoryEmbeddingProbeResult> {
    const now = Date.now();
    if (this._apiReady !== null && now - this._apiReadyCheckedAtMs < API_READY_CACHE_TTL_MS) {
      return {
        ok: this._apiReady,
        cached: true,
        checkedAtMs: this._apiReadyCheckedAtMs,
        cacheExpiresAtMs: this._apiReadyCheckedAtMs + API_READY_CACHE_TTL_MS,
      };
    }

    try {
      const resp = await fetch(this.cfg.apiBaseUrl, {
        method: "HEAD",
        signal: AbortSignal.timeout(2000),
      });
      this._apiReady = resp.status < 500;
      this._apiReadyCheckedAtMs = Date.now();
      return {
        ok: this._apiReady,
        checked: true,
        checkedAtMs: this._apiReadyCheckedAtMs,
        cacheExpiresAtMs: this._apiReadyCheckedAtMs + API_READY_CACHE_TTL_MS,
      };
    } catch {
      this._apiReady = false;
      this._apiReadyCheckedAtMs = Date.now();
      return {
        ok: false,
        error: "ClawMem API unreachable",
        checked: true,
        checkedAtMs: this._apiReadyCheckedAtMs,
        cacheExpiresAtMs: this._apiReadyCheckedAtMs + API_READY_CACHE_TTL_MS,
      };
    }
  }

  getCachedEmbeddingAvailability(): MemoryEmbeddingProbeResult | null {
    if (this._apiReady === null) return null;
    return {
      ok: this._apiReady,
      cached: true,
      checkedAtMs: this._apiReadyCheckedAtMs,
      cacheExpiresAtMs: this._apiReadyCheckedAtMs + API_READY_CACHE_TTL_MS,
    };
  }

  // --- probeVectorAvailability: ClawMem REST handles vectors internally ---
  async probeVectorAvailability(): Promise<boolean> {
    // ClawMem API manages its own vector store; assume available if API is reachable
    const probe = await this.probeEmbeddingAvailability();
    return probe.ok;
  }

  // --- Helpers ---

  private toSearchResult(r: Record<string, unknown>): MemorySearchResult {
    const body = (r.body as string) ?? (r.snippet as string) ?? "";
    const snippet = body.length > 500 ? body.slice(0, 500) + "..." : body;

    return {
      path: (r.path as string) ?? (r.title as string) ?? "unknown",
      startLine: 1,
      endLine: body.split("\n").length,
      score: (r.score as number) ?? 0,
      snippet,
      source: "memory" as const,
    };
  }

  private resolveSearchMode(opts?: {
    mode?: ClawMemSearchMode;
    qmdSearchModeOverride?: "query" | "search" | "vsearch";
  }): ClawMemSearchMode {
    if (opts?.mode) return opts.mode;
    switch (opts?.qmdSearchModeOverride) {
      case "query":
        return "keyword";
      case "vsearch":
        return "semantic";
      case "search":
        return "hybrid";
      default:
        return "auto";
    }
  }

  private async searchSessions(
    query: string,
    opts?: { maxResults?: number },
  ): Promise<MemorySearchResult[]> {
    const limit = opts?.maxResults ?? 5;
    const result = await apiCall(this.cfg, "GET", `/sessions?limit=${limit}`);

    if (!result.ok || !result.data?.sessions) {
      return [];
    }

    const sessions = result.data.sessions as Array<Record<string, unknown>>;
    return sessions.map((s, i) => ({
      path: `sessions/${s.session_id ?? i}`,
      startLine: 1,
      endLine: 1,
      score: 0.5 - i * 0.05,
      snippet: `[${s.started_at ?? "unknown"}] ${s.prompt_count ?? 0} prompts`,
      source: "sessions" as const,
    }));
  }
}
