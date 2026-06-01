# CHANGELOG

All notable changes to the ClawMem OpenClaw Plugin are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## Unreleased

### Changed

- Document ClawMem API endpoint, auth, endpoint surface, and tool/API mapping without local binary assumptions.
- Refactor plugin to API-only mode.
- Remove ClawMem binary execution and service spawning.
- Remove command-line lifecycle integration.
- Remove transcript resolver and compaction/precompact hook logic from the plugin.
- Replace local-runtime config with `apiBaseUrl`/`apiToken`.
- Keep agent tools backed by the external ClawMem REST API.

## [0.0.1] - 2026-06-01

### Added

- Initial OpenClaw memory plugin adapter.
- Agent tools: `clawmem_search`, `clawmem_get`, `clawmem_session_log`, `clawmem_timeline`, `clawmem_similar`.
- REST API client for ClawMem retrieval endpoints.
- TypeScript project validation (`tsconfig.json`, `npm run typecheck`).
- Unit/integration tests with vitest.
- GitHub Actions CI workflow.
- Agent identity and operating documentation in Vietnamese.

### Notes

- Initial release started with binary/hook integration; the next unreleased change moves the plugin to API-only mode.
