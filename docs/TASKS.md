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
| T7 | ~~Compile to JS for production~~ | Closed as not needed right now: OpenClaw 2026.5.28 can load the current `./index.ts` entry and no module-resolution failure is present. Keep runtime validation on `openclaw plugins build`. | Build pipeline |
| T8 | Auto-recall/auto-capture integration | Implement actual auto-recall before turns and auto-capture after responses (requires ClawMem API support). | `index.ts`, upstream API |
| T9 | OpenClaw SDK metadata/runtime validation | Use the real OpenClaw 2026.5.28 SDK: `defineToolPlugin` from `openclaw/plugin-sdk/tool-plugin`, `Type` from `typebox`, and `registerMemoryCapability`/`registerMemoryCorpusSupplement` via the plugin runtime API. Keep the plugin API-only, generate manifest metadata with `openclaw plugins build`, then validate with `npm run typecheck`, `npm test -- --run`, and `openclaw plugins build` until all pass. If runtime validation fails, document root cause and next fix here before continuing. | `index.ts`, `openclaw.plugin.json`, `package.json`, `package-lock.json` |

## Memory provider review fixes

| ID | Risk | Priority | Status | Details | Files |
| --- | --- | --- | --- | --- | --- |
| R1 | `_apiReady` cached forever | P1 | Follow-up PR | Add TTL (60s) — re-HEAD after expiry instead of caching forever | `manager.ts` |
| R2 | `search()` hardcodes `mode: "auto"` | P2 | Follow-up PR | Add explicit `opts.mode` and map OpenClaw qmd search overrides to ClawMem keyword/semantic/hybrid modes | `manager.ts` |
| R3 | `resolveMemoryBackendConfig` returns `"builtin"` — semantic needs verification | P1 | Research | OpenClaw 2026.5.28 type shim currently allows only `builtin`/`qmd`; do not change to `clawmem` without runtime/type confirmation | `index.ts`, SDK docs |
| R6 | `registerMemoryCorpusSupplement` may be absent in some SDK runtimes | P1 | PR #19 | Add graceful fallback when method is unavailable | `index.ts` |
| R7 | Corpus supplement `get(p)` — `p.lookup` shape unknown | P1 | Research | Test with real OpenClaw runtime to verify param format before changing behavior | `index.ts` |
| R13 | `apiCall` — `resp.json()` throws on non-JSON responses | P1 | Follow-up PR | Wrap JSON parse in separate try/catch, fallback to empty object | `api.ts` |
| R15 | `typebox ^1.1.39` may conflict with OpenClaw bundled version | P2 | PR #19 | Pin `typebox` to OpenClaw 2026.5.28's bundled `1.1.38` | `package.json` |

## Open questions

| ID | Question | Context |
| --- | --- | --- |
| Q1 | Should this package ship TypeScript only or compiled JavaScript? | Closed for current issue: no module-resolution error is present; `./index.ts` remains valid if `openclaw plugins build` passes. Reopen only when a real runtime load failure points to TS/JS resolution. |
| Q2 | Where is the canonical ClawMem API service maintained? | This plugin depends on the external HTTP API endpoint, currently `http://10.0.0.105:7438`. |
| Q3 | Which OpenClaw versions are supported? | Plugin behavior depends on OpenClaw plugin/tool registration APIs. |

## Maintenance rules

- Do not add local machine state to this backlog.
- Do not mark an item complete unless the change is committed or deliberately closed.
- Keep each task scoped enough for one branch and one PR.
- Move completed work to release notes or changelog when a changelog exists.
