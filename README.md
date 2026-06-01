# ClawMem OpenClaw Plugin

ClawMem OpenClaw Plugin is a memory plugin adapter that connects OpenClaw agents to a local ClawMem runtime. It registers ClawMem as an OpenClaw `kind: "memory"` extension, exposes retrieval tools to agents, runs lifecycle hooks for memory extraction, and can start the ClawMem REST API service used by the tools.

The plugin is intentionally fail-open: when the ClawMem binary or REST API is unavailable, agent execution should continue and the plugin logs warnings instead of breaking the OpenClaw turn.

## Purpose

This repository contains only the OpenClaw plugin adapter. The actual memory engine is provided by the external `clawmem` binary.

The adapter handles:

- OpenClaw plugin registration.
- Memory capability registration through `api.registerMemoryCapability()`.
- Lifecycle hook integration for prompt-time context surfacing and post-turn extraction.
- Agent tool registration for searching and reading ClawMem memory.
- REST API service lifecycle via `clawmem serve`.
- Transcript path resolution for OpenClaw session JSONL files.
- Pre-emptive precompact extraction when a conversation approaches the compaction threshold.

## Repository layout

```text
.
├── index.ts                  # OpenClaw plugin entry point
├── engine.ts                 # Lifecycle hook handlers
├── tools.ts                  # Agent tool definitions and REST API client
├── shell.ts                  # clawmem binary resolution, hook execution, service spawn
├── session-state.ts          # Session-scoped bootstrap/context state
├── transcript-resolver.ts    # OpenClaw transcript path resolver
├── compaction-threshold.ts   # Precompact threshold and token estimation logic
├── openclaw.plugin.json      # Plugin manifest and config schema
├── package.json              # Package metadata
└── README.md                 # Project documentation
```

## Requirements

Runtime requirements:

- OpenClaw plugin host.
- Node.js runtime compatible with TypeScript/ESM plugin loading used by OpenClaw.
- `clawmem` binary installed or configured with an explicit path.
- Optional GPU/remote endpoints for embedding, LLM extraction, and reranking.

Development requirements:

- Git.
- Node.js.
- A TypeScript-capable OpenClaw development environment.

This repository does not vendor the ClawMem binary. Install or build `clawmem` separately, then expose it through one of the supported binary resolution paths.

## Binary resolution

The plugin resolves the `clawmem` binary in this order:

1. `clawmemBin` from plugin config, when set and the file exists.
2. A repo-relative path used by ClawMem development layouts.
3. `/usr/local/bin/clawmem`.
4. `$HOME/Projects/forge-stack/skill-forge/clawmem/bin/clawmem`.
5. `$HOME/clawmem/bin/clawmem`.
6. Fallback to `clawmem` from `PATH`.

Recommended production configuration: set `clawmemBin` explicitly to avoid depending on PATH or development-specific paths.

## OpenClaw plugin manifest

The plugin manifest is `openclaw.plugin.json`:

```json
{
  "id": "clawmem",
  "kind": "memory"
}
```

The plugin activates on hook and tool capabilities:

```json
{
  "activation": {
    "onCapabilities": ["hook", "tool"]
  }
}
```

## Configuration

The plugin accepts the following configuration fields.

### `clawmemBin`

Type: string

Path to the `clawmem` binary. If unset, the plugin uses the binary resolution order above.

Example:

```json
{
  "clawmemBin": "/usr/local/bin/clawmem"
}
```

### `tokenBudget`

Type: number
Default: profile-dependent
Minimum: 100
Maximum: 4000

Maximum token budget for context surfaced into the prompt.

### `profile`

Type: string
Allowed values: `speed`, `balanced`, `deep`
Default: `balanced`

Profile presets:

| Profile | Budget |
| --- | ---: |
| `speed` | 400 tokens |
| `balanced` | 800 tokens |
| `deep` | 1200 tokens |

### `enableTools`

Type: boolean
Default: true

Controls whether the plugin registers agent-facing ClawMem tools.

### `servePort`

Type: number
Default: 7438
Minimum: 1024
Maximum: 65535

Local port used by `clawmem serve` and the tool REST client.

### `gpuEmbed`

Type: string

Embedding endpoint URL. Passed to the ClawMem process as `CLAWMEM_EMBED_URL`.

### `gpuLlm`

Type: string

LLM endpoint URL. Passed as `CLAWMEM_LLM_URL`.

### `gpuLlmModel`

Type: string

Model name sent to the configured LLM endpoint. Passed as `CLAWMEM_LLM_MODEL`.

### `gpuLlmReasoningEffort`

Type: string
Allowed values: `none`, `minimal`, `low`, `medium`, `high`, `xhigh`

Optional top-level `reasoning_effort` value for compatible Chat Completions endpoints. Passed as `CLAWMEM_LLM_REASONING_EFFORT`.

### `gpuLlmNoThink`

Type: boolean

Controls whether ClawMem appends `/no_think` to remote LLM prompts. Passed as `CLAWMEM_LLM_NO_THINK`.

### `gpuRerank`

Type: string

