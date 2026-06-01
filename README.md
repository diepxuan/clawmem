# ClawMem OpenClaw Plugin

ClawMem OpenClaw Plugin connects OpenClaw agents to an already-running ClawMem REST API.

This repository is now API-only:

- It does **not** execute a `clawmem` binary.
- It does not start or stop any runtime process.
- It does not run command-line hook integrations.
- It does **not** register OpenClaw lifecycle hooks for extraction/compaction.
- It only registers OpenClaw agent tools that call the configured ClawMem HTTP API.

## Architecture

```text
OpenClaw agent
  └─ ClawMem plugin tools
       └─ HTTP REST API
            └─ external ClawMem service
```

The external ClawMem API is owned outside this plugin. Start and supervise it with your normal service manager before enabling the plugin.

## Files

```text
index.ts                 # OpenClaw plugin registration
api.ts                   # REST API client + readiness probe
tools.ts                 # Agent tools backed by REST API
tools.test.ts            # Tool/API integration tests
openclaw.plugin.json     # Plugin config schema
CHANGELOG.md             # Release notes
docs/TASKS.md            # Project backlog
```

## Configuration

### `apiBaseUrl`

Type: string
Default: `http://127.0.0.1:7438`

Base URL for the already-running ClawMem REST API. The current shared ClawMem API URL used by this project is `http://10.0.0.105:7438`.

Example:

```json
{
  "apiBaseUrl": "http://10.0.0.105:7438"
}
```

### `apiToken`

Type: string
Default: unset

Optional bearer token for the ClawMem API. If omitted, the plugin uses `CLAWMEM_API_TOKEN` from the environment.

### `enableTools`

Type: boolean
Default: true

Registers ClawMem agent tools when enabled.

### `profile`

Type: string
Allowed: `speed`, `balanced`, `deep`
Default: `balanced`

Retained as a compatibility/profile hint.

### `tokenBudget`

Type: number
Default: profile-derived (`speed=400`, `balanced=800`, `deep=1200`)

Retained as a compatibility/profile hint.

## ClawMem API server

This plugin only connects to an existing ClawMem HTTP REST API. It does not ship, execute, or document any local `clawmem` binary.

Current API endpoint used by this project:

```text
http://10.0.0.105:7438
```

When the API server requires a token, every request must include:

```text
Authorization: Bearer <token>
```

Configure the same token through plugin config `apiToken` or the OpenClaw process environment variable `CLAWMEM_API_TOKEN`.

Example search request:

```bash
curl -X POST http://10.0.0.105:7438/search \
  -H 'Content-Type: application/json' \
  -d '{"query":"authentication decisions","mode":"hybrid","compact":true}'
```

### API endpoints

| Method | Path | Description |
| --- | --- | --- |
| GET | `/health` | Liveness probe, version, and document count |
| GET | `/stats` | Full index statistics |
| POST | `/search` | Unified search (`mode`: `auto`, `keyword`, `semantic`, `hybrid`) |
| POST | `/retrieve` | Smart retrieve with auto-routing (`mode`: `auto`, `keyword`, `semantic`, `causal`, `timeline`, `hybrid`) |
| GET | `/documents/:docid` | Single document by 6-character hash prefix |
| GET | `/documents?pattern=...` | Multi-get by glob pattern |
| GET | `/timeline/:docid` | Temporal neighborhood (`before`/`after`) |
| GET | `/sessions` | Recent session history |
| GET | `/collections` | List all collections |
| GET | `/lifecycle/status` | Active, archived, pinned, and snoozed counts |
| POST | `/documents/:docid/pin` | Pin or unpin a document |
| POST | `/documents/:docid/snooze` | Snooze a document until a date |
| POST | `/documents/:docid/forget` | Deactivate a document |
| POST | `/lifecycle/sweep` | Archive stale docs; dry run by default |
| GET | `/graph/causal/:docid` | Causal chain traversal |
| GET | `/graph/similar/:docid` | k-nearest-neighbor semantic neighbors |
| GET | `/export` | Full vault export as JSON |
| POST | `/reindex` | Trigger a re-scan |
| POST | `/graphs/build` | Rebuild temporal and semantic graphs |

## Registered tools

The plugin exposes a retrieval-focused subset of the API to OpenClaw agents:

| Tool | API endpoint | Purpose |
| --- | --- | --- |
| `clawmem_search` | `POST /search` | Search memory with keyword/semantic/hybrid modes |
| `clawmem_get` | `GET /documents/:docid` | Fetch a full memory document |
| `clawmem_session_log` | `GET /sessions?limit=N` | List recent sessions |
| `clawmem_timeline` | `GET /timeline/:docid` | Show temporal context around a document |
| `clawmem_similar` | `GET /graph/similar/:docid?limit=N` | Find similar documents |

Other API endpoints are available for dashboards, non-MCP agents, cross-machine access, lifecycle operations, and programmatic maintenance, but they are not all registered as OpenClaw tools.

All tools fail open: if the API is unreachable or returns an error, the tool returns a readable text error instead of crashing the agent.

## API readiness

The plugin registers a lightweight readiness service that checks the configured `apiBaseUrl` at startup.

- Any HTTP response counts as ready.
- If the API is unreachable, the plugin logs a warning and continues.
- The plugin never starts or stops the ClawMem runtime.

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
