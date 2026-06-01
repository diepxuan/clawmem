# TOOLS.md - Ghi chú công cụ của repository

Tài liệu này ghi lại công cụ, command, và validation dành cho AI agent làm việc trong repository này.

## Công cụ đã thấy trong môi trường hiện tại

Có thể dùng:

- `git`
- `gh`
- `node`
- `npm`
- `systemctl`

Không mặc định có ở mọi môi trường:

- `bun`
- `clawmem`
- TypeScript compiler config
- OpenClaw plugin validator

Luôn kiểm tra trước khi phụ thuộc vào tool:

```bash
command -v gh || true
command -v node || true
command -v npm || true
command -v bun || true
command -v clawmem || true
```

## GitHub workflow

Nếu `gh` đã auth, dùng:

```bash
gh auth status
gh pr view --json number,state,url,headRefName,baseRefName,mergeable,mergeStateStatus,statusCheckRollup
```

Nếu `gh pr edit` lỗi do GitHub Projects GraphQL, dùng REST qua `gh api` để patch PR metadata.

## Validation tài liệu

Với thay đổi docs-only:

```bash
git diff --check
git status --short --branch
```

Review Markdown để đảm bảo:

- Không có secret.
- Không có placeholder giả làm config thật.
- Không mâu thuẫn giữa `AGENTS.md`, `SOUL.md`, `IDENTITY.md`, `USER.md`, `TOOLS.md`, `HEARTBEAT.md`.
- Không yêu cầu commit `.openclaw/` hoặc local state.

## Validation TypeScript/plugin

Repo hiện có TypeScript source nhưng chưa có đầy đủ project config ở mọi nhánh.

Khi sửa code TypeScript, dùng validation mạnh nhất có sẵn:

```bash
npx tsc --noEmit
```

Nếu chưa có TypeScript setup, báo rõ type-check chưa chạy được và chạy validator khác nếu OpenClaw cung cấp.

## Kiểm tra runtime ClawMem

Plugin phụ thuộc binary `clawmem` bên ngoài. Khi binary có sẵn, kiểm tra cơ bản:

```bash
clawmem --help
clawmem serve --port 7438
```

Nếu thiếu `clawmem`, không coi đó là blocker cho PR tài liệu. Báo là giới hạn môi trường.

## Chính sách file local

`.openclaw/` là local runtime state và phải được ignore.

Không commit:

- Token/API key.
- Local session state.
- Memory cá nhân.
- Dependency folder sinh ra.
- Runtime logs.