Reranker endpoint URL. Passed as `CLAWMEM_RERANK_URL`.

### `compactionContextWindow`

Type: number
Default: 200000
Minimum: 1000

Override the conservative 200K default context window tokens. The plugin uses this as the base value for computing the compaction threshold.

### `precompactProximityRatio`

Type: number
Default: 0.85
Minimum: 0.5
Maximum: 0.95

Override the proximity ratio for the precompact gate. Values are clamped to `[0.5, 0.95]` to prevent misconfiguration from disabling precompact entirely or firing on every turn. Can also be set via the environment variable `CLAWMEM_PRECOMPACT_PROXIMITY_RATIO`.

### `softThresholdTokens`

Type: number
Default: 4000
Minimum: 0

Soft threshold tokens, matching `MemoryFlushPlan.softThresholdTokens` in OpenClaw. Subtracted from the context window along with the reserve floor.

### `reserveTokensFloor`

Type: number
Default: 8000
Minimum: 0

Reserve floor tokens, matching `MemoryFlushPlan.reserveTokensFloor` in OpenClaw. Subtracted from the context window along with the soft threshold.

## Example configuration

Minimal configuration:

```json
{
  "clawmemBin": "/usr/local/bin/clawmem",
  "profile": "balanced",
  "enableTools": true,
  "servePort": 7438
}
```

GPU-backed configuration:

```json
{
  "clawmemBin": "/usr/local/bin/clawmem",
  "profile": "deep",
  "tokenBudget": 1200,
  "enableTools": true,
  "servePort": 7438,
  "gpuEmbed": "http://localhost:8088",
  "gpuLlm": "http://localhost:8089",
  "gpuLlmModel": "qwen3",
  "gpuLlmReasoningEffort": "low",
  "gpuLlmNoThink": true,
  "gpuRerank": "http://localhost:8090"
}
```

## Lifecycle hooks

The plugin subscribes to these OpenClaw lifecycle hooks.

### `before_prompt_build`

This is the load-bearing awaited path.

Responsibilities:

- Clean the current prompt before search.
- Surface relevant ClawMem context into the prompt.
- Consume cached session bootstrap context on the first surfaced turn.
- Run pre-emptive `precompact-extract` when the session is close to the compaction threshold.

Precompact extraction lives here because this hook is awaited before OpenClaw builds the effective prompt and before the LLM call that may trigger compaction.

### `agent_end`

This hook runs post-turn extraction work:

- `decision-extractor`
- `handoff-generator`
- `feedback-loop`

OpenClaw treats this hook as fire-and-forget, so these writes are eventually consistent. Precompact extraction is intentionally not load-bearing in this hook.

### `before_compaction`

Defense-in-depth fallback for `precompact-extract`.

This hook is not the primary correctness path because it may race with compaction. The primary path is `before_prompt_build`.

### `session_start`

Runs `session-bootstrap` and caches its output for the first `before_prompt_build` event of the session.

### `session_end`

Clears per-session plugin state.

### `before_reset`

Runs a final extraction path when possible, then clears per-session state.

## Agent tools

When `enableTools` is true, the plugin registers the following tools.

### `clawmem_search`

Search long-term memory for relevant context.

Parameters:

- `query` string, required.
- `mode` string, optional: `auto`, `keyword`, `semantic`, `hybrid`.
- `collection` string, optional.
- `limit` number, optional. Default: 10.
- `compact` boolean, optional. Default: true.

REST endpoint:

```text
POST /search
```

### `clawmem_get`

Retrieve full content for a memory document by document id.

Parameters:

- `docid` string, required.

REST endpoint:

```text
GET /documents/:docid
```

### `clawmem_session_log`

List recent session summaries.

Parameters:

- `limit` number, optional. Default: 5.

REST endpoint:

```text
GET /sessions?limit=N
```

### `clawmem_timeline`

Show temporal context around a memory document.

Typical use: inspect what happened before and after a document or memory entry was created.

### `clawmem_similar`

Find documents similar to a given memory document.

Typical use: expand a recall result into adjacent related context.

## REST API service

The plugin registers a `clawmem-api` service that starts:

```bash
clawmem serve --port <servePort>
```

The agent tools call the local API at:

```text
http://127.0.0.1:<servePort>
```

If `CLAWMEM_API_TOKEN` is set, the tool client sends it as:

```text
Authorization: Bearer <token>
```

## Transcript resolution

Some OpenClaw lifecycle events do not include a transcript file path. The plugin derives the transcript path from OpenClaw state layout:

```text
<state-dir>/agents/<agentId>/sessions/<sessionId>.jsonl
```

State directory resolution follows OpenClaw-compatible precedence:

1. `OPENCLAW_STATE_DIR`, when set.
2. `OPENCLAW_HOME/.openclaw`, when `OPENCLAW_HOME` is set.
3. `$HOME/.openclaw`, when it exists.
4. `$HOME/.clawdbot`, legacy fallback when `.openclaw` does not exist.
5. `$HOME/.openclaw`, synthesized default.

