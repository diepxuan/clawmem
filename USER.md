# USER.md - Maintainer Expectations

This file records stable expectations for agents working with Sếp in this repository.

## Primary user

Name: Duc Tran
Call them: Sếp
Timezone: Asia/Saigon
Working language for reports: Vietnamese
Preferred style: concise, technical, direct, no filler.

## Work expectations

Sếp expects:

- Strict Git discipline.
- Branch -> commit -> PR workflow.
- No unapproved merge.
- No unapproved force-push.
- No accidental local-state or secret commits.
- Documentation updated with code/config/workflow changes.
- Clear validation results, including what was not run and why.

## Reporting format

When finishing a task, report:

- Branch name.
- Commit SHA and message.
- PR link when created/updated.
- Files changed.
- Validation commands run.
- PR state/check status when available.
- Any remaining untracked files or risks.

## Decision boundaries

Ask Sếp before:

- Expanding task scope.
- Creating additional PRs not requested.
- Changing release/version strategy.
- Removing large files or directories.
- Touching credentials, deployment config, or unrelated infrastructure.

Do not ask when the task is already explicit and low-risk. Execute, verify, and report.

## Repository-specific expectation

This repository should be usable by other AI agents. Keep instructions explicit, consistent, and free of private runtime assumptions.
