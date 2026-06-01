# AGENTS.md - Quy tắc vận hành cho AI agent

Tài liệu này là điểm vào chính cho mọi AI agent làm việc trong repository ClawMem.

Dự án: ClawMem OpenClaw Plugin
Mục tiêu: adapter memory plugin cho OpenClaw, kết nối tới runtime `clawmem` bên ngoài.
Người quyết định cuối cùng: Duc Tran (Sếp).

## Trình tự khởi động phiên

Trước khi sửa bất kỳ file nào:

1. Đọc `AGENTS.md` trước.
2. Đọc hoặc dùng ngữ cảnh đã nạp từ các tài liệu nhận diện và vận hành:
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

4. Xác nhận nhánh hiện tại, nhánh nền, và phạm vi tác vụ.
5. Nếu tác vụ liên quan GitHub, dùng quy trình nhánh → commit → PR. Không merge nếu chưa có lệnh rõ từ Sếp.

## Phạm vi repository

Repository này chỉ chứa adapter plugin cho OpenClaw. Giữ phạm vi gọn, tránh biến repo thành nơi chứa runtime hoặc trạng thái cục bộ.

Được làm trong repo này:

- Đăng ký plugin OpenClaw.
- Tích hợp khả năng memory.
- Xử lý móc vòng đời.
- Đăng ký công cụ agent.
- Gọi REST API cục bộ của ClawMem.
- Giải quyết đường dẫn bản ghi và phiên của OpenClaw.
- Viết tài liệu cài đặt, cấu hình, vận hành, xử lý sự cố, và bàn giao cho AI agent khác.

Không làm nếu chưa được Sếp cho phép rõ:

- Đưa toàn bộ runtime ClawMem vào repo này.
- Sửa OpenClaw core ngoài phạm vi plugin.
- Commit thông tin xác thực, bí mật, bộ nhớ cá nhân, hoặc trạng thái runtime cục bộ.
- Đổi chiến lược phát hành hoặc thẻ phiên bản.
- Merge PR.
- Force-push hoặc viết lại lịch sử.

## Kỷ luật Git

Quy tắc bắt buộc:

- Một tác vụ = một nhánh = một PR, trừ khi Sếp gom phạm vi rõ ràng.
- Tạo nhánh từ nhánh nền đúng theo yêu cầu của Sếp.
- Chỉ commit file thuộc phạm vi.
- Không commit file khám phá hoặc file sinh ra tạm thời.
- Không force-push nếu Sếp chưa cho phép.
- Không merge nếu Sếp chưa cho phép.
- Khi có file chưa theo dõi liên quan, báo rõ thay vì bỏ qua.

Với nhánh phiên bản `0.0.1`:

- Nếu Sếp yêu cầu PR nhắm `0.0.1`, tạo nhánh tác vụ từ `origin/0.0.1`.
- PR tiếp theo phải dựa trên `0.0.1`, không dựa trên `main`, trừ khi Sếp đổi chỉ đạo.

## Kỷ luật tài liệu

Phải cập nhật tài liệu khi thay đổi hành vi, cấu hình, lệnh, bố cục file, hoặc quy trình agent.

Nhóm tài liệu chính:

- `README.md`: tài liệu người dùng, cấu hình, vận hành, xử lý sự cố.
- `AGENTS.md`: quy tắc vận hành AI agent trong repo.
- `SOUL.md`: nguyên tắc hành xử chung của AI agent.
- `IDENTITY.md`: danh tính và vai trò của agent trong dự án.
- `USER.md`: kỳ vọng ổn định của Sếp.
- `TOOLS.md`: ghi chú công cụ và kiểm định.
- `HEARTBEAT.md`: danh sách kiểm tra bảo trì định kỳ.
- `docs/TASKS.md`: tồn đọng kỹ thuật.

Khi sửa một tài liệu nhận diện hoặc vận hành, phải rà lại các tài liệu còn lại để tránh mâu thuẫn.

## Trạng thái cục bộ và bí mật

Không commit trạng thái cục bộ.

Luôn bỏ qua hoặc để ngoài Git:

- `.openclaw/`
- `.env`
- `.env.*`, trừ `.env.example`
- nhật ký
- bộ nhớ đệm
- kết quả xây dựng
- thư mục phụ thuộc

Không đưa token, khóa API, máy chủ riêng, nội dung bộ nhớ cá nhân, hoặc bản ghi cục bộ vào repo.

## Kiểm định tối thiểu

Với thay đổi tài liệu:

```bash
git diff --check
git status --short --branch
```

Kiểm tra thêm:

- Không còn chỗ giữ chỗ cũ.
- Không có bí mật.
- Không mâu thuẫn giữa `AGENTS.md`, `SOUL.md`, `IDENTITY.md`, `USER.md`, `TOOLS.md`, `HEARTBEAT.md`.
- Không biến `.openclaw/` hoặc trạng thái cục bộ thành yêu cầu production.

Với thay đổi TypeScript hoặc plugin:

```bash
git diff --check
```

Nếu có công cụ TypeScript:

```bash
npx tsc --noEmit
```

Nếu có trình kiểm định của OpenClaw hoặc plugin host, ưu tiên dùng trình kiểm định chính thức của dự án.

## Chuẩn giao tiếp với Sếp

Báo cáo bằng tiếng Việt có dấu, ngắn gọn, kỹ thuật.

Khi xong việc, báo rõ:

- Nhánh.
- SHA commit.
- Liên kết PR.
- File đã thay đổi.
- Kiểm định đã chạy.
- Trạng thái PR hoặc kiểm tra.
- Rủi ro còn lại hoặc file cục bộ chưa commit nếu có.

## Chuẩn bàn giao cho AI agent khác

Một AI agent mới phải trả lời được:

1. Dự án này là gì.
2. Phạm vi nào được phép sửa.
3. Đang ở nhánh và nhánh nền nào.
4. File nào được chỉnh trong tác vụ hiện tại.
5. Kiểm định nào bắt buộc.
6. File nào không được commit.
7. Quyết định nào thuộc về Sếp.

Nếu câu trả lời chưa rõ, cập nhật tài liệu trước khi báo hoàn tất.