The resolver is fail-open and returns no transcript path when the resolved file does not exist or the session id is invalid.

## Compaction behavior

The plugin runs pre-emptive precompact extraction when estimated session tokens approach the OpenClaw compaction threshold.

Default threshold inputs:

- Context window: 200,000 tokens.
- Reserve floor: 8,000 tokens.
- Soft threshold: 4,000 tokens.
- Proximity ratio: 0.85.

Effective threshold:

```text
contextWindowTokens - reserveTokensFloor - softThresholdTokens
```

Precompact runs when:

```text
estimatedTokens >= proximityRatio * threshold
```

The proximity ratio can be overridden with:

```bash
CLAWMEM_PRECOMPACT_PROXIMITY_RATIO=0.85
```

Values are clamped to the safe range `[0.5, 0.95]`.

## Environment variables

The plugin can pass these variables to ClawMem subprocesses:

| Variable | Source config | Purpose |
| --- | --- | --- |
| `CLAWMEM_PROFILE` | `profile` | Retrieval/extraction profile |
| `CLAWMEM_EMBED_URL` | `gpuEmbed` | Embedding endpoint |
| `CLAWMEM_LLM_URL` | `gpuLlm` | LLM endpoint |
| `CLAWMEM_LLM_MODEL` | `gpuLlmModel` | LLM model name |
| `CLAWMEM_LLM_REASONING_EFFORT` | `gpuLlmReasoningEffort` | Reasoning effort parameter |
| `CLAWMEM_LLM_NO_THINK` | `gpuLlmNoThink` | `/no_think` behavior |
| `CLAWMEM_RERANK_URL` | `gpuRerank` | Reranker endpoint |
| `CLAWMEM_API_TOKEN` | process environment | Bearer token for REST API calls |
| `CLAWMEM_PRECOMPACT_PROXIMITY_RATIO` | process environment | Precompact proximity ratio |
| `OPENCLAW_STATE_DIR` | process environment | Explicit OpenClaw state directory |
| `OPENCLAW_HOME` | process environment | OpenClaw home override |
| `OPENCLAW_TEST_FAST` | process environment | Test-mode state-dir shortcut |

## Failure handling

The plugin favors availability over strict failure:

- Hook subprocess errors return empty context instead of throwing.
- Hook timeout errors are logged and fail open.
- Missing transcript files skip extraction paths that require transcripts.
- REST API failures return tool-visible error messages instead of crashing the agent.
- Missing `clawmem` binary should be treated as a deployment/configuration issue.

## Local validation

Basic repository checks:

```bash
git status --short --branch
git diff --check
node --check index.ts
```

Note: `node --check` does not type-check TypeScript syntax in all environments. Use the OpenClaw project validation flow or a TypeScript compiler when available.

If `clawmem` is installed, verify the binary and service manually:

```bash
clawmem --help
clawmem serve --port 7438
```

Then check the REST API according to the ClawMem runtime documentation.

## Troubleshooting

### Agent tools report that ClawMem API is unreachable

Check:

1. `servePort` matches the running `clawmem serve` port.
2. The plugin service started successfully.
3. No other process is occupying the port.
4. `CLAWMEM_API_TOKEN` matches server configuration when auth is enabled.

### Hooks return no additional context

Check:

1. `clawmemBin` points to an executable binary.
2. Hook names exist in the ClawMem runtime.
3. The OpenClaw transcript path exists.
4. `OPENCLAW_STATE_DIR` or `OPENCLAW_HOME` is set correctly when using a custom state directory.
5. ClawMem has indexed the relevant memory collections.

### Precompact extraction does not run

Check:

1. The current session has enough estimated tokens to cross the proximity gate.
2. `CLAWMEM_PRECOMPACT_PROXIMITY_RATIO` is not set too high.
3. A valid transcript path can be resolved for the session.
4. The deployment is not relying on undocumented plugin config keys for compaction thresholds.

Current manifest note: `openclaw.plugin.json` has `additionalProperties: false` and does not expose `compactionContextWindow`, `precompactProximityRatio`, `softThresholdTokens`, or `reserveTokensFloor` as accepted plugin config fields. The only documented runtime override in this README is the environment variable `CLAWMEM_PRECOMPACT_PROXIMITY_RATIO`. Other threshold defaults are currently code-level defaults unless the manifest/schema is expanded in a future change.

### Plugin works in Bun but fails in Node ESM

This plugin uses `import.meta.url` to derive `__dirname` in ESM. Avoid relying on Bun-only globals when adding new code.

## Development notes

- Keep this repository focused on the OpenClaw adapter layer.
- Do not vendor ClawMem runtime code into this plugin repository unless the project scope changes explicitly.
- Keep plugin behavior fail-open so memory failures do not break normal agent turns.
- When adding a new tool, document the tool name, parameters, REST endpoint, and failure behavior in this README.
- When adding a new lifecycle hook, document whether it is awaited or fire-and-forget and whether it is correctness-critical.

## Release notes

Current package metadata version: `0.0.1`.

This README documents the plugin architecture and operational behavior for the initial public project documentation branch.
