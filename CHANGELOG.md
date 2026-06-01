# CHANGELOG

All notable changes to the ClawMem OpenClaw Plugin are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.0.1] - 2026-06-01

### Added

- OpenClaw plugin adapter for ClawMem (`kind: "memory"`).
- Plugin lifecycle hooks:
  - `before_prompt_build` — memory context surfacing + pre-emptive precompact extraction (awaited).
  - `agent_end` — decision-extractor, handoff-generator, feedback-loop (eventually-consistent vault writes).
  - `before_compaction` — defense-in-depth precompact fallback (fire-and-forget).
  - `session_start` — session-bootstrap hook.
  - `session_end` — clear session state.
  - `before_reset` — final extraction + clear session state.
- Agent tools: `clawmem_search`, `clawmem_get`, and related memory tools (configurable via `enableTools`).
- REST API service: spawns `clawmem serve` as a background service with configurable port.
- Compaction proximity heuristic with tunable thresholds:
  - `contextWindowTokens` (default: 200K)
  - `precompactProximityRatio` (default: 0.85, clamped to [0.5, 0.95])
  - `softThresholdTokens` (default: 4K)
  - `reserveTokensFloor` (default: 8K)
- Transcript path resolver with OpenClaw canonical session layout support:
  - `<state-dir>/agents/<agentId>/sessions/<sessionId>.jsonl`
  - Topic-scoped filenames.
  - `sessions.json` authoritative lookup.
  - Legacy state directory fallback (`.clawdbot`).
- Config schema in `openclaw.plugin.json` with compaction fields.
- Environment variable support: `CLAWMEM_PRECOMPACT_PROXIMITY_RATIO`, `CLAWMEM_EMBED_URL`, `CLAWMEM_LLM_URL`, `CLAWMEM_LLM_MODEL`, `CLAWMEM_LLM_REASONING_EFFORT`, `CLAWMEM_LLM_NO_THINK`, `CLAWMEM_RERANK_URL`, `CLAWMEM_PROFILE`.
- Agent identity and operating documentation in Vietnamese.
- TypeScript project validation (`tsconfig.json`, `npm run typecheck`).
- Unit tests with vitest (48 tests across compaction-threshold and transcript-resolver).
- GitHub Actions CI workflow (typecheck, test, diff check).

### Changed

- Migrated from `kind: "context-engine"` to `kind: "memory"` (§14.3).
- Precompact-extract moved from `agent_end` (fire-and-forget) to `before_prompt_build` (awaited).

### Notes

- Initial public release.
- Version aligned across `package.json` and plugin metadata (`0.0.1`).
- `package-lock.json` is gitignored; use `npm install` in CI.
