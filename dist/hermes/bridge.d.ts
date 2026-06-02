/**
 * ClawMem — Hermes Agent bridge
 *
 * Exposes 5 ClawMem REST API tools for Hermes Agent consumption.
 * Reuses apiCall from the shared API client — no OpenClaw dependencies.
 *
 * Tools:
 * - clawmem_search   → POST /search
 * - clawmem_get      → GET /documents/:docid
 * - clawmem_store    → POST /documents
 * - clawmem_session_log → GET /sessions
 * - clawmem_similar  → GET /graph/similar/:docid
 */
import { type ClawMemConfig, type Logger } from "../api.js";
export type HermesClawMemToolResult = {
    content: Array<{
        type: "text";
        text: string;
    }>;
    details?: Record<string, unknown>;
};
export type HermesClawMemToolDef = {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
    execute: (params: Record<string, unknown>) => Promise<HermesClawMemToolResult>;
};
export declare function createHermesClawMemTools(cfg: ClawMemConfig, logger?: Logger): HermesClawMemToolDef[];
