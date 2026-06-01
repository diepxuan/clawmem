# COMPATIBILITY.md — OpenClaw Compatibility Range

Tài liệu này ghi nhận các internal OpenClaw paths mà ClawMem plugin phụ thuộc, version target hiện tại, và rủi ro khi OpenClaw core thay đổi.

---

## 1. OpenClaw version target

| Thuộc tính | Giá trị |
|---|---|
| **Target version** | `2026.4.26` trở lên |
| **Lý do** | `agent_end` void-hook timeout 30s (DEFAULT_VOID_HOOK_TIMEOUT_MS_BY_HOOK) có từ bản này. `before_prompt_build` awaited path ổn định. |
| **Kind** | `memory` (migrate từ `context-engine` qua §14.3) |

Nếu OpenClaw thay đổi hook tên, event payload shape, hoặc state directory layout, plugin có thể cần update.

---

## 2. Internal OpenClaw paths mà ClawMem mirror/reference

### 2.1. Critical — thay đổi sẽ break plugin

| File trong OpenClaw | ClawMem sử dụng | Mức độ rủi ro |
|---|---|---|
| `src/agents/pi-embedded-runner/run/attempt.ts` | Hook await behavior: `before_prompt_build` awaited (~line 1661/2973), `agent_end` fire-and-forget (~line 2226-2249/3870-3892) | **Cao** — nếu core đổi từ awaited sang fire-and-forget hoặc ngược lại, precompact-extract correctness bị ảnh hưởng |
| `src/config/sessions/paths.ts` | Transcript path resolution logic: state-dir layout, session file naming, topic-id filename branch | **Cao** — nếu layout thay đổi, resolver không tìm được transcript |
| `src/config/sessions/types.ts` | `MinimalSessionEntry` shape (sessionId, sessionFile fields) | **Trung bình** — chỉ dùng 2 field, nếu OpenClaw đổi tên field sẽ break |
| `src/routing/session-key.ts` | Agent ID normalization (DEFAULT_AGENT_ID="main", VALID_ID_RE, INVALID_CHARS_RE, normalizeAgentId mirror) | **Cao** — nếu normalization logic thay đổi, resolver sinh path sai |

### 2.2. Moderate — thay đổi có thể gây subtle bug

| File trong OpenClaw | ClawMem sử dụng | Mức độ rủi ro |
|---|---|---|
| `src/config/paths.ts` | State directory resolution: `LEGACY_STATE_DIRNAMES`, `NEW_STATE_DIRNAME`, `resolveStateDir` precedence | **Trung bình** — nếu OpenClaw đổi state dir naming hoặc env var precedence |
| `src/config/sessions/store-read.ts` | sessions.json authoritative lookup | **Trung bình** — nếu store format thay đổi |
| `src/auto-reply/reply/agent-runner-memory.ts` | Compaction threshold derivation (line ~567/386): `contextWindowTokens - reserveTokensFloor - softThresholdTokens` | **Trung bình** — nếu công thức thay đổi, proximity heuristic tính sai |
| `src/plugins/hooks.ts` | Void hook timeout: DEFAULT_VOID_HOOK_TIMEOUT_MS_BY_HOOK (30s) | **Thấp** — chỉ ảnh hưởng khi hook timeout, plugin vẫn fail-open |
| `pi-embedded-subscribe.handlers.compaction.ts` | before_compaction fire-and-forget behavior (~line 25-38) | **Thấp** — chỉ là defense-in-depth fallback |

### 2.3. Event payload shapes

| Hook event type | Fields ClawMem cần | Ghi chú |
|---|---|---|
| `BeforePromptBuildEvent` | `prompt`, `messages` | Stable — ít khả năng đổi |
| `BeforePromptBuildContext` | `sessionId`, `sessionKey`, `workspaceDir`, `agentId` | Stable |
| `AgentEndEvent` | `messages`, `success`, `error`, `durationMs` | Stable |
| `AgentEndContext` | `sessionId`, `agentId`, `sessionKey`, `workspaceDir` | **Không có sessionFile** — lý do cần transcript resolver |
| `BeforeCompactionEvent` | `messageCount`, `tokenCount`, `messages`, `sessionFile` | Có sessionFile — resolver không cần thiết |
| `SessionStartEvent` | `sessionId`, `sessionKey`, `resumedFrom` | Stable |
| `SessionEndEvent` | `sessionId`, `sessionKey`, `messageCount`, `durationMs`, `reason`, `sessionFile` | Stable |
| `BeforeResetEvent` | `sessionFile`, `messages`, `reason` | Có sessionFile — resolver là fallback |
| `BeforeResetContext` | `sessionId`, `sessionKey`, `agentId` | Stable |

---

## 3. Risk assessment

### 3.1. Rủi ro cao nhất

1. **`attempt.ts` hook await behavior thay đổi** — nếu `before_prompt_build` không còn awaited, precompact-extract sẽ mất correctness guarantee. Đây là rủi ro lớn nhất.
2. **State directory layout thay đổi** — nếu OpenClaw đổi từ `~/.openclaw/agents/<agentId>/sessions/` sang layout khác, transcript resolver sẽ không tìm được file.
3. **Agent ID normalization thay đổi** — nếu `normalizeAgentId` logic thay đổi, path construction sẽ sinh sai tên file.

### 3.2. Giảm thiểu rủi ro

- Plugin được thiết kế **fail-open**: hook lỗi → empty context; API unreachable → tool error message; transcript không tìm thấy → skip extraction. Không bao giờ crash agent.
- Transcript resolver có **4 fallback paths** và sessions.json authoritative lookup.
- Proximity ratio clamped `[0.5, 0.95]` để tránh misconfiguration.
- Test coverage cho pure functions (compaction-threshold, transcript-resolver).

---

## 4. Khi nào cần update tài liệu này

- OpenClaw release mới thay đổi hook names, event payload shapes, hoặc state layout.
- Plugin thêm hook mới hoặc đổi hook priority.
- Plugin migrate sang kind khác.
- OpenClaw internal paths trong code comments thay đổi (search `attempt.ts`, `paths.ts`, v.v).

---

## 5. Testing compatibility

Để verify compatibility sau khi OpenClaw update:

```bash
# Kiểm tra hook registration
openclaw status --plugins

# Kiểm tra hook execution
# Tạo session dài > threshold, verify precompact-extract chạy

# Kiểm tra transcript resolution
# Verify session JSONL path resolved đúng

# Kiểm tra agent tools
# clawmem_search, clawmem_get, clawmem_session_log, clawmem_timeline, clawmem_similar
```

---

COMPATIBILITY.md giúp maintainer hiểu rõ plugin phụ thuộc gì vào OpenClaw internals và đánh giá rủi ro khi update.
