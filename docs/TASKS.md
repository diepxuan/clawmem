# TASKS.md - Tồn đọng kỹ thuật ClawMem OpenClaw Plugin

Danh sách tồn đọng kỹ thuật được theo dõi cho người bảo trì và AI agent. Giữ file này trung lập với thực tế và cập nhật khi tác vụ hoàn thành.

Cập nhật lần cuối: 2026-06-01

## Quan trọng

| ID | Tác vụ | Chi tiết | File |
| --- | --- | --- | --- |
| T1 | Thêm kiểm định dự án TypeScript | Repo có file TypeScript nhưng chưa có `tsconfig.json` hoặc kịch bản kiểm định được commit. Thêm đường kiểm định kiểu tối thiểu. | `tsconfig.json`, `package.json` |
| T2 | Định nghĩa trình chạy kiểm thử | Các đường kiểm thử tồn tại trong code nhưng chưa có kiểm thử nào được commit. Thêm kiểm thử đơn vị ban đầu cho logic thuần và các đường móc. | `*.test.ts`, `package.json` |

## Cần thiết

| ID | Tác vụ | Chi tiết | File |
| --- | --- | --- | --- |
| T3 | Giữ README cập nhật | README phải luôn đồng bộ với lược đồ cấu hình, công cụ, móc, và hành vi dịch vụ. | `README.md`, `openclaw.plugin.json`, `tools.ts`, `engine.ts` |
| T4 | Tài liệu hợp đồng móc ClawMem | Liệt kê các lệnh `clawmem hook <tên>` cần thiết và hình dạng đầu vào/đầu ra mong đợi. | `README.md` hoặc `docs/HOOKS.md` |
| T5 | Thêm CI | Thêm GitHub Actions cho kiểm tra khác biệt, kiểm định kiểu, và kiểm thử khi công cụ tồn tại. | `.github/workflows/` |
| T6 | Thêm nhật ký thay đổi | Theo dõi các thay đổi plugin, ghi chú tương thích, và thay đổi phá vỡ. | `CHANGELOG.md` |
| T7 | Định nghĩa phạm vi tương thích OpenClaw | Các chú thích code tham chiếu đường nội bộ OpenClaw. Tài liệu hóa phạm vi phiên bản hoặc commit tương thích. | `README.md`, `docs/COMPATIBILITY.md` |

## Nên có

| ID | Tác vụ | Chi tiết | File |
| --- | --- | --- | --- |
| T8 | Cải thiện ước lượng token | `estimateTokensFromMessages` dùng heuristic ký tự/4. Cân nhắc ước lượng model-aware nếu cần. | `compaction-threshold.ts` |
| T9 | Thêm kiểm thử tích hợp | Dùng `clawmem serve` giả và xác minh gọi công cụ cùng quy trình móc vòng đời. | Bộ kiểm thử |
| T10 | Thêm xử lý sẵn sàng dịch vụ | Kiểm tra liệu `clawmem serve` có phơi bày hoặc nên phơi bày điểm cuối kiểm tra sức khỏe trước khi công cụ phụ thuộc. | `shell.ts`, runtime ClawMem upstream |

## Câu hỏi mở

| ID | Câu hỏi | Ngữ cảnh |
| --- | --- | --- |
| Q1 | Gói này nên chỉ phát hành TypeScript hay cả JavaScript biên dịch? | Điểm vào hiện tại là `index.ts`; không có kết quả xây dựng được commit. |
| Q2 | Repository chính thức của runtime ClawMem ở đâu? | Plugin này phụ thuộc tệp thực thi `clawmem` bên ngoài. |
| Q3 | Phiên bản OpenClaw nào được hỗ trợ? | Hành vi móc và bố cục trạng thái phụ thuộc nội bộ OpenClaw. |

## Quy tắc bảo trì

- Không thêm trạng thái máy cục bộ vào danh sách tồn đọng này.
- Không đánh dấu tác vụ hoàn thành trừ khi thay đổi đã được commit hoặc đóng có chủ đích.
- Giữ mỗi tác vụ đủ phạm vi cho một nhánh và một PR.
- Chuyển công việc hoàn thành sang ghi chú phát hành hoặc nhật ký thay đổi khi nhật ký thay đổi tồn tại.
