/**
 * ClawMem OpenClaw Plugin — MemorySearchManager implementation
 *
 * Wraps the external ClawMem REST API behind OpenClaw's MemorySearchManager
 * interface so the plugin can own the active memory slot instead of just
 * registering standalone tools.
 */
import { type ClawMemConfig, type Logger } from "./api.js";
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
declare const MEMORY_READ_METHOD = "readFile";
export interface ClawMemSearchManager {
    search(query: string, opts?: {
        maxResults?: number;
        minScore?: number;
        sessionKey?: string;
        mode?: ClawMemSearchMode;
        qmdSearchModeOverride?: "query" | "search" | "vsearch";
        sources?: MemorySource[];
    }): Promise<MemorySearchResult[]>;
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
export declare class ClawMemMemorySearchManager implements ClawMemSearchManager {
    private cfg;
    private logger;
    private _apiReady;
    private _apiReadyCheckedAtMs;
    constructor(cfg: ClawMemConfig, logger: Logger);
    search(query: string, opts?: {
        maxResults?: number;
        minScore?: number;
        sessionKey?: string;
        mode?: ClawMemSearchMode;
        qmdSearchModeOverride?: "query" | "search" | "vsearch";
        sources?: MemorySource[];
    }): Promise<MemorySearchResult[]>;
    [MEMORY_READ_METHOD](params: {
        relPath: string;
        from?: number;
        lines?: number;
    }): Promise<MemoryReadResult>;
    status(): MemoryProviderStatus;
    sync(params?: {
        reason?: string;
        force?: boolean;
        sessionFiles?: string[];
        progress?: (update: MemorySyncProgressUpdate) => void;
    }): Promise<void>;
    probeEmbeddingAvailability(): Promise<MemoryEmbeddingProbeResult>;
    getCachedEmbeddingAvailability(): MemoryEmbeddingProbeResult | null;
    probeVectorAvailability(): Promise<boolean>;
    private toSearchResult;
    private resolveSearchMode;
    private searchSessions;
}
export {};
