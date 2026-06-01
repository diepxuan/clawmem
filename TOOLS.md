# TOOLS.md - Repository Tooling Notes

This file records tool and validation notes for agents working in this repository.

## Repository tools observed

Available in the current maintenance environment:

- `git`
- `gh`
- `node`
- `npm`
- `systemctl`

Not guaranteed in every environment:

- `bun`
- `clawmem`
- TypeScript compiler config
- OpenClaw plugin validator

Always check before relying on a tool:

```bash
command -v gh || true
command -v node || true
command -v npm || true
command -v bun || true
command -v clawmem || true
```

## GitHub workflow

Use `gh` when authenticated:

```bash
gh auth status
gh pr view --json number,state,url,headRefName,baseRefName,mergeable,mergeStateStatus,statusCheckRollup
```

If `gh pr edit` fails due to GitHub Projects GraphQL issues, use REST via `gh api`.

## Documentation validation

For docs-only changes:

```bash
git diff --check
git status --short --branch
```

Review Markdown for:

- No secrets.
- No placeholder values presented as real config.
- No contradiction between `AGENTS.md`, `SOUL.md`, `IDENTITY.md`, `USER.md`, `TOOLS.md`, and `HEARTBEAT.md`.
- No requirement to commit `.openclaw/` local state.

## TypeScript/plugin validation

The repository currently has TypeScript source files but no committed TypeScript project config.

If adding or changing TypeScript code, prefer the strongest available validation:

```bash
npx tsc --noEmit
```

If no TypeScript setup exists, report that type-checking is unavailable and run whatever syntax/project validation is available from the OpenClaw host.

## ClawMem runtime checks

The plugin depends on an external `clawmem` binary. When available, basic checks are:

```bash
clawmem --help
clawmem serve --port 7438
```

Do not treat missing `clawmem` in a documentation-only PR as a blocker. Report it as an environment limitation.

## Local files policy

`.openclaw/` is local runtime state and must stay ignored.

Do not commit:

- Tokens/API keys.
- Local session state.
- Personal memory dumps.
- Generated dependency folders.
- Runtime logs.
