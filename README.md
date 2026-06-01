# ClawMem OpenClaw Plugin

ClawMem OpenClaw Plugin là plugin bộ nhớ kết nối agent OpenClaw với runtime ClawMem cục bộ. Plugin đăng ký ClawMem như một tiện ích mở rộng loại `kind: "memory"` của OpenClaw, cung cấp công cụ truy xuất cho agent, chạy các móc vòng đời để trích xuất bộ nhớ, và có thể khởi động dịch vụ REST API ClawMem mà các công cụ sử dụng.

Plugin được thiết kế theo hướng mở rộng khi lỗi: khi tệp thực thi ClawMem hoặc REST API không khả dụng, quá trình thực thi agent vẫn tiếp tục và plugin ghi cảnh báo thay vì làm gãy phiên OpenClaw.

## Mục đích

Repository này chỉ chứa adapter plugin OpenClaw. Engine bộ nhớ thực tế được cung cấp bởi tệp thực thi `clawmem` bên ngoài.

Adapter xử lý:

- Đăng ký plugin OpenClaw.
- Đăng ký khả năng bộ nhớ qua `api.registerMemoryCapability()`.
- Tích hợp móc vòng đời để đưa ngữ cảnh vào prompt lúc xây dựng và trích xuất sau phiên.
- Đăng ký công cụ agent để tìm kiếm và đọc bộ nhớ ClawMem.
- Vòng đời dịch vụ REST API qua `clawmem serve`.
- Giải quyết đường dẫn bản ghi cho các file JSONL phiên OpenClaw.
- Trích xuất nén dự phòng khi cuộc hội thoại tiến gần ngưỡng nén.

## Bố cục repository

```text
.
├── index.ts                  # Điểm vào plugin OpenClaw
├── engine.ts                 # Bộ xử lý móc vòng đời
├── tools.ts                  # Định nghĩa công cụ agent và client REST API
├── shell.ts                  # Phân giải tệp thực thi clawmem, thực thi móc, khởi động dịch vụ
├── session-state.ts          # Trạng thái bootstrap và ngữ cảnh theo phiên
├── transcript-resolver.ts    # Trình phân giải đường dẫn bản ghi OpenClaw
├── compaction-threshold.ts   # Logic ngưỡng và ước lượng token trước khi nén
├── openclaw.plugin.json      # Bản kê plugin và lược đồ cấu hình
├── package.json              # Siêu dữ liệu gói
└── README.md                 # Tài liệu dự án
```

## Yêu cầu

Yêu cầu runtime:

- Plugin host OpenClaw.
- Runtime Node.js tương thích với nạp plugin TypeScript/ESM mà OpenClaw sử dụng.
- Tệp thực thi `clawmem` đã cài đặt hoặc cấu hình với đường dẫn rõ ràng.
- GPU hoặc điểm cuối từ xa tùy chọn cho embedding, trích xuất LLM, và xếp hạng lại.

Yêu cầu phát triển:

- Git.
- Node.js.
- Môi trường phát triển OpenClaw có khả năng xử lý TypeScript.

Repository này không bao gồm tệp thực thi ClawMem. Cài đặt hoặc xây dựng `clawmem` riêng, sau đó đưa vào qua một trong các đường phân giải nhị phân được hỗ trợ.

## Phân giải tệp thực thi

Plugin phân giải tệp thực thi `clawmem` theo thứ tự:

1. `clawmemBin` từ cấu hình plugin, khi được đặt và file tồn tại.
2. Đường dẫn tương đối trong repo dùng cho bố cục phát triển ClawMem.
3. `/usr/local/bin/clawmem`.
4. `$HOME/Projects/forge-stack/skill-forge/clawmem/bin/clawmem`.
5. `$HOME/clawmem/bin/clawmem`.
6. Dự phòng: `clawmem` từ `PATH`.

Khuyến nghị production: đặt `clawmemBin` rõ ràng để tránh phụ thuộc vào PATH hoặc các đường dẫn đặc thù phát triển.

## Bản kê plugin OpenClaw

Bản kê plugin nằm ở `openclaw.plugin.json`:

```json
{
  "id": "clawmem",
  "kind": "memory"
}
```

