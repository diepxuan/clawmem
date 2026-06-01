# ClawMem OpenClaw Plugin

ClawMem OpenClaw Plugin connects OpenClaw agents to an already-running ClawMem REST API **as a full memory provider** — not just standalone tools.

This plugin:

- **Owns the active memory slot** — registers a real `MemorySearchManager` backed by the ClawMem REST API.
- **Exposes standard OpenClaw memory tools** — `memory_search`, `memory_get`, `memory_recall`, `memory_store`.
- **Registers a corpus supplement** — `memory_search corpus=all` includes ClawMem data.
- **Retains legacy aliases** — `clawmem_search`, `clawmem_get`, etc. for backward compatibility.

## Architecture

```text
OpenClaw agent
  └─ ClawMem memory plugin
       ├─ MemorySearchManager (real, not stub)
       ├─ Standard tools: memory_search, memory_get, memory_recall, memory_store
       ├─ Legacy tools: clawmem_search, clawmem_get, clawmem_session_log, clawmem_timeline, clawmem_similar
       └─ HTTP REST API
            └─ external ClawMem service
```

The external ClawMem API is owned outside this plugin. Start and supervise it with your normal service manager before enabling the plugin.

## Files

```text
index.ts                     # OpenClaw plugin registration (memory capability + runtime)
manager.ts                   # ClawMemMemorySearchManager — MemorySearchManager implementation
api.ts                       # REST API client + readiness probe
tools.ts                     # Agent tools (standard + legacy)
openclaw-memory-types.ts     # OpenClaw memory type shims
tools.test.ts                # Tool integration tests (28 tests)
manager.test.ts              # MemorySearchManager unit tests (14 tests)
openclaw.plugin.json         # Plugin config schema
CHANGELOG.md                 # Release notes
docs/TASKS.md                # Project backlog
```

## Configuration

### Required

| Key | Type | Default | Description |
| --- | ---- | ------- | ----------- |
| `apiBaseUrl` | string | `http://127.0.0.1:7438` | Base URL of the running ClawMem REST API |

### Optional

| Key | Type | Default | Description |
| --- | ---- | ------- | ----------- |
| `apiToken` | string | `$CLAWMEM_API_TOKEN` | Bearer token for the ClawMem API |
| `enableTools` | boolean | `true` | Register memory agent tools |
| `autoRecall` | boolean | `false` | Auto-recall memory before each turn |
| `autoCapture` | boolean | `true` | Auto-capture important facts after responses |
| `recallMaxChars` | number | `1000` | Max chars for recall query text |
| `collections` | string[] | all | Collections to index/search |
| `profile` | string | `balanced` | `speed` (400) / `balanced` (800) / `deep` (1200) |
| `tokenBudget` | number | profile-derived | Context token budget hint |

### Enable as active memory provider

```json5
{
  plugins: {
    slots: { memory: "clawmem" },
    entries: {
      clawmem: {
        enabled: true,
        config: {
          apiBaseUrl: "http://127.0.0.1:7438",
          autoRecall: true,
          autoCapture: true,
        },
      },
    },
  },
}
```

## Registered tools

### Standard (OpenClaw-compatible)

| Tool | API endpoint | Purpose |
| --- | --- | --- |
| `memory_search` | `POST /search` | Search memory with keyword/semantic/hybrid modes. Supports `corpus` param for sessions. |
| `memory_get` | `GET /documents/:docid` | Fetch full memory document by docid or path. Supports `from`/`lines` for range reads. |
| `memory_recall` | `POST /search` | Recall merged context for the current query (suitable for prompt injection). |
| `memory_store` | `POST /documents` | Save a new memory entry with optional collection and title. |

### Legacy (backward-compatible)

| Tool | API endpoint | Purpose |
| --- | --- | --- |
| `clawmem_search` | `POST /search` | Alias for memory_search |
| `clawmem_get` | `GET /documents/:docid` | Alias for memory_get |
| `clawmem_session_log` | `GET /sessions` | List recent sessions |
| `clawmem_timeline` | `GET /timeline/:docid` | Show temporal context around a document |
| `clawmem_similar` | `GET /graph/similar/:docid` | Find semantically similar documents |

## Memory capability

### MemorySearchManager

The plugin implements OpenClaw's `MemorySearchManager` interface:

- **`search(query, opts)`** — maps to `POST /search` with `MemorySearchResult[]` output
- **`readFile(params)`** — maps to `GET /documents/:docid` with line-range support
- **`status()`** — reports `backend: "clawmem"` and API reachability
- **`sync(params?)`** — triggers reindex via `POST /reindex` if available
- **`probeEmbeddingAvailability()`** — HEAD check on API base URL
- **`probeVectorAvailability()`** — delegates to embedding probe

### Corpus supplement

The plugin registers a corpus supplement (`corpus: "clawmem"`) so that:

- `memory_search corpus=all` includes ClawMem results alongside builtin memory
- `memory_get` can resolve ClawMem documents via the shared corpus system

## API readiness

The plugin registers a lightweight readiness service that checks the configured `apiBaseUrl` at startup.

- Any HTTP response < 500 counts as ready.
- If the API is unreachable, the plugin logs a warning and continues.
- Tools fail open — returning readable error text instead of crashing.

## Development

Install dependencies:

```bash
npm install
```

Run validation:

```bash
npm run typecheck
npm test
```

## Release notes

See `CHANGELOG.md`.
