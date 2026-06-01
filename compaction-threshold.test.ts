import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  resolveCompactionThreshold,
  resolveProximityRatio,
  estimateTokensFromMessages,
  isWithinPrecompactProximity,
  resolveCharsPerToken,
  PRECOMPACT_PROXIMITY_RATIO_DEFAULT,
  DEFAULT_CONTEXT_WINDOW_TOKENS,
  DEFAULT_SOFT_THRESHOLD_TOKENS,
  DEFAULT_RESERVE_TOKENS_FLOOR,
} from "./compaction-threshold.js";

// =============================================================================
// resolveCompactionThreshold
// =============================================================================

describe("resolveCompactionThreshold", () => {
  it("uses all defaults when config is empty", () => {
    const result = resolveCompactionThreshold({});
    const expected = DEFAULT_CONTEXT_WINDOW_TOKENS - DEFAULT_RESERVE_TOKENS_FLOOR - DEFAULT_SOFT_THRESHOLD_TOKENS;
    expect(result).toBe(expected); // 200000 - 8000 - 4000 = 188000
  });

  it("uses custom contextWindowTokens when provided", () => {
    const result = resolveCompactionThreshold({ contextWindowTokens: 100_000 });
    expect(result).toBe(100_000 - 8_000 - 4_000);
  });

  it("uses custom reserve and soft values", () => {
    const result = resolveCompactionThreshold({
      reserveTokensFloor: 5_000,
      softThresholdTokens: 2_000,
    });
    expect(result).toBe(200_000 - 5_000 - 2_000);
  });

  it("floors at 1000 to avoid divide-by-zero", () => {
    const result = resolveCompactionThreshold({
      contextWindowTokens: 10_000,
      reserveTokensFloor: 8_000,
      softThresholdTokens: 5_000, // would be -3000
    });
    expect(result).toBe(1_000);
  });

  it("handles zero values", () => {
    const result = resolveCompactionThreshold({
      reserveTokensFloor: 0,
      softThresholdTokens: 0,
    });
    expect(result).toBe(200_000);
  });
});

// =============================================================================
// resolveProximityRatio
// =============================================================================

describe("resolveProximityRatio", () => {
  const savedEnv = process.env.CLAWMEM_PRECOMPACT_PROXIMITY_RATIO;

  beforeEach(() => {
    delete process.env.CLAWMEM_PRECOMPACT_PROXIMITY_RATIO;
  });

  afterEach(() => {
    if (savedEnv !== undefined) {
      process.env.CLAWMEM_PRECOMPACT_PROXIMITY_RATIO = savedEnv;
    } else {
      delete process.env.CLAWMEM_PRECOMPACT_PROXIMITY_RATIO;
    }
  });

  it("uses default when no config or env", () => {
    expect(resolveProximityRatio({})).toBe(PRECOMPACT_PROXIMITY_RATIO_DEFAULT);
  });

  it("uses config value over default", () => {
    expect(resolveProximityRatio({ precompactProximityRatio: 0.9 })).toBe(0.9);
  });

  it("uses env var when no config", () => {
    process.env.CLAWMEM_PRECOMPACT_PROXIMITY_RATIO = "0.75";
    expect(resolveProximityRatio({})).toBe(0.75);
  });

  it("config takes precedence over env var", () => {
    process.env.CLAWMEM_PRECOMPACT_PROXIMITY_RATIO = "0.5";
    expect(resolveProximityRatio({ precompactProximityRatio: 0.9 })).toBe(0.9);
  });

  it("clamps low values to 0.5", () => {
    expect(resolveProximityRatio({ precompactProximityRatio: 0.1 })).toBe(0.5);
    expect(resolveProximityRatio({ precompactProximityRatio: 0 })).toBe(0.5);
    expect(resolveProximityRatio({ precompactProximityRatio: -1 })).toBe(0.5);
  });

  it("clamps high values to 0.95", () => {
    expect(resolveProximityRatio({ precompactProximityRatio: 0.99 })).toBe(0.95);
    expect(resolveProximityRatio({ precompactProximityRatio: 1.5 })).toBe(0.95);
  });

  it("handles invalid env var by falling back to default", () => {
    process.env.CLAWMEM_PRECOMPACT_PROXIMITY_RATIO = "not-a-number";
    expect(resolveProximityRatio({})).toBe(PRECOMPACT_PROXIMITY_RATIO_DEFAULT);
  });
});

// =============================================================================
// estimateTokensFromMessages
// =============================================================================

