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
import { apiCall } from "../api.js";
// =============================================================================
// Factory
// =============================================================================
export function createHermesClawMemTools(cfg, logger) {
    return [
        createHermesSearch(cfg, logger),
        createHermesGet(cfg, logger),
        createHermesStore(cfg, logger),
        createHermesSessionLog(cfg, logger),
        createHermesSimilar(cfg, logger),
    ];
}
// =============================================================================
// clawmem_search — POST /search
// =============================================================================
function createHermesSearch(cfg, _logger) {
    return {
        name: "clawmem_search",
        description: "Search long-term memory via ClawMem REST API. Supports keyword, semantic, and hybrid modes. " +
            "Use for recalling past decisions, project context, preferences, and session history.",
        parameters: {
            type: "object",
            properties: {
                query: { type: "string", description: "Search query" },
                mode: {
                    type: "string",
                    enum: ["auto", "keyword", "semantic", "hybrid"],
                    description: "Search mode (default: auto)",
                },
                collection: { type: "string", description: "Limit to specific collection" },
                limit: { type: "number", description: "Max results (default: 10, max: 50)" },
                compact: { type: "boolean", description: "Return compact results (default: true)" },
            },
            required: ["query"],
        },
        async execute(params) {
            const result = await apiCall(cfg, "POST", "/search", {
                query: params.query,
                mode: params.mode ?? "auto",
                collection: params.collection,
                limit: params.limit ?? 10,
                compact: params.compact ?? true,
            });
            if (!result.ok) {
                return {
                    content: [{ type: "text", text: `Search failed: ${result.data?.error || "unknown error"}` }],
                };
            }
            const data = result.data;
            if (!data.results || data.results.length === 0) {
                return {
                    content: [{ type: "text", text: "No relevant memories found." }],
                    details: { count: 0 },
                };
            }
            const text = data.results
                .map((r, i) => `${i + 1}. [${r.contentType || "note"}] ${r.title || r.path} (score: ${r.score})${r.snippet ? `\n   ${r.snippet}` : ""}`)
                .join("\n");
            return {
                content: [{ type: "text", text: `Found ${data.count} results:\n\n${text}` }],
                details: { count: data.count, query: data.query, mode: data.mode },
            };
        },
    };
}
// =============================================================================
// clawmem_get — GET /documents/:docid
// =============================================================================
function createHermesGet(cfg, _logger) {
    return {
        name: "clawmem_get",
        description: "Retrieve full content of a specific memory document by its docid (6-char hex prefix) or path.",
        parameters: {
            type: "object",
            properties: {
                docid: { type: "string", description: "Document ID (6-char hex prefix) or path" },
            },
            required: ["docid"],
        },
        async execute(params) {
            const docid = params.docid;
            const result = await apiCall(cfg, "GET", `/documents/${docid}`);
            if (!result.ok) {
                return {
                    content: [{ type: "text", text: `Document not found: ${docid}` }],
                };
            }
            const d = result.data;
            return {
                content: [{
                        type: "text",
                        text: `# ${d.title || d.path}\n\nCollection: ${d.collection}\nModified: ${d.modifiedAt}\n\n${d.body}`,
                    }],
                details: { docid: d.docid, path: d.path },
            };
        },
    };
}
// =============================================================================
// clawmem_store — POST /documents
// =============================================================================
function createHermesStore(cfg, _logger) {
    return {
        name: "clawmem_store",
        description: "Save a new memory entry via ClawMem REST API. Use for storing important facts, decisions, " +
            "preferences, and observations that should persist across sessions.",
        parameters: {
            type: "object",
            properties: {
                text: { type: "string", description: "Memory content to store" },
                collection: { type: "string", description: "Collection name (default: memory)" },
                title: { type: "string", description: "Optional title" },
            },
            required: ["text"],
        },
        async execute(params) {
            const result = await apiCall(cfg, "POST", "/documents", {
                body: params.text,
                collection: params.collection || "memory",
                title: params.title,
            });
            if (!result.ok) {
                return {
                    content: [{ type: "text", text: `Failed to store memory: ${result.data?.error || "unknown error"}` }],
                };
            }
            const d = result.data;
            return {
                content: [{ type: "text", text: `Memory stored: ${d.docid || "ok"}` }],
                details: { docid: d.docid, path: d.path },
            };
        },
    };
}
// =============================================================================
// clawmem_session_log — GET /sessions
// =============================================================================
function createHermesSessionLog(cfg, _logger) {
    return {
        name: "clawmem_session_log",
        description: "List recent session summaries from ClawMem. Use when asked about past work, " +
            "previous conversations, or session history.",
        parameters: {
            type: "object",
            properties: {
                limit: { type: "number", description: "Number of sessions to return (default: 5)" },
            },
        },
        async execute(params) {
            const limit = params.limit || 5;
            const result = await apiCall(cfg, "GET", `/sessions?limit=${limit}`);
            if (!result.ok) {
                return {
                    content: [{ type: "text", text: `Failed to retrieve sessions: ${result.data?.error}` }],
                };
            }
            const sessions = result.data.sessions;
            if (!sessions || sessions.length === 0) {
                return { content: [{ type: "text", text: "No session history found." }] };
            }
            const text = sessions
                .map((s, i) => `${i + 1}. [${s.started_at}] ${s.session_id?.slice(0, 8)}... — ${s.prompt_count || 0} prompts`)
                .join("\n");
            return {
                content: [{ type: "text", text: `Recent sessions:\n\n${text}` }],
                details: { count: sessions.length },
            };
        },
    };
}
// =============================================================================
// clawmem_similar — GET /graph/similar/:docid
// =============================================================================
function createHermesSimilar(cfg, _logger) {
    return {
        name: "clawmem_similar",
        description: "Find documents semantically similar to a given document via ClawMem graph API. " +
            "Use for discovery and context expansion.",
        parameters: {
            type: "object",
            properties: {
                docid: { type: "string", description: "Document ID (6-char hex prefix)" },
                limit: { type: "number", description: "Max results (default: 5)" },
            },
            required: ["docid"],
        },
        async execute(params) {
            const docid = params.docid;
            const limit = params.limit ?? 5;
            const result = await apiCall(cfg, "GET", `/graph/similar/${docid}?limit=${limit}`);
            if (!result.ok) {
                return {
                    content: [{ type: "text", text: `Similar search failed: ${result.data?.error}` }],
                };
            }
            const similar = result.data.similar;
            if (!similar || similar.length === 0) {
                return { content: [{ type: "text", text: "No similar documents found." }] };
            }
            const text = similar
                .map((s, i) => `${i + 1}. ${s.title || s.path} (similarity: ${s.score})`)
                .join("\n");
            return {
                content: [{ type: "text", text: `Similar documents:\n\n${text}` }],
                details: { count: similar.length },
            };
        },
    };
}
