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

export function normalizeApiBaseUrl(value: unknown): string {
  const raw = typeof value === "string" ? value.trim() : "";
  return (raw || "http://127.0.0.1:7438").replace(/\/+$/, "");
}

export function resolveApiToken(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) return value.trim();
  return process.env.CLAWMEM_API_TOKEN || undefined;
}

export async function waitForApiReady(
  apiBaseUrl: string,
  maxAttempts = 10,
  intervalMs = 500,
  logger?: Pick<Logger, "debug" | "warn">,
): Promise<boolean> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const resp = await fetch(apiBaseUrl, { signal: AbortSignal.timeout(1000) });
      logger?.debug?.(`clawmem: API ready at ${apiBaseUrl} (HTTP ${resp.status}, attempt ${attempt})`);
      return true;
    } catch {
      logger?.debug?.(`clawmem: API not ready at ${apiBaseUrl} (attempt ${attempt}/${maxAttempts})`);
    }
    if (attempt < maxAttempts) await new Promise((r) => setTimeout(r, intervalMs));
  }
  logger?.warn?.(`clawmem: API did not become ready at ${apiBaseUrl}`);
  return false;
}

export async function apiCall(
  cfg: ClawMemConfig,
  method: string,
  path: string,
  body?: Record<string, unknown>,
): Promise<{ ok: boolean; status: number; data: any }> {
  const url = `${cfg.apiBaseUrl}${path}`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (cfg.apiToken) headers.Authorization = `Bearer ${cfg.apiToken}`;

  try {
    const resp = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(5000),
    });
    let data: unknown;
    try {
      data = await resp.json();
    } catch {
      data = {};
    }
    return { ok: resp.ok, status: resp.status, data };
  } catch (err) {
    return { ok: false, status: 0, data: { error: `ClawMem API unreachable at ${url}: ${String(err)}` } };
  }
}
