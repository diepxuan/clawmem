import {
  normalizeApiBaseUrl,
  resolveApiToken,
  waitForApiReady,
  type ClawMemConfig,
  type Logger,
} from "./api.js";
import { createTools } from "./tools.js";

const PROFILE_BUDGETS: Record<string, number> = {
  speed: 400,
  balanced: 800,
  deep: 1200,
};

const clawmemPlugin = {
  id: "clawmem",
  name: "ClawMem",
  description: "OpenClaw adapter for an external ClawMem REST API",
  version: "0.0.1",
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
    };

    logger.info(
      `clawmem: plugin registered (kind=memory, api=${cfg.apiBaseUrl}, profile=${profile}, budget=${tokenBudget})`,
    );

    api.registerMemoryCapability({
      runtime: {
        async getMemorySearchManager(_params: {
          cfg: unknown;
          agentId: string;
          purpose?: "default" | "status";
        }) {
          return { manager: null };
        },
        resolveMemoryBackendConfig(_params: { cfg: unknown; agentId: string }) {
          return { backend: "builtin" as const };
        },
      },
    });

    if (cfg.enableTools) {
      const tools = createTools(cfg, logger);
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
      logger.info(`clawmem: registered ${tools.length} agent tools`);
    }

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

export default clawmemPlugin;
