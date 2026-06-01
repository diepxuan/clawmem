# ClawMem Hook Contracts

This document describes the `clawmem hook <name>` commands that the OpenClaw plugin calls, their input/output shapes, and failure handling.

All hooks are executed via `clawmem hook <name>` with a JSON input passed on stdin. The plugin expects stdout to be a `key=value` format that is parsed by `parseHookOutput()`.

## Common input fields

| Field | Type | Description |
| --- | --- | --- |
| `session_id` | string | OpenClaw session identifier. Required by most hooks. |
| `transcript_path` | string | Absolute path to the session JSONL transcript. Required by extractor hooks. |

## Hooks

### `context-surfacing`

**Called by:** `handleBeforePromptBuild` (every turn)

**Purpose:** Retrieve relevant memory context from the ClawMem vault for the current user prompt.

**Input:**
```json
{
  "session_id": "<sessionId>",
  "prompt": "<cleaned user prompt>"
}
```

**Expected output (key=value format):**
```
context=<retrieved context text>
```

**Behavior:**
- On success (exit 0): parsed output is appended to the `prependContext` injected into the prompt.
- On failure: logged as warning, turn continues without context.
- If output is empty: no context injected.

---

### `precompact-extract`

**Called by:** `maybeRunPrecompactExtract` (when proximity heuristic fires)

**Purpose:** Extract precompact state from the session transcript and write `precompact-state.md` before compaction.

**Input:**
```json
{
  "session_id": "<sessionId>",
  "transcript_path": "<absolute path to session.jsonl>"
}
```

**Expected output (key=value format):**
```
precompact_state=<extracted state summary>
```

**Behavior:**
- Hard precondition: `transcript_path` must exist and be valid. Hook returns empty if path is missing.
- On success: `precompact-state.md` is written to the session directory.
- On failure: logged as warning. The hook is regex-only (milliseconds), so over-firing is cheap.
- Idempotent: safe to call multiple times on the same session.

**Note:** This is the load-bearing correctness path. Must run BEFORE the LLM call that could trigger compaction.

---

### `decision-extractor`

**Called by:** `handleAgentEnd` (after each agent turn)

**Purpose:** Extract decisions and observations from the just-finished turn.

**Input:**
```json
{
  "session_id": "<sessionId>",
  "transcript_path": "<absolute path to session.jsonl>"
}
```

**Expected output (key=value format):**
```
decisions=<extracted decisions>
```

**Behavior:**
- Fire-and-forget: runs in parallel with other extractors.
- Eventually-consistent: writes are deduplicated by `saveMemory()`.
- On failure: logged as warning, does not block the agent.

---

### `handoff-generator`

**Called by:** `handleAgentEnd` (after each agent turn)

**Purpose:** Generate handoff context for future agent sessions.

**Input:**
```json
{
  "session_id": "<sessionId>",
  "transcript_path": "<absolute path to session.jsonl>"
}
```

**Expected output (key=value format):**
```
handoff=<handoff context>
```

**Behavior:**
- Fire-and-forget: runs in parallel with other extractors.
- Eventually-consistent: writes are deduplicated.
- On failure: logged as warning.

---

### `feedback-loop`

**Called by:** `handleAgentEnd` (after each agent turn)

**Purpose:** Process feedback from the agent turn for future memory quality improvement.

**Input:**
```json
{
  "session_id": "<sessionId>",
  "transcript_path": "<absolute path to session.jsonl>"
}
```

**Expected output (key=value format):**
```
feedback=<feedback summary>
```

**Behavior:**
- Fire-and-forget: runs in parallel with other extractors.
- Eventually-consistent: writes are deduplicated.
- On failure: logged as warning.

---

### `session-bootstrap`

**Called by:** `handleSessionStart` (when a new session starts)

**Purpose:** Gather initial session context for the first turn.

**Input:**
```json
{
  "session_id": "<sessionId>"
}
```

**Expected output (key=value format):**
```
bootstrap_context=<initial context>
```

**Behavior:**
- Result is cached and consumed on the first `before_prompt_build` turn.
- If bootstrap context is not available, first turn continues without it.

## Output parsing

All hook stdout is parsed by `parseHookOutput()` which expects `key=value` lines:

```
key1=value1
key2=value2
```

The `extractContext()` function then extracts the primary context field from the parsed output.

## Failure handling

| Scenario | Behavior |
| --- | --- |
| Hook exits non-zero | Logged as warning; turn continues |
| Hook stdout is empty | No context injected; turn continues |
| Hook stdout is unparseable | Empty context returned; turn continues |
| `transcript_path` missing | Hook is not called; fail-open |
| Hook timeout | Logged as error; turn continues |

All hooks are fail-open: the plugin never blocks the agent turn due to a hook failure.
