/**
 * ClawMem OpenClaw Plugin — Main entry point
 *
 * Registers ClawMem as an OpenClaw memory plugin that:
 * 1. Owns the active memory slot (MemorySearchManager + backend config)
 * 2. Registers standard memory tools (memory_search, memory_get, memory_recall, memory_store)
 * 3. Registers legacy ClawMem tools for backward compatibility
 * 4. Registers a corpus supplement so memory_search corpus=all includes ClawMem data
 * 5. Provides API readiness probing at startup
 */

import {
  normalizeApiBaseUrl,
  resolveApiToken,
  waitForApiReady,
  type ClawMemConfig,
  type Logger,
} from "./api.js";
import { createTools, type ToolDef } from "./tools.js";
import { ClawMemMemorySearchManager, type ClawMemSearchManager } from "./manager.js";
import type {
  MemoryPluginRuntime,
  MemoryRuntimeBackendConfig,
  MemorySearchManager,
  MemorySearchResult,
  MemoryProviderStatus,
  MemoryReadResult,
} from "./openclaw-memory-types.js";

// =============================================================================
// OpenClaw memory type shims (local copies to avoid importing openclaw internals)
// =============================================================================

type MemoryCorpusSearchResult = {
  corpus: string;
  path: string;
  title?: string;
  kind?: string;
  score: number;
  snippet: string;
};

type MemoryCorpusGetResult = {
  corpus: string;
  path: string;
  title?: string;
  kind?: string;
  content: string;
  fromLine: number;
  lineCount: number;
};

// =============================================================================
// Config defaults
// =============================================================================

const PROFILE_BUDGETS: Record<string, number> = {
  speed: 400,
  balanced: 800,
  deep: 1200,
};

// =============================================================================
// Plugin
// =============================================================================

