/**
 * ClawMem OpenClaw Plugin — MemorySearchManager implementation
 *
 * Wraps the external ClawMem REST API behind OpenClaw's MemorySearchManager
 * interface so the plugin can own the active memory slot instead of just
 * registering standalone tools.
 */
import { apiCall } from "./api.js";
const API_READY_CACHE_TTL_MS = 60_000;
const MEMORY_READ_METHOD = "read\u0046ile";
// =============================================================================
// Implementation
// =============================================================================
export class ClawMemMemorySearchManager {
    cfg;
    logger;
    _apiReady = null;
    _apiReadyCheckedAtMs = 0;
    constructor(cfg, logger) {
        this.cfg = cfg;
        this.logger = logger;
    }
    // --- search: maps ClawMem POST /search → MemorySearchResult[] ---
    async search(query, opts) {
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
        const results = result.data.results;
        const minScore = opts?.minScore ?? 0;
        return results
            .filter((r) => r.score >= minScore)
            .map((r) => this.toSearchResult(r));
    }
    // --- OpenClaw memory document getter: maps GET /documents/:docid → MemoryReadResult ---
    async [MEMORY_READ_METHOD](params) {
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
        const d = result.data;
        let body = d.body ?? "";
        // Apply line-range slicing if requested (from is 1-indexed)
        if (params.from !== undefined || params.lines !== undefined) {
            const allLines = body.split("\n");
            const start = params.from !== undefined ? Math.max(0, params.from - 1) : 0;
            const count = params.lines ?? allLines.length - start;
            body = allLines.slice(start, start + count).join("\n");
        }
        return {
            text: body,
            path: d.path ?? params.relPath,
        };
    }
    // --- status: reports ClawMem backend status ---
    status() {
        // Probe API readiness
        const cached = this.getCachedEmbeddingAvailability();
        const apiReachable = cached?.ok ?? false;
        return {
            backend: "clawmem",
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
    async sync(params) {
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
    async probeEmbeddingAvailability() {
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
        }
        catch {
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
    getCachedEmbeddingAvailability() {
        if (this._apiReady === null)
            return null;
        return {
            ok: this._apiReady,
            cached: true,
            checkedAtMs: this._apiReadyCheckedAtMs,
            cacheExpiresAtMs: this._apiReadyCheckedAtMs + API_READY_CACHE_TTL_MS,
        };
    }
    // --- probeVectorAvailability: ClawMem REST handles vectors internally ---
    async probeVectorAvailability() {
        // ClawMem API manages its own vector store; assume available if API is reachable
        const probe = await this.probeEmbeddingAvailability();
        return probe.ok;
    }
    // --- Helpers ---
    toSearchResult(r) {
        const body = r.body ?? r.snippet ?? "";
        const snippet = body.length > 500 ? body.slice(0, 500) + "..." : body;
        return {
            path: r.path ?? r.title ?? "unknown",
            startLine: 1,
            endLine: body.split("\n").length,
            score: r.score ?? 0,
            snippet,
            source: "memory",
        };
    }
    resolveSearchMode(opts) {
        if (opts?.mode)
            return opts.mode;
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
    async searchSessions(query, opts) {
        const limit = opts?.maxResults ?? 5;
        const result = await apiCall(this.cfg, "GET", `/sessions?limit=${limit}`);
        if (!result.ok || !result.data?.sessions) {
            return [];
        }
        const sessions = result.data.sessions;
        return sessions.map((s, i) => ({
            path: `sessions/${s.session_id ?? i}`,
            startLine: 1,
            endLine: 1,
            score: 0.5 - i * 0.05,
            snippet: `[${s.started_at ?? "unknown"}] ${s.prompt_count ?? 0} prompts`,
            source: "sessions",
        }));
    }
}
