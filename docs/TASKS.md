# TASKS.md - ClawMem OpenClaw Plugin Backlog

Tracked backlog for maintainers and AI agents. Keep this file factual and update it when tasks are completed.

Last updated: 2026-06-02

## Active

| ID | Task | Details | Files | Status |
| --- | --- | --- | --- | --- |
| T1 | Keep README current | README aligned with config schema, API tools, API readiness. | `README.md`, `openclaw.plugin.json`, `tools.ts`, `api.ts` | Ongoing |

## Version 0.0.2 — Hermes Agent integration

| ID | Branch | Task | Details | Status |
| --- | --- | --- | --- | --- |
| T001 | `task/0.0.2-001-deduplicate-apicall` | Deduplicate apiCall in index.ts | Remove local apiCall, import from api.ts | Pending |
| T002 | `task/0.0.2-002-hermes-bridge` | Hermes bridge module | `hermes/bridge.ts` — 5 tools reuse apiCall from api.ts | Pending |
| T003 | `task/0.0.2-003-hermes-skill-docs` | Hermes skill + docs | `hermes/SKILL.md`, `hermes/README.md` | Pending |
| T004 | `task/0.0.2-004-update-docs` | Update README + TASKS.md | Add Hermes section to README, refresh backlog | ✅ Done |
| T005 | `task/0.0.2-005-release` | Release 0.0.2 metadata | Bump version in package.json, plugin.json, CHANGELOG.md | Pending |

Workflow: each task → PR vào `0.0.2` branch → Sếp review → merge → task tiếp.
Sau khi 5 task merge xong: PR `0.0.2 -> main`, merge, tag `0.0.2`.

## Completed (0.0.1)

| ID | Task | Notes |
| --- | --- | --- |
| T3 | Memory provider integration | Plugin owns memory slot, MemorySearchManager, standard tools + corpus supplement |
| T4 | Standard memory tools | memory_search/get/recall/store + clawmem_* legacy aliases |
| T5 | Integration tests | 42 tests (28 tool + 14 manager) with mock API |
| T6 | Service readiness handling | HEAD check + waitForApiReady + fail-open |
| T7 | Compile to JS | Closed: OpenClaw 2026.5.28 loads index.ts directly |

## Deferred

| ID | Task | Reason |
| --- | --- | --- |
| T8 | Auto-recall/auto-capture | Requires upstream ClawMem API support |
| T9 | OpenClaw SDK runtime validation | Pending real runtime testing |

## Known risks

| ID | Risk | Status | Details |
| --- | --- | --- | --- |
| R1 | `_apiReady` cached forever | Resolved in manager.ts (TTL 60s) | |
| R2 | `search()` hardcodes `mode: "auto"` | Follow-up | Map OpenClaw qmd overrides to ClawMem modes |
| R3 | `resolveMemoryBackendConfig` returns `"builtin"` | Research | Needs OpenClaw SDK confirmation |
| R7 | Corpus supplement `get(p)` — `p.lookup` shape unknown | Research | Test with real runtime |
| R13 | `apiCall` — `resp.json()` throws on non-JSON | Follow-up | Wrap JSON parse in separate try/catch |

## Open questions

| ID | Question | Status |
| --- | --- | --- |
| Q2 | Canonical ClawMem API service location | Depends on external endpoint (`http://10.0.0.105:7438`) |
| Q3 | Supported OpenClaw versions | Plugin behavior depends on plugin/tool registration APIs |

## Maintenance rules

- Do not add local machine state to this backlog.
- Do not mark an item complete unless the change is committed or deliberately closed.
- Keep each task scoped enough for one branch and one PR.
- Move completed work to release notes or changelog when a changelog exists.
