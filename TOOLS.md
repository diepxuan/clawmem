# TOOLS.md - clawmem Local Notes

## Available Tools

Check before relying on any tool:

```bash
command -v gh || true
command -v node || true
command -v npm || true
command -v bun || true
command -v clawmem || true
```

## GitHub Workflow

```bash
gh auth status
gh pr view --json number,state,url,headRefName,baseRefName,mergeable
```

If `gh pr edit` fails due to GitHub Projects GraphQL, use `gh api` for PATCH.

## Validation

### Docs-only changes
```bash
git diff --check
git status --short --branch
```

### TypeScript
```bash
npx tsc --noEmit
```

### ClawMem API
```bash
curl -fsS http://10.0.0.105:7438/health
```

This repository is API-only. Do not depend on a local `clawmem` binary in this repo.

## Local Files Policy

`.openclaw/` is local runtime state — must be ignored.

Do NOT commit:
- Tokens/API keys
- Local session state
- Personal memory
- Generated dependency folders
- Runtime logs

## Validation Checklist

Before reporting done:
- No secrets in output
- No fake placeholders acting as real config
- No contradictions between AGENTS.md, SOUL.md, IDENTITY.md, USER.md, TOOLS.md
- No requests to commit `.openclaw/` or local state
