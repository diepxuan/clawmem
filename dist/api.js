export function normalizeApiBaseUrl(value) {
    const raw = typeof value === "string" ? value.trim() : "";
    return (raw || "http://127.0.0.1:7438").replace(/\/+$/, "");
}
export function resolveApiToken(value) {
    if (typeof value === "string" && value.trim())
        return value.trim();
    return undefined;
}
export async function waitForApiReady(apiBaseUrl, maxAttempts = 10, intervalMs = 500, logger) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            const resp = await fetch(apiBaseUrl, { signal: AbortSignal.timeout(1000) });
            logger?.debug?.(`clawmem: API ready at ${apiBaseUrl} (HTTP ${resp.status}, attempt ${attempt})`);
            return true;
        }
        catch {
            logger?.debug?.(`clawmem: API not ready at ${apiBaseUrl} (attempt ${attempt}/${maxAttempts})`);
        }
        if (attempt < maxAttempts)
            await new Promise((r) => setTimeout(r, intervalMs));
    }
    logger?.warn?.(`clawmem: API did not become ready at ${apiBaseUrl}`);
    return false;
}
export async function apiCall(cfg, method, path, body) {
    const url = `${cfg.apiBaseUrl}${path}`;
    const headers = { "Content-Type": "application/json" };
    if (cfg.apiToken)
        headers.Authorization = `Bearer ${cfg.apiToken}`;
    try {
        const resp = await fetch(url, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
            signal: AbortSignal.timeout(5000),
        });
        let data;
        try {
            data = await resp.json();
        }
        catch {
            data = {};
        }
        return { ok: resp.ok, status: resp.status, data };
    }
    catch (err) {
        return { ok: false, status: 0, data: { error: `ClawMem API unreachable at ${url}: ${String(err)}` } };
    }
}
