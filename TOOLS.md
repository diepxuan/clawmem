# TOOLS.md - Ghi chú công cụ của repository

Tài liệu này ghi lại công cụ, lệnh, và kiểm định dành cho AI agent làm việc trong repository này.

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
- Trình biên dịch TypeScript
- Trình kiểm định plugin OpenClaw

Luôn kiểm tra trước khi phụ thuộc vào công cụ:

```bash
command -v gh || true
command -v node || true
command -v npm || true
command -v bun || true
command -v clawmem || true
```

## Quy trình GitHub

Nếu `gh` đã xác thực, dùng:

```bash
gh auth status
gh pr view --json number,state,url,headRefName,baseRefName,mergeable,mergeStateStatus,statusCheckRollup
```

Nếu `gh pr edit` lỗi do GitHub Projects GraphQL, dùng REST qua `gh api` để vá siêu dữ liệu PR.

## Kiểm định tài liệu

Với thay đổi chỉ tài liệu:

```bash
git diff --check
git status --short --branch
```

Duyệt Markdown để đảm bảo:

- Không có bí mật.
- Không có chỗ giữ chỗ giả làm cấu hình thật.
- Không mâu thuẫn giữa `AGENTS.md`, `SOUL.md`, `IDENTITY.md`, `USER.md`, `TOOLS.md`, `HEARTBEAT.md`.
- Không yêu cầu commit `.openclaw/` hoặc trạng thái cục bộ.

## Kiểm định TypeScript và plugin

Repo hiện có mã nguồn TypeScript nhưng chưa có đầy đủ cấu hình dự án ở mọi nhánh.

Khi sửa code TypeScript, dùng kiểm định mạnh nhất có sẵn:

```bash
npx tsc --noEmit
```

Nếu chưa có thiết lập TypeScript, báo rõ kiểm định kiểu chưa chạy được và chạy trình kiểm định khác nếu OpenClaw cung cấp.

## Kiểm tra runtime ClawMem

Plugin phụ thuộc tệp thực thi `clawmem` bên ngoài. Khi tệp thực thi có sẵn, kiểm tra cơ bản:

```bash
clawmem --help
clawmem serve --port 7438
```

Nếu thiếu `clawmem`, không coi đó là vật chặn cho PR tài liệu. Báo là giới hạn môi trường.

## Chính sách file cục bộ

`.openclaw/` là trạng thái runtime cục bộ và phải được bỏ qua.

Không commit:

- Token hoặc khóa API.
- Trạng thái phiên cục bộ.
- Bộ nhớ cá nhân.
- Thư mục phụ thuộc sinh ra.
- Nhật ký runtime.
