export type ClawMemConfig = {
    apiBaseUrl: string;
    apiToken?: string;
    tokenBudget: number;
    profile: string;
    enableTools: boolean;
    autoRecall?: boolean;
    autoCapture?: boolean;
    recallMaxChars?: number;
    collections?: string[];
};
export type Logger = {
    debug?: (msg: string) => void;
    info: (msg: string) => void;
    warn: (msg: string) => void;
    error: (msg: string) => void;
};
export declare function normalizeApiBaseUrl(value: unknown): string;
export declare function resolveApiToken(value: unknown): string | undefined;
export declare function waitForApiReady(apiBaseUrl: string, maxAttempts?: number, intervalMs?: number, logger?: Pick<Logger, "debug" | "warn">): Promise<boolean>;
export declare function apiCall(cfg: ClawMemConfig, method: string, path: string, body?: Record<string, unknown>): Promise<{
    ok: boolean;
    status: number;
    data: any;
}>;
