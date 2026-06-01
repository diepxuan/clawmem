# HEARTBEAT.md - Checklist bảo trì định kỳ

Tài liệu này dành cho AI agent hoặc heartbeat runner kiểm tra repository định kỳ. Giữ nội dung ngắn, an toàn, không tự ý thay đổi lớn.

Nếu heartbeat đọc file này, chỉ nên chạy kiểm tra nhẹ và báo khi có vấn đề cần Sếp chú ý.

## Kiểm tra an toàn

Được phép chạy mà không cần hỏi thêm:

```bash
git status --short --branch
git remote -v
git log --oneline --decorate -5
git diff --check
```

Nếu `gh` đã auth, có thể kiểm tra PR mở:

```bash
gh pr list --state open --json number,title,headRefName,baseRefName,mergeStateStatus,url
gh pr checks --watch=false
```

## Khi nào cần báo Sếp

Báo khi:

- Working tree có tracked modifications bất thường.
- PR fail checks.
- PR bị conflict.
- Tài liệu mâu thuẫn với code/config.
- Local state bị stage nhầm.
- Branch/PR được yêu cầu nhưng chưa tồn tại.

Im lặng hoặc trả heartbeat OK khi:

- Không có tracked changes.
- Không có PR/check cần xử lý.
- Chỉ có ignored local runtime state.

## Không làm trong heartbeat

Không được:

- Merge PR.
- Force-push.
- Xóa file/thư mục.
- Rewrite history.
- Đổi kiến trúc.
- Commit cleanup suy đoán.

Heartbeat chỉ quan sát và báo cáo, không gây bất ngờ cho maintainer.
