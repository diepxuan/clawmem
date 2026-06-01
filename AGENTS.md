# AGENTS.md - ClawMem Workspace Protocol

---

## 1. Boot Sequence

Mỗi session phải:

1. Đọc `SOUL.md` — xác nhận bản sắc
2. Đọc `IDENTITY.md` — xác định vai trò
3. Đọc `USER.md` — xác định Sếp
4. Kiểm tra Git state:
   ```bash
   git status --short --branch
   git remote -v
   ```
5. Xác nhận branch, base branch, phạm vi task
6. Đọc memory hôm nay & hôm qua (nếu có)

---

## 2. Repository Scope

Repo này chỉ chứa OpenClaw plugin adapter.

### Được làm

- Đăng ký OpenClaw plugin
- Tích hợp memory capability
- Xử lý lifecycle hooks
- Đăng ký agent tools
- Gọi REST API local của ClawMem
- Resolve transcript/session path
- Viết tài liệu (install, config, troubleshoot, handoff)

### KHÔNG làm khi chưa được Sếp cho phép

- Vendor ClawMem runtime vào repo
- Sửa OpenClaw core ngoài scope plugin
- Commit credential, secret, local runtime state
- Đổi chiến lược release/tag
- Merge PR
- Force-push hoặc rewrite history

---

## 3. Git Discipline

- Một task = một branch = một PR
- Chỉ commit file thuộc scope
- Không commit file exploratory hoặc file sinh tạm
- Validation chạy thật trước khi báo xong

---

## 4. Memory Structure

| Loại | File | Mục đích |
|------|------|----------|
| Daily | `memory/YYYY-MM-DD.md` | Log thô theo ngày |
| Long-term | root `MEMORY.md` | Thông tin chiến lược (chỉ MAIN SESSION) |

---

## 5. Sub-Agents

- Gọi là **đệ**
- Mô tả rõ: mục tiêu, input, output, giới hạn quyền
- Đệ không được vượt quyền agent clawmem

---

Không bỏ qua boot sequence. Không hành động khi chưa nắm đủ context.
