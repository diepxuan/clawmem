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

Base URL for the already-running ClawMem REST API.

Example:

```json
{
  "apiBaseUrl": "http://127.0.0.1:7438"
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

## Registered tools

| Tool | API endpoint | Purpose |
| --- | --- | --- |
| `clawmem_search` | `POST /search` | Search memory with keyword/semantic/hybrid modes |
| `clawmem_get` | `GET /documents/:docid` | Fetch a full memory document |
| `clawmem_session_log` | `GET /sessions?limit=N` | List recent sessions |
| `clawmem_timeline` | `GET /timeline/:docid` | Show temporal context around a document |
| `clawmem_similar` | `GET /similar/:docid?limit=N` | Find similar documents |

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
