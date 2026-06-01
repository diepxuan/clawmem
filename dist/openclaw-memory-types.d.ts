/**
 * ClawMem OpenClaw Plugin — OpenClaw memory type shims
 *
 * Local copies of OpenClaw memory type definitions so the plugin can
 * type-check against the memory plugin interface without importing
 * OpenClaw internals.
 *
 * Source: openclaw/dist/memory-state-*.d.ts
 */
export type MemorySource = "memory" | "sessions";
export type MemorySearchResult = {
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
export type MemoryReadResult = {
    text: string;
    path: string;
    truncated?: boolean;
    from?: number;
    lines?: number;
    nextFrom?: number;
};
export type MemoryProviderStatus = {
    backend: "builtin" | "qmd" | "clawmem";
    provider: string;
    model?: string;
    requestedProvider?: string;
    files?: number;
    chunks?: number;
    dirty?: boolean;
    workspaceDir?: string;
    dbPath?: string;
    extraPaths?: string[];
    sources?: MemorySource[];
    sourceCounts?: Array<{
        source: MemorySource;
        files: number;
        chunks: number;
    }>;
    cache?: {
        enabled: boolean;
        entries?: number;
        maxEntries?: number;
    };
    fts?: {
        enabled: boolean;
        available: boolean;
        error?: string;
    };
    fallback?: {
        from: string;
        reason?: string;
    };
    vector?: {
        enabled: boolean;
        storeAvailable?: boolean;
        semanticAvailable?: boolean;
        available?: boolean;
        extensionPath?: string;
        loadError?: string;
        dims?: number;
    };
    batch?: {
        enabled: boolean;
        failures: number;
        limit: number;
        wait: boolean;
        concurrency: number;
        pollIntervalMs: number;
        timeoutMs: number;
        lastError?: string;
        lastProvider?: string;
    };
    custom?: Record<string, unknown>;
};
export type MemoryEmbeddingProbeResult = {
    ok: boolean;
    error?: string;
    checked?: boolean;
    cached?: boolean;
    checkedAtMs?: number;
    cacheExpiresAtMs?: number;
};
export type MemorySyncProgressUpdate = {
    completed: number;
    total: number;
    label?: string;
};
export type MemorySearchRuntimeDebug = {
    backend: "builtin" | "qmd" | "clawmem";
    configuredMode?: string;
    effectiveMode?: string;
    fallback?: string;
};
export interface MemorySearchManager {
    search(query: string, opts?: {
        maxResults?: number;
        minScore?: number;
        sessionKey?: string;
        qmdSearchModeOverride?: "query" | "search" | "vsearch";
        onDebug?: (debug: MemorySearchRuntimeDebug) => void;
        sources?: MemorySource[];
    }): Promise<MemorySearchResult[]>;
    readFile(params: {
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
    probeVectorStoreAvailability?(): Promise<boolean>;
    probeVectorAvailability(): Promise<boolean>;
    close?(): Promise<void>;
}
export type MemoryRuntimeQmdConfig = {
    command?: string;
};
export type MemoryRuntimeBackendConfig = {
    backend: "builtin";
} | {
    backend: "qmd";
    qmd?: MemoryRuntimeQmdConfig;
};
export interface MemoryPluginRuntime {
    getMemorySearchManager(params: {
        cfg: unknown;
        agentId: string;
        purpose?: "default" | "status" | "cli";
    }): Promise<{
        manager: MemorySearchManager | null;
        error?: string;
    }>;
    resolveMemoryBackendConfig(params: {
        cfg: unknown;
        agentId: string;
    }): MemoryRuntimeBackendConfig;
    closeMemorySearchManager?(params: {
        cfg: unknown;
        agentId: string;
    }): Promise<void>;
    closeAllMemorySearchManagers?(): Promise<void>;
}
