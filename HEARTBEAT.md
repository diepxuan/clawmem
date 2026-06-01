# HEARTBEAT.md - Repository Maintenance Checklist

This file is for periodic repository maintenance by AI agents. Keep it short and safe.

If a heartbeat runner reads this file, it may perform lightweight checks and report only when something needs attention.

## Safe heartbeat checks

Allowed without additional approval:

```bash
git status --short --branch
git remote -v
git log --oneline --decorate -5
git diff --check
```

For open PRs, when `gh` is authenticated:

```bash
gh pr list --state open --json number,title,headRefName,baseRefName,mergeStateStatus,url
gh pr checks --watch=false
```

## Report when

Report to Sếp when:

- Working tree has unexpected tracked modifications.
- A PR is failing checks.
- A PR becomes conflicting.
- Documentation contradicts code/config.
- Local state appears staged for commit.
- A requested branch/PR is missing.

Stay quiet or return heartbeat OK when:

- No tracked changes exist.
- No PR/check needs attention.
- Only ignored local runtime state exists.

## Do not do during heartbeat

Do not:

- Merge PRs.
- Force-push.
- Delete files/directories.
- Rewrite history.
- Make architecture changes.
- Commit speculative cleanup.

Heartbeat work should observe and report, not surprise the maintainer.
