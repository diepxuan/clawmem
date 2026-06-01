/**
 * ClawMem OpenClaw Plugin — Main entry point
 *
 * Uses defineToolPlugin (OpenClaw plugin SDK) so `openclaw plugins build`
 * can extract metadata. Overrides register() to also:
 * - Own the active memory slot via registerMemoryCapability
 * - Register a corpus supplement (memory_search corpus=all)
 * - Run API readiness probing at startup
 */
declare const clawmemPlugin: import("openclaw/plugin-sdk/tool-plugin").DefinedToolPluginEntry;
export default clawmemPlugin;
