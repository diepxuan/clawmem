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
import { apiCall } from "./api.js";
// =============================================================================
// Standard Memory Tools (OpenClaw-compatible names)
// =============================================================================
function createStandardTools(cfg, logger) {
    return [
        // --- memory_search: Standard OpenClaw memory search ---
        {
            name: "memory_search",
            label: "Memory Search",
            description: "Search long-term memory for relevant context. Supports keyword, semantic, and hybrid modes. " +
                "Use for recalling past decisions, preferences, session history, and learned patterns.",
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
                    corpus: {
                        type: "string",
                        enum: ["memory", "sessions", "all"],
                        description: "Corpus to search (default: memory)",
                    },
                },
                required: ["query"],
            },
            async execute(_id, params) {
                const corpus = params.corpus ?? "memory";
                // Sessions-only search
                if (corpus === "sessions") {
                    return executeSessionSearch(cfg, params, logger);
                }
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
        },
        // --- memory_get: Standard OpenClaw memory get ---
        {
            name: "memory_get",
            label: "Memory Get",
            description: "Retrieve full content of a specific memory document by its docid (6-char hex prefix) or path.",
            parameters: {
                type: "object",
                properties: {
                    docid: { type: "string", description: "Document ID (6-char hex prefix from search results) or path" },
                    from: { type: "number", description: "Start line number (1-indexed, optional)" },
                    lines: { type: "number", description: "Number of lines to read (optional)" },
                },
                required: ["docid"],
            },
            async execute(_id, params) {
                const docid = params.docid;
                const result = await apiCall(cfg, "GET", `/documents/${docid}`);
                if (!result.ok) {
                    return {
                        content: [{ type: "text", text: `Document not found: ${docid}` }],
                    };
                }
                const d = result.data;
                let body = d.body ?? "";
                // Apply line-range slicing if requested
                if (params.from !== undefined || params.lines !== undefined) {
                    const allLines = body.split("\n");
                    const start = Math.max(0, Number(params.from ?? 1) - 1);
                    const totalLines = allLines.length;
                    const count = params.lines !== undefined ? Number(params.lines) : totalLines - start;
                    body = allLines.slice(start, start + count).join("\n");
                }
                return {
                    content: [{
                            type: "text",
                            text: `# ${d.title || d.path}\n\nCollection: ${d.collection}\nModified: ${d.modifiedAt}\n\n${body}`,
                        }],
                    details: { docid: d.docid, path: d.path },
                };
            },
        },
        // --- memory_recall: Recall context for current query ---
        {
            name: "memory_recall",
            label: "Memory Recall",
            description: "Recall relevant memory context for the current query. Returns merged context suitable " +
                "for prompt injection. Use before answering questions that may require past context.",
            parameters: {
                type: "object",
                properties: {
                    query: { type: "string", description: "Query to recall context for" },
                    limit: { type: "number", description: "Max results (default: 5)" },
                },
                required: ["query"],
            },
            async execute(_id, params) {
                const limit = params.limit ?? 5;
                const result = await apiCall(cfg, "POST", "/search", {
                    query: params.query,
                    mode: "auto",
                    limit,
                    compact: false,
                });
                if (!result.ok || !result.data?.results || result.data.results.length === 0) {
                    return {
                        content: [{ type: "text", text: "No relevant memories recalled." }],
                    };
                }
                const contexts = result.data.results
                    .map((r) => `## ${r.title || r.path}\n${r.body || r.snippet || ""}`)
                    .join("\n\n---\n\n");
                return {
                    content: [{ type: "text", text: `Recalled ${result.data.results.length} memories:\n\n${contexts}` }],
                    details: { count: result.data.results.length },
                };
            },
        },
        // --- memory_store: Save a new memory ---
        {
            name: "memory_store",
            label: "Memory Store",
            description: "Save a new memory entry. Use for storing important facts, decisions, preferences, " +
                "and observations that should persist across sessions.",
            parameters: {
                type: "object",
                properties: {
                    text: { type: "string", description: "Memory content to store" },
                    collection: { type: "string", description: "Collection name (default: memory)" },
                    title: { type: "string", description: "Optional title" },
                },
                required: ["text"],
            },
            async execute(_id, params) {
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
        },
    ];
}
// =============================================================================
// Legacy ClawMem Tools (backward-compatible names)
// =============================================================================
function createLegacyTools(cfg, logger) {
    return [
        // --- clawmem_search: legacy alias ---
        {
            name: "clawmem_search",
            label: "ClawMem Search (legacy)",
            description: "[Legacy] Search long-term memory. Prefer memory_search for new usage.",
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
            async execute(_id, params) {
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
        },
        // --- clawmem_get: legacy alias ---
        {
            name: "clawmem_get",
            label: "ClawMem Get (legacy)",
            description: "[Legacy] Retrieve full content of a specific memory document. Prefer memory_get for new usage.",
            parameters: {
                type: "object",
                properties: {
                    docid: { type: "string", description: "Document ID (6-char hex prefix from search results)" },
                },
                required: ["docid"],
            },
            async execute(_id, params) {
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
        },
        // --- clawmem_session_log ---
        {
            name: "clawmem_session_log",
            label: "ClawMem Sessions",
            description: "List recent session summaries. Use when asked about past work, previous conversations, or session history.",
            parameters: {
                type: "object",
                properties: {
                    limit: { type: "number", description: "Number of sessions to return (default: 5)" },
                },
            },
            async execute(_id, params) {
                return executeSessionSearch(cfg, params, logger);
            },
        },
        // --- clawmem_timeline ---
        {
            name: "clawmem_timeline",
            label: "ClawMem Timeline",
            description: "Show temporal context around a document — what was created before and after it.",
            parameters: {
                type: "object",
                properties: {
                    docid: { type: "string", description: "Document ID (6-char hex prefix)" },
                    before: { type: "number", description: "Documents before (default: 5)" },
                    after: { type: "number", description: "Documents after (default: 5)" },
                    same_collection: { type: "boolean", description: "Limit to same collection (default: false)" },
                },
                required: ["docid"],
            },
            async execute(_id, params) {
                const docid = params.docid;
                const before = params.before ?? 5;
                const after = params.after ?? 5;
                const sameCol = params.same_collection ?? false;
                const qs = `before=${before}&after=${after}&same_collection=${sameCol}`;
                const result = await apiCall(cfg, "GET", `/timeline/${docid}?${qs}`);
                if (!result.ok) {
                    return {
                        content: [{ type: "text", text: `Timeline failed: ${result.data?.error}` }],
                    };
                }
                const d = result.data;
                const lines = [];
                if (d.before?.length) {
                    lines.push("**Before:**");
                    for (const e of d.before)
                        lines.push(`  - [${e.modifiedAt}] ${e.title} (${e.collection})`);
                }
                lines.push(`**→ ${d.anchor?.title || docid}** [${d.anchor?.modifiedAt}]`);
                if (d.after?.length) {
                    lines.push("**After:**");
                    for (const e of d.after)
                        lines.push(`  - [${e.modifiedAt}] ${e.title} (${e.collection})`);
                }
                return {
                    content: [{ type: "text", text: lines.join("\n") }],
                    details: { docid, before: d.before?.length, after: d.after?.length },
                };
            },
        },
        // --- clawmem_similar ---
        {
            name: "clawmem_similar",
            label: "ClawMem Similar",
            description: "Find documents semantically similar to a given document. Use for discovery and context expansion.",
            parameters: {
                type: "object",
                properties: {
                    docid: { type: "string", description: "Document ID (6-char hex prefix)" },
                    limit: { type: "number", description: "Max results (default: 5)" },
                },
                required: ["docid"],
            },
            async execute(_id, params) {
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
        },
    ];
}
// =============================================================================
// Shared helpers
// =============================================================================
async function executeSessionSearch(cfg, params, logger) {
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
}
export function createTools(cfg, logger, options) {
    const includeStandard = options?.includeStandard !== false;
    const includeLegacy = options?.includeLegacy !== false;
    const tools = [];
    if (includeStandard)
        tools.push(...createStandardTools(cfg, logger));
    if (includeLegacy)
        tools.push(...createLegacyTools(cfg, logger));
    return tools;
}