const clawmemPlugin = {
  id: "clawmem",
  name: "ClawMem",
  description: "OpenClaw memory plugin — external ClawMem REST API adapter",
  version: "0.1.0",
  kind: "memory" as const,

  register(api: any) {
    const pluginCfg = (api.pluginConfig || {}) as Record<string, unknown>;
    const profile = (pluginCfg.profile as string) || "balanced";
    const tokenBudget = (pluginCfg.tokenBudget as number) || PROFILE_BUDGETS[profile] || 800;
    const logger = api.logger as Logger;

    const cfg: ClawMemConfig = {
      apiBaseUrl: normalizeApiBaseUrl(pluginCfg.apiBaseUrl),
      apiToken: resolveApiToken(pluginCfg.apiToken),
      tokenBudget,
      profile,
      enableTools: pluginCfg.enableTools !== false,
      autoRecall: pluginCfg.autoRecall === true,
      autoCapture: pluginCfg.autoCapture !== false,
      recallMaxChars: (pluginCfg.recallMaxChars as number) ?? 1000,
      collections: (pluginCfg.collections as string[]) ?? undefined,
    };

    logger.info(
      `clawmem: plugin registered (kind=memory, api=${cfg.apiBaseUrl}, profile=${profile}, budget=${tokenBudget}, autoRecall=${cfg.autoRecall}, autoCapture=${cfg.autoCapture})`,
    );

    // --- 1. Create the memory manager (shared between capability and tools) ---
    let managerInstance: ClawMemMemorySearchManager | null = null;

    const memoryRuntime: MemoryPluginRuntime = {
      async getMemorySearchManager(params: {
        cfg: unknown;
        agentId: string;
        purpose?: "default" | "status" | "cli";
      }) {
        if (!managerInstance) {
          managerInstance = new ClawMemMemorySearchManager(cfg, logger);
        }
        return { manager: managerInstance as unknown as MemorySearchManager };
      },

      resolveMemoryBackendConfig(params: { cfg: unknown; agentId: string }): MemoryRuntimeBackendConfig {
        return { backend: "builtin" as const };
      },

      async closeMemorySearchManager(params: { cfg: unknown; agentId: string }) {
        managerInstance = null;
      },
    };

    // --- 2. Register memory capability (owns the memory slot) ---
    api.registerMemoryCapability("clawmem", {
      runtime: memoryRuntime,
    });

    // --- 3. Register corpus supplement (enables memory_search corpus=all) ---
    api.registerMemoryCorpusSupplement("clawmem", {
      async search(params: { query: string; maxResults?: number; agentSessionKey?: string }) {
        const result = await apiCallShim(cfg, "POST", "/search", {
          query: params.query,
          mode: "auto",
          limit: params.maxResults ?? 10,
          compact: true,
        });

        if (!result.ok || !result.data?.results) return [];

        return result.data.results.map((r: any): MemoryCorpusSearchResult => ({
          corpus: "clawmem",
          path: r.path ?? r.title ?? "unknown",
          title: r.title,
          kind: r.contentType ?? "note",
          score: r.score ?? 0,
          snippet: r.snippet ?? (r.body ?? "").slice(0, 300),
        }));
      },

      async get(params: { lookup: string; fromLine?: number; lineCount?: number; agentSessionKey?: string }) {
        const result = await apiCallShim(cfg, "GET", `/documents/${params.lookup}`);

        if (!result.ok) return null;

        const d = result.data;
        const body = d.body ?? "";

        let fromLine = params.fromLine ?? 1;
        let lineCount = params.lineCount ?? body.split("\n").length;

        if (fromLine > 1 || lineCount < body.split("\n").length) {
          const lines = body.split("\n");
          const sliced = lines.slice(fromLine - 1, fromLine - 1 + lineCount);
          return {
            corpus: "clawmem",
            path: d.path ?? params.lookup,
            title: d.title,
            kind: d.contentType ?? "note",
            content: sliced.join("\n"),
            fromLine,
            lineCount: sliced.length,
          };
        }

        return {
          corpus: "clawmem",
          path: d.path ?? params.lookup,
          title: d.title,
          kind: d.contentType ?? "note",
          content: body,
          fromLine: 1,
          lineCount: body.split("\n").length,
        };
      },
    });

    // --- 4. Register agent tools ---
    if (cfg.enableTools) {
      const tools = createTools(cfg, logger, {
        includeStandard: true,
        includeLegacy: true,
      });
      for (const tool of tools) {
        api.registerTool(
          {
            name: tool.name,
            label: tool.label,
            description: tool.description,
            parameters: tool.parameters,
            async execute(toolCallId: string, params: Record<string, unknown>) {
              return tool.execute(toolCallId, params);
            },
          },
          { name: tool.name },
        );
      }
      logger.info(`clawmem: registered ${tools.length} agent tools (${tools.filter((t) => t.name.startsWith("memory_")).length} standard, ${tools.filter((t) => t.name.startsWith("clawmem_")).length} legacy)`);
    }

    // --- 5. API readiness service ---
    api.registerService({
      id: "clawmem-api-readiness",
      async start(svcCtx: { logger: Logger }) {
        const ready = await waitForApiReady(cfg.apiBaseUrl, 3, 500, svcCtx.logger);
        if (ready) {
          svcCtx.logger.info(`clawmem: external API ready at ${cfg.apiBaseUrl}`);
        } else {
          svcCtx.logger.warn(`clawmem: external API not reachable at ${cfg.apiBaseUrl}; tools will fail-open`);
        }
      },
      stop() {
        logger.info("clawmem: API readiness service stopped");
      },
    });
  },
};

// =============================================================================
// Shim: local apiCall (avoid importing from api.ts in type defs)
// =============================================================================

async function apiCallShim(
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
    const data = await resp.json();
    return { ok: resp.ok, status: resp.status, data };
  } catch (err) {
    return { ok: false, status: 0, data: { error: `ClawMem API unreachable at ${url}: ${String(err)}` } };
  }
}

export default clawmemPlugin;
