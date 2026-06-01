# TASKS.md - ClawMem OpenClaw Plugin Backlog

Tracked backlog for maintainers and AI agents. Keep this file factual and update it when tasks are completed.

Last updated: 2026-06-01

## Critical

(None — all critical tasks completed)

## Important

| ID | Task | Details | Files |
| --- | --- | --- | --- |
| T1 | Keep README current | README should stay aligned with config schema, API tools, and API readiness behavior. | `README.md`, `openclaw.plugin.json`, `tools.ts`, `api.ts` |
| T2 | ~~Define OpenClaw compatibility range~~ | Completed — added `docs/COMPATIBILITY.md` |

## Nice to have

| ID | Task | Details | Files |
| --- | --- | --- | --- |
| T5 | Add integration tests | Use a mock external ClawMem API and verify tool calls plus error handling. | test suite |
| T6 | Add service readiness handling | Check whether the external ClawMem API exposes a stable health endpoint before tools depend on it. | `api.ts`, upstream ClawMem runtime |

## Open questions

| ID | Question | Context |
| --- | --- | --- |
| Q1 | Should this package ship TypeScript only or compiled JavaScript? | Current entry is `index.ts`; no build output is committed. |
| Q2 | Where is the canonical ClawMem API service maintained? | This plugin depends on the external HTTP API endpoint, currently `http://10.0.0.105:7438`. |
| Q3 | Which OpenClaw versions are supported? | Plugin behavior depends on OpenClaw plugin/tool registration APIs. |

## Maintenance rules

- Do not add local machine state to this backlog.
- Do not mark an item complete unless the change is committed or deliberately closed.
- Keep each task scoped enough for one branch and one PR.
- Move completed work to release notes or changelog when a changelog exists.
