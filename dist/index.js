/**
 * ClawMem OpenClaw Plugin — Main entry point
 *
 * Uses defineToolPlugin (OpenClaw plugin SDK) so `openclaw plugins build`
 * can extract metadata. Overrides register() to also:
 * - Own the active memory slot via registerMemoryCapability
 * - Register a corpus supplement (memory_search corpus=all)
 * - Run API readiness probing at startup
 */
import { Type } from "typebox";
import { defineToolPlugin } from "openclaw/plugin-sdk/tool-plugin";
import { apiCall, normalizeApiBaseUrl, resolveApiToken, waitForApiReady, } from "./api.js";
import { createTools } from "./tools.js";
import { ClawMemMemorySearchManager } from "./manager.js";
// =============================================================================
// Config schema (TypeBox) — defines the JSON schema for plugin config
// =============================================================================
const configSchema = Type.Object({
    apiBaseUrl: Type.Optional(Type.String({
        description: "Base URL of the running ClawMem REST API",
        default: "http://127.0.0.1:7438",
    })),
    apiToken: Type.Optional(Type.String({ description: "Bearer token for the ClawMem API" })),
    tokenBudget: Type.Optional(Type.Number({ description: "Context token budget hint" })),
    profile: Type.Optional(Type.String({
        description: "Search profile: speed / balanced / deep",
        default: "balanced",
    })),
    enableTools: Type.Optional(Type.Boolean({ description: "Register memory agent tools", default: true })),
    autoRecall: Type.Optional(Type.Boolean({ description: "Auto-recall memory before each turn" })),
    autoCapture: Type.Optional(Type.Boolean({
        description: "Auto-capture important facts after responses",
        default: true,
    })),
    recallMaxChars: Type.Optional(Type.Number({ description: "Max chars for recall query text" })),
    collections: Type.Optional(Type.Array(Type.String(), {
        description: "Collections to index/search (default: all)",
    })),
}, { additionalProperties: false });
// =============================================================================
// Plugin
// =============================================================================
const noopLogger = {
    debug() { },
    info() { },
    warn() { },
    error() { },
};
const STATIC_TOOL_DEFS = createTools({
    apiBaseUrl: "http://127.0.0.1:7438",
    tokenBudget: 800,
    profile: "balanced",
    enableTools: true,
    autoRecall: false,
    autoCapture: true,
    recallMaxChars: 1000,
}, noopLogger, { includeStandard: true, includeLegacy: true });
const clawmemPlugin = defineToolPlugin({
    id: "clawmem",
    name: "ClawMem",
    description: "OpenClaw memory plugin — external ClawMem REST API adapter (full memory provider)",
    activation: { onStartup: true },
    configSchema,
    tools: (tool) => STATIC_TOOL_DEFS.map((toolDef) => tool({
        name: toolDef.name,
        label: toolDef.label,
        description: toolDef.description,
        parameters: toolDef.parameters,
        factory: ({ api, config }) => {
            const logger = api.logger;
            const cfg = buildCfg(config);
            const mgr = getOrCreateManager(cfg, logger);
            if (!cfg.enableTools)
                return null;
            const runtimeTool = createTools(cfg, logger, {
                includeStandard: true,
                includeLegacy: true,
            }).find((t) => t.name === toolDef.name);
            if (!runtimeTool)
                return null;
            void mgr;
            return {
                ...runtimeTool,
                execute: (toolCallId, params) => runtimeTool.execute(toolCallId, params),
            };
        },
    })),
});
const registerToolPlugin = clawmemPlugin.register;
clawmemPlugin.register = (api) => {
    registerToolPlugin(api);
    const pluginCfg = (api.pluginConfig || {});
    const logger = api.logger;
    const cfg = buildCfg(pluginCfg);
    logger.info(`clawmem: plugin registered (kind=memory, api=${cfg.apiBaseUrl}, profile=${cfg.profile}, budget=${cfg.tokenBudget}, autoRecall=${cfg.autoRecall}, autoCapture=${cfg.autoCapture})`);
    // --- 1. Memory capability (owns the memory slot) ---
    const mgr = getOrCreateManager(cfg, logger);
    api.registerMemoryCapability("clawmem", {
        runtime: {
            async getMemorySearchManager(_p) {
                return { manager: mgr };
            },
            resolveMemoryBackendConfig(_p) {
                return { backend: "builtin" };
            },
            async closeMemorySearchManager(_p) {
                _mgr = null;
            },
        },
    });
    // --- 2. Corpus supplement (memory_search corpus=all) ---
    if (typeof api.registerMemoryCorpusSupplement === "function") {
        api.registerMemoryCorpusSupplement("clawmem", {
            async search(p) {
                const r = await apiCall(cfg, "POST", "/search", {
                    query: p.query,
                    mode: "auto",
                    limit: p.maxResults ?? 10,
                    compact: true,
                });
                if (!r.ok || !r.data?.results)
                    return [];
                return r.data.results.map((x) => ({
                    corpus: "clawmem",
                    path: x.path ?? x.title ?? "unknown",
                    title: x.title,
                    kind: x.contentType ?? "note",
                    score: x.score ?? 0,
                    snippet: x.snippet ?? (x.body ?? "").slice(0, 300),
                }));
            },
            async get(p) {
                const r = await apiCall(cfg, "GET", `/documents/${p.lookup}`);
                if (!r.ok)
                    return null;
                const d = r.data;
                const body = d.body ?? "";
                const lines = body.split("\n");
                const from = p.fromLine ?? 1;
                const count = p.lineCount ?? lines.length;
                const sliced = lines.slice(from - 1, from - 1 + count);
                return {
                    corpus: "clawmem",
                    path: d.path ?? p.lookup,
                    title: d.title,
                    kind: d.contentType ?? "note",
                    content: sliced.join("\n"),
                    fromLine: from,
                    lineCount: sliced.length,
                };
            },
        });
    }
    else {
        logger.warn("clawmem: memory corpus supplement API unavailable; skipping corpus=all integration");
    }
    // --- 3. API readiness service ---
    api.registerService({
        id: "clawmem-api-readiness",
        async start(svcCtx) {
            const svcLogger = svcCtx.logger ?? logger;
            const ready = await waitForApiReady(cfg.apiBaseUrl, 3, 500, svcLogger);
            if (ready) {
                svcLogger.info(`clawmem: external API ready at ${cfg.apiBaseUrl}`);
            }
            else {
                svcLogger.warn(`clawmem: external API not reachable at ${cfg.apiBaseUrl}; tools will fail-open`);
            }
        },
        stop() {
            logger.info("clawmem: API readiness service stopped");
        },
    });
};
export default clawmemPlugin;
// =============================================================================
// Helpers
// =============================================================================
const PROFILE_BUDGETS = {
    speed: 400,
    balanced: 800,
    deep: 1200,
};
let _mgr = null;
function buildCfg(raw) {
    const profile = raw.profile || "balanced";
    return {
        apiBaseUrl: normalizeApiBaseUrl(raw.apiBaseUrl),
        apiToken: resolveApiToken(raw.apiToken),
        tokenBudget: raw.tokenBudget ?? PROFILE_BUDGETS[profile] ?? 800,
        profile,
        enableTools: raw.enableTools !== false,
        autoRecall: raw.autoRecall === true,
        autoCapture: raw.autoCapture !== false,
        recallMaxChars: raw.recallMaxChars ?? 1000,
        collections: raw.collections ?? undefined,
    };
}
function getOrCreateManager(cfg, logger) {
    if (!_mgr)
        _mgr = new ClawMemMemorySearchManager(cfg, logger);
    return _mgr;
}
