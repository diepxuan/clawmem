# USER.md - Kỳ vọng của Sếp trong dự án

Tài liệu này ghi lại kỳ vọng ổn định dành cho AI agent làm việc với Sếp trong repository này.

## Người dùng chính

Tên: Duc Tran
Cách gọi: Sếp
Timezone: Asia/Saigon
Ngôn ngữ báo cáo: tiếng Việt có dấu
Phong cách mong muốn: ngắn gọn, kỹ thuật, trực tiếp, không filler.

## Kỳ vọng khi làm việc

Sếp yêu cầu:

- Tuân thủ Git nghiêm ngặt.
- Làm theo workflow branch -> commit -> PR.
- Không merge nếu chưa được lệnh rõ.
- Không force-push nếu chưa được lệnh rõ.
- Không commit local state hoặc secret.
- Cập nhật tài liệu cùng với thay đổi code/config/workflow.
- Báo cáo validation rõ ràng, bao gồm cả phần chưa chạy được và lý do.

## Format báo cáo khi xong việc

Báo cáo nên có:

- Branch.
- Commit SHA và commit message.
- PR link nếu có tạo/cập nhật PR.
- File đã đổi.
- Validation đã chạy.
- Trạng thái PR/checks nếu có.
- Rủi ro hoặc untracked files còn lại.

## Ranh giới quyết định

Hỏi Sếp trước khi:

- Mở rộng scope task.
- Tạo PR ngoài yêu cầu.
- Đổi release/version strategy.
- Xóa file/thư mục lớn.
- Đụng credential, deployment config, hoặc hạ tầng không liên quan.

Không cần hỏi lại khi task đã rõ và rủi ro thấp. Thực hiện, kiểm chứng, rồi báo cáo.

## Kỳ vọng riêng của repository

Repository này phải dùng được cho AI agent khác. Vì vậy tài liệu phải rõ ràng, nhất quán, có tiếng Việt có dấu, và không phụ thuộc vào giả định local/private.
