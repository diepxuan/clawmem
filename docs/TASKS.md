# TASKS.md - ClawMem OpenClaw Plugin Backlog

Tracked backlog for maintainers and AI agents. Keep this file factual and update it when tasks are completed.

Last updated: 2026-06-01

## Critical

(None — all critical tasks completed)

## Important

| ID | Task | Details | Files | Status |
| --- | --- | --- | --- | --- |
| T1 | Keep README current | README should stay aligned with config schema, API tools, and API readiness behavior. | `README.md`, `openclaw.plugin.json`, `tools.ts`, `api.ts` | Ongoing |
| T3 | ~~Memory provider integration~~ | Plugin now owns memory slot, implements MemorySearchManager, registers standard tools + corpus supplement. | `index.ts`, `manager.ts`, `tools.ts`, `openclaw-memory-types.ts` | ✅ Done |
| T4 | ~~Standard memory tools~~ | Added memory_search, memory_get, memory_recall, memory_store with legacy clawmem_* aliases. | `tools.ts`, `tools.test.ts` | ✅ Done |

## Nice to have

| ID | Task | Details | Files |
| --- | --- | --- | --- |
| T5 | ~~Add integration tests~~ | Done — 42 tests (28 tool + 14 manager tests) with mock API. | `tools.test.ts`, `manager.test.ts` |
| T6 | ~~Add service readiness handling~~ | Done — HEAD check + waitForApiReady + fail-open. | `api.ts`, `manager.ts`, `index.ts` |
| T7 | Compile to JS for production | Ship compiled `.js` output instead of raw `.ts` for OpenClaw plugin loading. | Build pipeline |
| T8 | Auto-recall/auto-capture integration | Implement actual auto-recall before turns and auto-capture after responses (requires ClawMem API support). | `index.ts`, upstream API |

## Open questions

| ID | Question | Context |
| --- | --- | --- |
| Q1 | Should this package ship TypeScript only or compiled JavaScript? | Current entry is `index.ts`; OpenClaw may need `.js` output for plugin loading. |
| Q2 | Where is the canonical ClawMem API service maintained? | This plugin depends on the external HTTP API endpoint, currently `http://10.0.0.105:7438`. |
| Q3 | Which OpenClaw versions are supported? | Plugin behavior depends on OpenClaw plugin/tool registration APIs. |

## Maintenance rules

- Do not add local machine state to this backlog.
- Do not mark an item complete unless the change is committed or deliberately closed.
- Keep each task scoped enough for one branch and one PR.
- Move completed work to release notes or changelog when a changelog exists.