Plugin kích hoạt qua móc và khả năng công cụ:

```json
{
  "activation": {
    "onCapabilities": ["hook", "tool"]
  }
}
```

## Cấu hình

Plugin chấp nhận các trường cấu hình sau.

### `clawmemBin`

Kiểu: chuỗi

Đường dẫn tới tệp thực thi `clawmem`. Nếu không đặt, plugin dùng thứ tự phân giải nhị phân ở trên.

Ví dụ:

```json
{
  "clawmemBin": "/usr/local/bin/clawmem"
}
```

### `tokenBudget`

Kiểu: số
Mặc định: tùy hồ sơ
Tối thiểu: 100
Tối đa: 4000

Ngân sách token tối đa cho ngữ cảnh đưa vào prompt.

### `profile`

Kiểu: chuỗi
Giá trị cho phép: `speed`, `balanced`, `deep`
Mặc định: `balanced`

Các preset hồ sơ:

| Hồ sơ | Ngân sách |
| --- | ---: |
| `speed` | 400 token |
| `balanced` | 800 token |
| `deep` | 1200 token |

### `enableTools`

Kiểu: boolean
Mặc định: true

Kiểm soát việc plugin có đăng ký công cụ ClawMem cho agent hay không.

### `servePort`

Kiểu: số
Mặc định: 7438
Tối thiểu: 1024
Tối đa: 65535

Cổng cục bộ dùng cho `clawmem serve` và client REST của công cụ.

### `gpuEmbed`

Kiểu: chuỗi

URL điểm cuối embedding. Truyền tới tiến trình ClawMem dưới dạng `CLAWMEM_EMBED_URL`.

### `gpuLlm`

Kiểu: chuỗi

URL điểm cuối LLM. Truyền dưới dạng `CLAWMEM_LLM_URL`.

### `gpuLlmModel`

Kiểu: chuỗi

Tên model gửi tới điểm cuối LLM đã cấu hình. Truyền dưới dạng `CLAWMEM_LLM_MODEL`.

### `gpuLlmReasoningEffort`

Kiểu: chuỗi
Giá trị cho phép: `none`, `minimal`, `low`, `medium`, `high`, `xhigh`

Giá trị `reasoning_effort` tùy chọn ở cấp cao nhất cho các điểm cuối Chat Completions tương thích. Truyền dưới dạng `CLAWMEM_LLM_REASONING_EFFORT`.

### `gpuLlmNoThink`

Kiểu: boolean

Kiểm soát việc ClawMem có thêm `/no_think` vào prompt LLM từ xa hay không. Truyền dưới dạng `CLAWMEM_LLM_NO_THINK`.

### `gpuRerank`

Kiểu: chuỗi

URL điểm cuối xếp hạng lại. Truyền dưới dạng `CLAWMEM_RERANK_URL`.

### `compactionContextWindow`

Kiểu: số
Mặc định: 200000
Tối thiểu: 1000

Ghi đè cửa sổ ngữ cảnh mặc định 200K token. Plugin dùng giá trị này làm cơ sở tính ngưỡng nén.

### `precompactProximityRatio`

Kiểu: số
Mặc định: 0.85
Tối thiểu: 0.5
Tối đa: 0.95

Ghi đè tỉ lệ proximity cho cổng trước nén. Giá trị bị kẹp trong khoảng `[0.5, 0.95]` để tránh cấu hình sai làm vô hiệu hóa trước nén hoàn toàn hoặc kích hoạt ở mỗi phiên. Cũng có thể đặt qua biến môi trường `CLAWMEM_PRECOMPACT_PROXIMITY_RATIO`.

### `softThresholdTokens`

Kiểu: số
Mặc định: 4000
Tối thiểu: 0

Ngưỡng token mềm, khớp với `MemoryFlushPlan.softThresholdTokens` trong OpenClaw. Bị trừ khỏi cửa sổ ngữ cảnh cùng với sàn dự trữ.

### `reserveTokensFloor`

Kiểu: số
Mặc định: 8000
Tối thiểu: 0

