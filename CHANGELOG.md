# CHANGELOG

All notable changes to the ClawMem OpenClaw Plugin are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.0.2] - 2026-06-02

### Added

- **Hermes Agent integration** — bridge module with 5 ClawMem tools for Hermes consumption.
- `hermes/bridge.ts` — `clawmem_search`, `clawmem_get`, `clawmem_store`, `clawmem_session_log`, `clawmem_similar` via shared API client.
- `hermes/bridge.test.ts` — 9 tests (search, get, store, session_log, similar, fail-open, auth).
- `hermes/SKILL.md` — Hermes skill template with tool documentation, usage patterns, troubleshooting.
- `hermes/README.md` — integration quick start and configuration guide.
- README section documenting Hermes compatibility.

### Changed

- Deduplicated `apiCall` in `index.ts` — now imports from `api.ts` (single source of truth).
- `docs/TASKS.md` reorganized: active tasks, version 0.0.2 backlog, completed 0.0.1 items, known risks.

### Fixed

- Removed 32-line duplicate `apiCall` function in `index.ts` that mirrored `api.ts` exactly.

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