describe("estimateTokensFromMessages", () => {
  it("returns 0 for undefined", () => {
    expect(estimateTokensFromMessages(undefined)).toBe(0);
  });

  it("returns 0 for empty array", () => {
    expect(estimateTokensFromMessages([])).toBe(0);
  });

  it("estimates from string messages (default charsPerToken=3.5)", () => {
    const messages = ["hello world", "test message"];
    const chars = "hello world".length + "test message".length;
    expect(estimateTokensFromMessages(messages)).toBe(Math.ceil(chars / 3.5));
  });

  it("estimates from string messages with explicit charsPerToken", () => {
    const messages = ["hello world"];
    expect(estimateTokensFromMessages(messages, 4.0)).toBe(Math.ceil(11 / 4.0));
    expect(estimateTokensFromMessages(messages, 2.5)).toBe(Math.ceil(11 / 2.5));
  });

  it("estimates from object messages with content string", () => {
    const messages = [{ role: "user", content: "hello" }];
    expect(estimateTokensFromMessages(messages as unknown[])).toBe(Math.ceil(5 / 3.5));
  });

  it("estimates from object messages with content array of strings", () => {
    const messages = [{ content: ["hello", " world"] }];
    expect(estimateTokensFromMessages(messages as unknown[])).toBe(Math.ceil(11 / 3.5));
  });

  it("estimates from content array with text objects", () => {
    const messages = [{ content: [{ type: "text", text: "hello" }] }];
    expect(estimateTokensFromMessages(messages as unknown[])).toBe(Math.ceil(5 / 3.5));
  });

  it("falls back to JSON stringify for unknown shapes", () => {
    const messages = [{ role: "user", name: "test" }];
    const jsonLen = JSON.stringify(messages[0]).length;
    expect(estimateTokensFromMessages(messages as unknown[])).toBe(Math.ceil(jsonLen / 3.5));
  });

  it("handles mixed message types", () => {
    const messages = [
      "plain string",
      { role: "user", content: "object content" },
      { content: [{ type: "text", text: "text part" }] },
    ];
    const chars = "plain string".length + "object content".length + "text part".length;
    expect(estimateTokensFromMessages(messages as unknown[])).toBe(Math.ceil(chars / 3.5));
  });
});

// =============================================================================
// resolveCharsPerToken
// =============================================================================

describe("resolveCharsPerToken", () => {
  it("returns default for undefined modelId", () => {
    expect(resolveCharsPerToken(undefined)).toBe(3.5);
  });

  it("returns default for empty string", () => {
    expect(resolveCharsPerToken("")).toBe(3.5);
  });

  it("detects OpenAI models", () => {
    expect(resolveCharsPerToken("gpt-3.5-turbo")).toBe(4.0);
    expect(resolveCharsPerToken("gpt-4o")).toBe(4.0);
    expect(resolveCharsPerToken("openai/gpt-4")).toBe(4.0);
  });

  it("detects Claude models", () => {
    expect(resolveCharsPerToken("claude-3-opus")).toBe(3.4);
    expect(resolveCharsPerToken("anthropic/claude-sonnet")).toBe(3.4);
  });

  it("detects Qwen models", () => {
    expect(resolveCharsPerToken("qwen2.5-72b")).toBe(2.5);
    expect(resolveCharsPerToken("qwen-plus")).toBe(2.5);
  });

  it("detects Llama models", () => {
    expect(resolveCharsPerToken("llama-3.1-70b")).toBe(3.2);
    expect(resolveCharsPerToken("llama3")).toBe(3.2);
  });

  it("returns default for unknown models", () => {
    expect(resolveCharsPerToken("some-unknown-model")).toBe(3.5);
  });

  it("case-insensitive matching", () => {
    expect(resolveCharsPerToken("GPT-4O")).toBe(4.0);
    expect(resolveCharsPerToken("CLAUDE-3")).toBe(3.4);
    expect(resolveCharsPerToken("QWEN2.5")).toBe(2.5);
  });
});

// =============================================================================
// isWithinPrecompactProximity
// =============================================================================

describe("isWithinPrecompactProximity", () => {
  it("returns true when estimated tokens meet threshold", () => {
    expect(isWithinPrecompactProximity({
      estimatedTokens: 160_000,
      threshold: 188_000,
      proximityRatio: 0.85,
    })).toBe(true); // 188000 * 0.85 = 159800, 160000 >= 159800
  });

  it("returns false when estimated tokens below threshold", () => {
    expect(isWithinPrecompactProximity({
      estimatedTokens: 100_000,
      threshold: 188_000,
      proximityRatio: 0.85,
    })).toBe(false);
  });

  it("returns true at exact boundary", () => {
    expect(isWithinPrecompactProximity({
      estimatedTokens: 85,
      threshold: 100,
      proximityRatio: 0.85,
    })).toBe(true);
  });

  it("returns false just below boundary", () => {
    expect(isWithinPrecompactProximity({
      estimatedTokens: 84,
      threshold: 100,
      proximityRatio: 0.85,
    })).toBe(false);
  });

  it("handles zero tokens", () => {
    expect(isWithinPrecompactProximity({
      estimatedTokens: 0,
      threshold: 100,
      proximityRatio: 0.85,
    })).toBe(false);
  });
});