Sàn token dự trữ, khớp với `MemoryFlushPlan.reserveTokensFloor` trong OpenClaw. Bị trừ khỏi cửa sổ ngữ cảnh cùng với ngưỡng mềm.

## Ví dụ cấu hình

Cấu hình tối thiểu:

```json
{
  "clawmemBin": "/usr/local/bin/clawmem",
  "profile": "balanced",
  "enableTools": true,
  "servePort": 7438
}
```

Cấu hình có GPU:

```json
{
  "clawmemBin": "/usr/local/bin/clawmem",
  "profile": "deep",
  "tokenBudget": 1200,
  "enableTools": true,
  "servePort": 7438,
  "gpuEmbed": "http://localhost:8088",
  "gpuLlm": "http://localhost:8089",
  "gpuLlmModel": "qwen3",
  "gpuLlmReasoningEffort": "low",
  "gpuLlmNoThink": true,
  "gpuRerank": "http://localhost:8090"
}
```

## Móc vòng đời

Plugin đăng ký các móc vòng đời OpenClaw sau.

### `before_prompt_build`

Đây là đường chờ quan trọng nhất.

Trách nhiệm:

- Dọn dẹp prompt hiện tại trước khi tìm kiếm.
- Đưa ngữ cảnh ClawMem liên quan vào prompt.
- Tiêu thụ ngữ cảnh bootstrap phiên đã lưu ở phiên đưa vào đầu tiên.
- Chạy trích xuất nén dự phòng khi phiên tiến gần ngưỡng nén.

Trích xuất trước nén nằm ở đây vì móc này được chờ trước khi OpenClaw xây dựng prompt hiệu dụng và trước cuộc gọi LLM có thể kích hoạt nén.

### `agent_end`

Móc này chạy công việc trích xuất sau phiên:

- `decision-extractor`
- `handoff-generator`
- `feedback-loop`

OpenClaw xem móc này là không chờ, nên các ghi này là nhất quán cuối cùng. Trích xuất trước nén không phải đường chính xác ở móc này.

### `before_compaction`

Dự phòng phòng thủ cho `precompact-extract`.

Móc này không phải đường chính xác vì có thể đua với nén. Đường chính là `before_prompt_build`.

### `session_start`

Chạy `session-bootstrap` và lưu kết quả cho sự kiện `before_prompt_build` đầu tiên của phiên.

### `session_end`

Xóa trạng thái plugin theo phiên.

### `before_reset`

Chạy đường trích xuất cuối cùng khi có thể, sau đó xóa trạng thái theo phiên.

## Công cụ agent

Khi `enableTools` là true, plugin đăng ký các công cụ sau.

### `clawmem_search`

Tìm kiếm bộ nhớ dài hạn cho ngữ cảnh liên quan.

Tham số:

- `query` chuỗi, bắt buộc.
- `mode` chuỗi, tùy chọn: `auto`, `keyword`, `semantic`, `hybrid`.
- `collection` chuỗi, tùy chọn.
- `limit` số, tùy chọn. Mặc định: 10.
- `compact` boolean, tùy chọn. Mặc định: true.

Điểm cuối REST:

```text
POST /search
```

### `clawmem_get`

Lấy toàn bộ nội dung cho một tài liệu bộ nhớ theo id tài liệu.

Tham số:

- `docid` chuỗi, bắt buộc.

Điểm cuối REST:

```text
GET /documents/:docid
```

### `clawmem_session_log`

Liệt kê các tóm tắt phiên gần đây.

Tham số:

- `limit` số, tùy chọn. Mặc định: 5.

Điểm cuối REST:

```text
GET /sessions?limit=N
```

### `clawmem_timeline`

Hiển thị ngữ cảnh thời gian xung quanh một tài liệu bộ nhớ.

Cách dùng thường gặp: kiểm tra những gì xảy ra trước và sau khi tài liệu hoặc mục bộ nhớ được tạo.

### `clawmem_similar`

Tìm tài liệu giống với một tài liệu bộ nhớ đã cho.

Cách dùng thường gặp: mở rộng kết quả nhớ thành ngữ cảnh liên quan lân cận.

## Dịch vụ REST API

Plugin đăng ký dịch vụ `clawmem-api` khởi động:

