import { describe, it, expect } from "vitest";
import {
  normalizeAgentId,
  buildOpenClawSessionFilePath,
  DEFAULT_AGENT_ID,
} from "./transcript-resolver.js";

// =============================================================================
// normalizeAgentId
// =============================================================================

describe("normalizeAgentId", () => {
  it("returns DEFAULT_AGENT_ID for empty string", () => {
    expect(normalizeAgentId("")).toBe(DEFAULT_AGENT_ID);
  });

  it("returns DEFAULT_AGENT_ID for undefined", () => {
    expect(normalizeAgentId(undefined)).toBe(DEFAULT_AGENT_ID);
  });

  it("returns DEFAULT_AGENT_ID for null", () => {
    expect(normalizeAgentId(null)).toBe(DEFAULT_AGENT_ID);
  });

  it("returns DEFAULT_AGENT_ID for whitespace-only", () => {
    expect(normalizeAgentId("   ")).toBe(DEFAULT_AGENT_ID);
  });

  it("lowercases valid ids", () => {
    expect(normalizeAgentId("MyAgent")).toBe("myagent");
  });

  it("passes already-valid ids through (lowercased)", () => {
    expect(normalizeAgentId("main")).toBe("main");
    expect(normalizeAgentId("agent-01")).toBe("agent-01");
    expect(normalizeAgentId("test_agent_123")).toBe("test_agent_123");
  });

  it("replaces invalid characters with dashes", () => {
    expect(normalizeAgentId("my agent")).toBe("my-agent");
    expect(normalizeAgentId("my@agent#123")).toBe("my-agent-123");
  });

  it("strips leading dashes after sanitization", () => {
    expect(normalizeAgentId("---agent")).toBe("agent");
  });

  it("strips trailing dashes after sanitization when invalid chars present", () => {
    // @agent has invalid char @ -> gets replaced, resulting in -agent- which then strips
    expect(normalizeAgentId("@agent---")).toBe("agent");
  });

  it("slices to 64 characters", () => {
    const longId = "a".repeat(100);
    const result = normalizeAgentId(longId);
    expect(result.length).toBe(64);
    expect(result).toBe("a".repeat(64));
  });

  it("falls back to DEFAULT_AGENT_ID when sanitized result is empty", () => {
    expect(normalizeAgentId("---")).toBe(DEFAULT_AGENT_ID);
  });
});

// =============================================================================
// buildOpenClawSessionFilePath
// =============================================================================

describe("buildOpenClawSessionFilePath", () => {
  it("returns undefined for empty sessionId", () => {
    expect(buildOpenClawSessionFilePath({ sessionId: "" })).toBeUndefined();
    expect(buildOpenClawSessionFilePath({ sessionId: "  " })).toBeUndefined();
    expect(buildOpenClawSessionFilePath({ sessionId: undefined as unknown as string })).toBeUndefined();
  });

  it("returns undefined for invalid sessionId", () => {
    expect(buildOpenClawSessionFilePath({ sessionId: "../malicious" })).toBeUndefined();
    expect(buildOpenClawSessionFilePath({ sessionId: "has spaces" })).toBeUndefined();
  });

  it("builds path with default agent and no topic", () => {
    const result = buildOpenClawSessionFilePath({
      sessionId: "abc123",
    });
    expect(result).toBeDefined();
    expect(result!).toContain("abc123.jsonl");
    expect(result!).toContain("main");
    expect(result!).toContain("sessions");
  });

  it("builds path with custom agentId", () => {
    const result = buildOpenClawSessionFilePath({
      sessionId: "abc123",
      agentId: "custom-agent",
    });
    expect(result).toBeDefined();
    expect(result!).toContain("custom-agent");
    expect(result!).toContain("abc123.jsonl");
  });

  it("normalizes agentId in path", () => {
    const result = buildOpenClawSessionFilePath({
      sessionId: "abc123",
      agentId: "MY@AGENT",
    });
    expect(result).toBeDefined();
    expect(result!).toContain("my-agent");
  });

  it("builds topic-scoped filename for string topicId", () => {
    const result = buildOpenClawSessionFilePath({
      sessionId: "abc123",
      topicId: "research notes",
    });
    expect(result).toBeDefined();
    expect(result!).toContain("abc123-topic-");
    expect(result!).toContain("research%20notes");
  });

  it("builds topic-scoped filename for numeric topicId", () => {
    const result = buildOpenClawSessionFilePath({
      sessionId: "abc123",
      topicId: 42,
    });
    expect(result).toBeDefined();
    expect(result!).toContain("abc123-topic-42");
  });

  it("uses OPENCLAW_STATE_DIR when set", () => {
    const result = buildOpenClawSessionFilePath({
      sessionId: "abc123",
      env: { OPENCLAW_STATE_DIR: "/custom/state" },
    });
    expect(result).toBeDefined();
    expect(result!).toBe("/custom/state/agents/main/sessions/abc123.jsonl");
  });

  it("uses OPENCLAW_HOME when set", () => {
    const result = buildOpenClawSessionFilePath({
      sessionId: "abc123",
      env: { OPENCLAW_HOME: "/custom/home" },
    });
    expect(result).toBeDefined();
    expect(result!).toBe("/custom/home/.openclaw/agents/main/sessions/abc123.jsonl");
  });

  it("OPENCLAW_STATE_DIR takes precedence over OPENCLAW_HOME", () => {
    const result = buildOpenClawSessionFilePath({
      sessionId: "abc123",
      env: {
        OPENCLAW_STATE_DIR: "/state",
        OPENCLAW_HOME: "/home",
      },
    });
    expect(result).toBeDefined();
    expect(result!).toBe("/state/agents/main/sessions/abc123.jsonl");
  });

  it("resolves ~ in OPENCLAW_HOME", () => {
    const result = buildOpenClawSessionFilePath({
      sessionId: "abc123",
      env: { OPENCLAW_HOME: "~/.config/openclaw" },
    });
    expect(result).toBeDefined();
    expect(result!).not.toContain("~");
    expect(result!).toContain(".config/openclaw/.openclaw/agents/main/sessions/abc123.jsonl");
  });

  it("handles empty topicId as no topic", () => {
    const resultNoTopic = buildOpenClawSessionFilePath({
      sessionId: "abc123",
      topicId: "",
    });
    const resultUndefined = buildOpenClawSessionFilePath({
      sessionId: "abc123",
    });
    expect(resultNoTopic).toBeDefined();
    expect(resultUndefined).toBeDefined();
    expect(resultNoTopic!).toBe(resultUndefined!);
    expect(resultNoTopic!).toContain("abc123.jsonl");
  });
});
