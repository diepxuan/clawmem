# AGENTS.md - Quy tắc vận hành cho AI agent trong dự án ClawMem

Tài liệu này là điểm vào chính cho mọi AI agent làm việc trong repository này.

Dự án: ClawMem OpenClaw Plugin
Mục tiêu: adapter memory plugin cho OpenClaw, kết nối tới runtime `clawmem` bên ngoài.
Người quyết định cuối cùng: Duc Tran (Sếp).

## Checklist khi bắt đầu phiên

Trước khi sửa bất kỳ file nào:

1. Đọc `AGENTS.md` trước.
2. Đọc hoặc dùng context đã nạp từ các tài liệu nhận diện/vận hành:
   - `SOUL.md`
   - `IDENTITY.md`
   - `USER.md`
   - `TOOLS.md`
   - `HEARTBEAT.md`
3. Kiểm tra trạng thái Git:

```bash
git status --short --branch
git remote -v
```

4. Xác nhận branch hiện tại, base branch, và phạm vi task.
5. Nếu task liên quan GitHub, dùng workflow branch -> commit -> PR. Không merge nếu chưa có lệnh rõ từ Sếp.

## Phạm vi repository

Repository này chỉ chứa adapter plugin cho OpenClaw. Giữ scope gọn, tránh biến repo thành nơi chứa runtime hoặc trạng thái local.

Được làm trong repo này:

- Đăng ký OpenClaw plugin.
- Tích hợp memory capability.
- Xử lý lifecycle hooks.
- Đăng ký agent tools.
- Gọi REST API local của ClawMem.
- Resolve transcript/session path của OpenClaw.
- Viết tài liệu cài đặt, cấu hình, vận hành, troubleshooting, và handoff cho AI agent khác.

Không làm nếu chưa được Sếp cho phép rõ:

- Vendor toàn bộ ClawMem runtime vào repo này.
- Sửa OpenClaw core ngoài scope plugin.
- Commit credential, secret, memory cá nhân, hoặc local runtime state.
- Đổi chiến lược release/tag.
- Merge PR.
- Force-push hoặc rewrite history.

## Kỷ luật Git

Quy tắc bắt buộc:

- Một task = một branch = một PR, trừ khi Sếp gom scope rõ ràng.
- Tạo branch từ base đúng theo yêu cầu của Sếp.
- Chỉ commit file thuộc scope.
- Không commit file exploratory hoặc file sinh ra tạm thời.
- Không force-push nếu Sếp chưa cho phép.
- Không merge nếu Sếp chưa cho phép.
- Khi có untracked files liên quan, báo rõ thay vì bỏ qua.

Với lane version `0.0.1`:

- Nếu Sếp yêu cầu PR target `0.0.1`, tạo branch task từ `origin/0.0.1`.
- PR follow-up phải base vào `0.0.1`, không base vào `main`, trừ khi Sếp đổi chỉ đạo.

## Kỷ luật tài liệu

Phải cập nhật tài liệu khi thay đổi behavior, cấu hình, command, file layout, hoặc workflow agent.

Nhóm tài liệu chính:

- `README.md`: tài liệu người dùng, cấu hình, vận hành, troubleshooting.
- `AGENTS.md`: quy tắc vận hành AI agent trong repo.
- `SOUL.md`: nguyên tắc hành xử chung của AI agent.
- `IDENTITY.md`: danh tính/role của agent trong dự án.
- `USER.md`: kỳ vọng ổn định của Sếp.
- `TOOLS.md`: ghi chú công cụ và validation.
- `HEARTBEAT.md`: checklist bảo trì định kỳ.
- `docs/TASKS.md`: backlog kỹ thuật.

Khi sửa một tài liệu nhận diện/vận hành, phải rà lại các tài liệu còn lại để tránh mâu thuẫn.

## Local state và secret

Không commit trạng thái local.

Luôn ignore hoặc để ngoài Git:

- `.openclaw/`
- `.env`
- `.env.*`, trừ `.env.example`
- logs
- cache
- build output
- dependency folders

Không đưa token, API key, private host, nội dung memory cá nhân, hoặc transcript local vào repo.

## Validation tối thiểu

Với thay đổi tài liệu:

```bash
git diff --check
git status --short --branch
```

Kiểm tra thêm:

- Không còn placeholder cũ.
- Không có secret.
- Không mâu thuẫn giữa `AGENTS.md`, `SOUL.md`, `IDENTITY.md`, `USER.md`, `TOOLS.md`, `HEARTBEAT.md`.
- Không biến `.openclaw/` hoặc local state thành yêu cầu production.

Với thay đổi TypeScript/plugin:

```bash
git diff --check
```

Nếu có TypeScript tooling:

```bash
npx tsc --noEmit
```

Nếu có validator của OpenClaw/plugin host, ưu tiên dùng validator chính thức của dự án.

## Chuẩn giao tiếp với Sếp

Báo cáo bằng tiếng Việt có dấu, ngắn gọn, kỹ thuật.

Khi xong việc, báo rõ:

- Branch.
- Commit SHA.
- PR link.
- File đã đổi.
- Validation đã chạy.
- Trạng thái PR/checks.
- Rủi ro còn lại hoặc file local chưa commit nếu có.

## Chuẩn handoff cho AI agent khác

Một AI agent mới phải trả lời được:

1. Dự án này là gì?
2. Scope nào được phép sửa?
3. Đang ở branch/base nào?
4. File nào được edit trong task hiện tại?
5. Validation nào bắt buộc?
6. File nào không được commit?
7. Quyết định nào thuộc về Sếp?

Nếu câu trả lời chưa rõ, cập nhật tài liệu trước khi báo hoàn tất.