```bash
clawmem serve --port <servePort>
```

Các công cụ agent gọi API cục bộ tại:

```text
http://127.0.0.1:<servePort>
```

Nếu `CLAWMEM_API_TOKEN` được đặt, client công cụ gửi nó dưới dạng:

```text
Authorization: Bearer <token>
```

## Phân giải bản ghi

Một số sự kiện vòng đời OpenClaw không bao gồm đường dẫn file bản ghi. Plugin suy ra đường dẫn bản ghi từ bố cục trạng thái OpenClaw:

```text
<state-dir>/agents/<agentId>/sessions/<sessionId>.jsonl
```

Phân giải thư mục trạng thái tuân theo thứ tự ưu tiên tương thích OpenClaw:

1. `OPENCLAW_STATE_DIR`, khi được đặt.
2. `OPENCLAW_HOME/.openclaw`, khi `OPENCLAW_HOME` được đặt.
3. `$HOME/.openclaw`, khi tồn tại.
4. `$HOME/.clawdbot`, dự phòng cũ khi `.openclaw` không tồn tại.
5. `$HOME/.openclaw`, mặc định tổng hợp.

Trình phân giải hoạt động theo hướng mở rộng khi lỗi và trả về không có đường dẫn bản ghi khi file phân giải không tồn tại hoặc id phiên không hợp lệ.

## Hành vi nén

Plugin chạy trích xuất trước nén dự phòng khi ước lượng token phiên tiến gần ngưỡng nén OpenClaw.

Đầu vào ngưỡng mặc định:

- Cửa sổ ngữ cảnh: 200.000 token.
- Sàn dự trữ: 8.000 token.
- Ngưỡng mềm: 4.000 token.
- Tỉ lệ proximity: 0.85.

Ngưỡng hiệu dụng:

```text
contextWindowTokens - reserveTokensFloor - softThresholdTokens
```

Trước nén chạy khi:

```text
estimatedTokens >= proximityRatio * threshold
```

Tỉ lệ proximity có thể ghi đè bằng:

```bash
CLAWMEM_PRECOMPACT_PROXIMITY_RATIO=0.85
```

Giá trị bị kẹp trong khoảng an toàn `[0.5, 0.95]`.

## Biến môi trường

Plugin có thể truyền các biến này tới tiến trình con ClawMem:

| Biến | Nguồn cấu hình | Mục đích |
| --- | --- | --- |
| `CLAWMEM_PROFILE` | `profile` | Hồ sơ truy xuất và trích xuất |
| `CLAWMEM_EMBED_URL` | `gpuEmbed` | Điểm cuối embedding |
| `CLAWMEM_LLM_URL` | `gpuLlm` | Điểm cuối LLM |
| `CLAWMEM_LLM_MODEL` | `gpuLlmModel` | Tên model LLM |
| `CLAWMEM_LLM_REASONING_EFFORT` | `gpuLlmReasoningEffort` | Tham số nỗ lực suy luận |
| `CLAWMEM_LLM_NO_THINK` | `gpuLlmNoThink` | Hành vi `/no_think` |
| `CLAWMEM_RERANK_URL` | `gpuRerank` | Điểm cuối xếp hạng lại |
| `CLAWMEM_API_TOKEN` | Biến môi trường tiến trình | Token Bearer cho gọi REST API |
| `CLAWMEM_PRECOMPACT_PROXIMITY_RATIO` | Biến môi trường tiến trình | Tỉ lệ proximity trước nén |
| `OPENCLAW_STATE_DIR` | Biến môi trường tiến trình | Thư mục trạng thái OpenClaw rõ ràng |
| `OPENCLAW_HOME` | Biến môi trường tiến trình | Ghi đè thư mục home OpenClaw |
| `OPENCLAW_TEST_FAST` | Biến môi trường tiến trình | Lối tắt thư mục trạng thái chế độ kiểm tra |

## Xử lý lỗi

Plugin ưu tiên khả dụng hơn thất bại nghiêm ngặt:

