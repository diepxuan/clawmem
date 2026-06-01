# AGENTS.md - ClawMem OpenClaw Plugin Operating Guide

This file is the primary instruction file for AI agents working in this repository.

Project: ClawMem OpenClaw Plugin
Purpose: OpenClaw memory plugin adapter for an external `clawmem` runtime.
Owner decision authority: Duc Tran (Sếp).

## Startup checklist

Before changing anything:

1. Read this file first.
2. Read `SOUL.md`, `IDENTITY.md`, `USER.md`, `TOOLS.md`, and `HEARTBEAT.md` when present in the runtime context.
3. Inspect current Git state:

```bash
git status --short --branch
git remote -v
```

4. Confirm the active branch and scope before edits.
5. For any GitHub work, follow the branch -> commit -> PR workflow. Do not merge without explicit approval.

## Repository scope

This repository contains the OpenClaw plugin adapter only. It should stay focused on adapter code and project documentation.

In scope:

- OpenClaw plugin registration.
- Memory capability integration.
- Lifecycle hook handlers.
- Agent tool registration.
- REST API client calls to local ClawMem service.
- Transcript path resolution.
- Documentation for installation, configuration, operation, troubleshooting, and AI-agent handoff.

Out of scope unless Sếp explicitly approves:

- Vendoring the full ClawMem runtime.
- Editing unrelated OpenClaw core code.
- Adding credentials, local state, or machine-specific secrets.
- Changing release/tag strategy.
- Merging PRs.

## Git discipline

Rules are strict:

- One task equals one branch and one PR unless Sếp explicitly groups related work.
- Start from updated `main` unless Sếp tells otherwise.
- Commit only scoped files.
- Never commit exploratory files unless they are part of the approved task.
- Never force-push unless Sếp explicitly approves history rewrite.
- Never merge without Sếp approval.
- Do not hide untracked files; report them when relevant.

Current version-lane convention for this repository:

- Version/documentation branch names may be exact version strings, for example `0.0.1`, when Sếp asks for that branch name.
- Documentation follow-up for an existing PR should be committed to that PR branch when Sếp asks to update the same PR.

## Documentation discipline

Documentation is mandatory when behavior, configuration, commands, files, or agent workflow changes.

Required docs for this repository:

- `README.md`: user-facing overview, setup, config, operation, troubleshooting.
- `AGENTS.md`: AI-agent operating rules for this repo.
- `SOUL.md`: shared behavior/personality contract for AI agents.
- `IDENTITY.md`: repository-specific AI-agent identity.
- `USER.md`: stable user/team expectations relevant to work in this repo.
- `TOOLS.md`: repo-specific tool and validation notes.
- `HEARTBEAT.md`: periodic/maintenance checklist.
- `docs/TASKS.md`: backlog and known gaps.

When changing one identity/operation document, review the others for consistency in the same PR.

## Local state and secrets

Do not commit local runtime state.

Ignored local state includes:

- `.openclaw/`
- `.env`
- `.env.*` except `.env.example`
- logs, caches, build outputs, and dependency folders.

Never commit tokens, API keys, private host credentials, or personal memory dumps.

## Validation expectations

For documentation-only changes:

```bash
git diff --check
git status --short --branch
```

Also inspect the rendered Markdown mentally for:

- No stale placeholders.
- No contradictory instructions between identity docs.
- No secrets.
- No accidental local-state paths committed as required production state.

For TypeScript/plugin changes, run the strongest available checks in the environment. At minimum:

```bash
git diff --check
node --check <generated-js-file-if-any>
```

If TypeScript tooling exists, prefer:

```bash
npx tsc --noEmit
```

If OpenClaw plugin validation exists, use the project-provided validator.

## Communication standard

When reporting to Sếp:

- Use Vietnamese.
- Be concise and technical.
- State branch, commit, PR link, validation, and remaining risks.
- Do not claim tests passed unless they were actually run.
- Clearly separate completed work from local/untracked files.

## Agent handoff standard

When another AI agent picks up this repo, it should be able to answer:

1. What is the project?
2. What is in scope?
3. What branch am I on?
4. What files are safe to edit?
5. What validation is required?
6. What cannot be committed?
7. What decisions belong to Sếp?

If any answer is unclear, update these docs before or during the PR.
