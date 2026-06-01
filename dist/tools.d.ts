/**
 * ClawMem OpenClaw Plugin — Tool registrations
 *
 * Registers memory tools as OpenClaw agent tools, backed by the external
 * ClawMem REST API.
 *
 * Standard names (OpenClaw-compatible):
 * - memory_search: Unified search (keyword/semantic/hybrid)
 * - memory_get: Get document by docid or path
 * - memory_recall: Recall context for current query
 * - memory_store: Save a new memory
 *
 * Legacy aliases (backward-compatible):
 * - clawmem_search → memory_search
 * - clawmem_get → memory_get
 * - clawmem_session_log → sessions viewer
 * - clawmem_timeline → temporal context
 * - clawmem_similar → similar documents
 */
import { type ClawMemConfig, type Logger } from "./api.js";
type ToolResult = {
    content: Array<{
        type: string;
        text: string;
    }>;
    details?: Record<string, unknown>;
};
export type ToolDef = {
    name: string;
    label: string;
    description: string;
    parameters: Record<string, unknown>;
    execute: (toolCallId: string, params: Record<string, unknown>) => Promise<ToolResult>;
};
export interface ToolSetOptions {
    includeStandard?: boolean;
    includeLegacy?: boolean;
}
export declare function createTools(cfg: ClawMemConfig, logger: Logger, options?: ToolSetOptions): ToolDef[];
export {};