- Lỗi tiến trình con móc trả về ngữ cảnh rỗng thay vì ném lỗi.
- Lỗi hết thời gian móc được ghi nhật ký và mở rộng khi lỗi.
- File bản ghi thiếu bỏ qua các đường trích xuất cần bản ghi.
- Lỗi REST API trả về thông báo lỗi hiển thị cho công cụ thay vì làm crash agent.
- Tệp thực thi `clawmem` thiếu được xem là vấn đề triển khai hoặc cấu hình.

## Kiểm định cục bộ

Kiểm tra repository cơ bản:

```bash
git status --short --branch
git diff --check
node --check index.ts
```

Lưu ý: `node --check` không kiểm định cú pháp TypeScript trong mọi môi trường. Dùng quy trình kiểm định dự án OpenClaw hoặc trình biên dịch TypeScript khi có.

Nếu `clawmem` đã cài đặt, xác minh tệp thực thi và dịch vụ thủ công:

```bash
clawmem --help
clawmem serve --port 7438
```

Sau đó kiểm tra REST API theo tài liệu runtime ClawMem.

## Xử lý sự cố

### Công cụ agent báo rằng API ClawMem không thể truy cập

Kiểm tra:

1. `servePort` khớp với cổng `clawmem serve` đang chạy.
2. Dịch vụ plugin đã khởi động thành công.
3. Không có tiến trình nào khác chiếm cổng.
4. `CLAWMEM_API_TOKEN` khớp với cấu hình máy chủ khi xác thực được bật.

### Móc trả về không có ngữ cảnh bổ sung

Kiểm tra:

1. `clawmemBin` trỏ tới tệp thực thi có thể thực thi.
2. Tên móc tồn tại trong runtime ClawMem.
3. Đường dẫn bản ghi OpenClaw tồn tại.
4. `OPENCLAW_STATE_DIR` hoặc `OPENCLAW_HOME` được đặt đúng khi dùng thư mục trạng thái tùy chỉnh.
5. ClawMem đã lập chỉ mục các bộ sưu tập bộ nhớ liên quan.

### Trích xuất trước nén không chạy

Kiểm tra:

1. Phiên hiện tại có đủ token ước lượng để vượt qua cổng proximity.
2. `CLAWMEM_PRECOMPACT_PROXIMITY_RATIO` không được đặt quá cao.
3. Đường dẫn bản ghi hợp lệ có thể phân giải cho phiên.
4. Việc triển khai không dựa vào các khóa cấu hình plugin không có tài liệu cho ngưỡng nén.

Lưu ý bản kê hiện tại: `openclaw.plugin.json` có `additionalProperties: false` và không phơi bày `compactionContextWindow`, `precompactProximityRatio`, `softThresholdTokens`, hoặc `reserveTokensFloor` như các trường cấu hình plugin được chấp nhận. Ghi đè runtime duy nhất có tài liệu trong README này là biến môi trường `CLAWMEM_PRECOMPACT_PROXIMITY_RATIO`. Các mặc định ngưỡng khác hiện là mặc định cấp code trừ khi lược đồ bản kê được mở rộng trong thay đổi tương lai.

### Plugin hoạt động trong Bun nhưng lỗi trong Node ESM

Plugin này dùng `import.meta.url` để suy ra `__dirname` trong ESM. Tránh phụ thuộc vào các biến toàn cục chỉ có trong Bun khi thêm code mới.

## Ghi chú phát triển

- Giữ repository này tập trung vào lớp adapter OpenClaw.
- Không đưa code runtime ClawMem vào repository plugin này trừ khi phạm vi dự án thay đổi rõ ràng.
- Giữ hành vi plugin mở rộng khi lỗi để lỗi bộ nhớ không làm gãy phiên agent thông thường.
- Khi thêm công cụ mới, ghi tài liệu tên công cụ, tham số, điểm cuối REST, và hành vi lỗi trong README này.
- Khi thêm móc vòng đời mới, ghi tài liệu liệu nó được chờ hay không chờ và liệu nó có quan trọng cho tính chính xác hay không.

## Ghi chú phát hành

Siêu dữ liệu gói phiên bản hiện tại: `0.0.1`.

README này ghi tài liệu kiến trúc plugin và hành vi vận hành cho nhánh tài liệu dự án công khai ban đầu.
