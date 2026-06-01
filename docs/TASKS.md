# TASKS.md - ClawMem OpenClaw Plugin Backlog

Tracked backlog for maintainers and AI agents. Keep this file factual and update it when tasks are completed.

Last updated: 2026-06-01

## Critical

(None — all critical tasks completed)

## Important

| ID | Task | Details | Files |
| --- | --- | --- | --- |
| T1 | Keep README current | README should stay aligned with config schema, tools, hooks, and service behavior. | `README.md`, `openclaw.plugin.json`, `tools.ts`, `engine.ts` |
| T2 | Document ClawMem hook contracts | List required `clawmem hook <name>` commands and expected input/output shape. | `README.md` or `docs/HOOKS.md` |
| T3 | Add CI | Add GitHub Actions for diff hygiene, type-check, and tests when tooling exists. | `.github/workflows/` |
| T4 | Add changelog | Track plugin changes, compatibility notes, and breaking changes. | `CHANGELOG.md` |
| T5 | Define OpenClaw compatibility range | Code comments reference OpenClaw internal paths. Document target version/commit compatibility. | `README.md`, `docs/COMPATIBILITY.md` |

## Nice to have

| ID | Task | Details | Files |
| --- | --- | --- | --- |
| T6 | Improve token estimation | `estimateTokensFromMessages` uses a chars/4 heuristic. Consider model-aware estimation if needed. | `compaction-threshold.ts` |
| T7 | Add integration tests | Use a mock `clawmem serve` and verify tool calls plus lifecycle hook flows. | test suite |
| T8 | Add service readiness handling | Check whether `clawmem serve` exposes or should expose a health endpoint before tools depend on it. | `shell.ts`, upstream ClawMem runtime |

## Open questions

| ID | Question | Context |
| --- | --- | --- |
| Q1 | Should this package ship TypeScript only or compiled JavaScript? | Current entry is `index.ts`; no build output is committed. |
| Q2 | Where is the canonical ClawMem runtime repository? | This plugin depends on the external `clawmem` binary. |
| Q3 | Which OpenClaw versions are supported? | Hook behavior and state layout rely on OpenClaw internals. |

## Maintenance rules

- Do not add local machine state to this backlog.
- Do not mark an item complete unless the change is committed or deliberately closed.
- Keep each task scoped enough for one branch and one PR.
- Move completed work to release notes or changelog when a changelog exists.
