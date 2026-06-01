# CHANGELOG

All notable changes to the ClawMem OpenClaw Plugin are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## Unreleased

### Added

- **Full memory provider integration** — plugin now owns the active memory slot via `MemorySearchManager`.
- `ClawMemMemorySearchManager` — implements OpenClaw's `MemorySearchManager` interface (search, readFile, status, sync, probe*).
- Standard OpenClaw memory tools: `memory_search`, `memory_get`, `memory_recall`, `memory_store`.
- Corpus supplement registration — enables `memory_search corpus=all` to include ClawMem data.
- Config knobs: `autoRecall`, `autoCapture`, `recallMaxChars`, `collections`.
- `openclaw-memory-types.ts` — local type shims for OpenClaw memory interfaces.
- `manager.test.ts` — 14 unit tests for `ClawMemMemorySearchManager`.

### Changed

- Bump version to `0.1.0` (memory provider integration).
- `tools.ts` refactored into standard tools (`memory_*`) and legacy tools (`clawmem_*`).
- `index.ts` now calls `api.registerMemoryCapability("clawmem", { runtime })` with a real manager.
- `api.ts` extended with `autoRecall`, `autoCapture`, `recallMaxChars`, `collections` config fields.
- `openclaw.plugin.json` updated with new config schema properties and UI hints.
- All tests pass: 42 tests across 2 test files.

## [0.0.1] - 2026-06-01

### Added

- Initial OpenClaw memory plugin adapter.
- Agent tools: `clawmem_search`, `clawmem_get`, `clawmem_session_log`, `clawmem_timeline`, `clawmem_similar`.
- REST API client for ClawMem retrieval endpoints.
- TypeScript project validation (`tsconfig.json`, `npm run typecheck`).
- Unit/integration tests with vitest.
- GitHub Actions CI workflow.
- Agent identity and operating documentation in Vietnamese.

### Changed

- Refactor plugin to API-only mode.
- Remove ClawMem binary execution and service spawning.
- Remove command-line lifecycle integration.
- Remove transcript resolver and compaction/precompact hook logic from the plugin.
- Replace local-runtime config with `apiBaseUrl`/`apiToken`.
- Keep agent tools backed by the external ClawMem REST API.

### Notes

- Initial release started with binary/hook integration; moved to API-only mode.
