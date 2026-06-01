/**
 * ClawMem OpenClaw Plugin — Compaction proximity heuristic
 *
 * After §14.3 migration, ClawMem runs precompact-extract pre-emptively from
 * `before_prompt_build` (synchronous, awaited) when the messages buffer is
 * close to the OpenClaw compaction threshold. This module owns the gating
 * math.
 *
 * The OpenClaw `agent_end` PluginHookName event is fire-and-forget at
 * `src/agents/pi-embedded-runner/run/attempt.ts:2226-2249` (literal comment:
 * "This is fire-and-forget, so we don't await"), so it cannot be the
 * load-bearing path for precompact-extract. `before_prompt_build` IS
 * awaited at `attempt.ts:1661` (its return value `prependContext` is used
 * to build the final prompt) and runs strictly before any LLM call that
 * could trigger compaction on the current turn.
 *
 * Compaction threshold derivation:
 * OpenClaw computes the in-flight compaction threshold as
 *   contextWindowTokens - reserveTokensFloor - softThresholdTokens
 * (see `src/auto-reply/reply/agent-runner-memory.ts:567`).
 *
 * `contextWindowTokens` is per-model and not exposed in the
 * `before_prompt_build` event payload. ClawMem uses a conservative default
 * (200K tokens, matching Claude defaults) that can be overridden via the
 * plugin config. The proximity ratio (PRECOMPACT_PROXIMITY_RATIO) provides
 * additional headroom for sudden token-count jumps.
 *
 * Token estimation is intentionally rough: the plugin runs precompact-extract
 * itself (regex-only, milliseconds), so over-firing is cheap. The cost of
 * under-firing (missed precompact opportunity) is bounded by the
 * `before_compaction` fire-and-forget defense-in-depth fallback.
 */

/**
 * Proximity ratio gate: precompact runs when estimated tokens cross
 * `PRECOMPACT_PROXIMITY_RATIO * compactionThreshold`.
 *
 * 0.85 leaves 15% headroom for a single tool result or long user prompt to
 * push the buffer over the actual compaction trigger. Tunable via env var
 * `CLAWMEM_PRECOMPACT_PROXIMITY_RATIO` (clamped to [0.5, 0.95]).
 */
export const PRECOMPACT_PROXIMITY_RATIO_DEFAULT = 0.85;

/**
 * Default OpenClaw context window in tokens when the plugin config does
 * not override it. Matches Claude's default 200K context window. The
 * threshold subtracts reserve + soft from this number.
 */
export const DEFAULT_CONTEXT_WINDOW_TOKENS = 200_000;

/**
 * Default soft threshold and reserve floor when no MemoryFlushPlan is
 * registered (matches OpenClaw's own defaults at agent-runner-memory.ts:386).
 */
export const DEFAULT_SOFT_THRESHOLD_TOKENS = 4_000;
export const DEFAULT_RESERVE_TOKENS_FLOOR = 8_000;

export type CompactionThresholdConfig = {
  /** Override the conservative 200K default. Plugin config: `compactionContextWindow`. */
  contextWindowTokens?: number;
  /** Override the proximity ratio. Plugin config: `precompactProximityRatio`. */
  precompactProximityRatio?: number;
  /** Soft threshold tokens (matches MemoryFlushPlan.softThresholdTokens). */
  softThresholdTokens?: number;
  /** Reserve floor tokens (matches MemoryFlushPlan.reserveTokensFloor). */
  reserveTokensFloor?: number;
  /** Override the chars-per-token heuristic. Plugin config: `charsPerToken`. */
  charsPerToken?: number;
};

/**
 * Compute the effective compaction threshold from config + defaults.
 * Mirrors the OpenClaw computation at agent-runner-memory.ts:567.
 */
export function resolveCompactionThreshold(cfg: CompactionThresholdConfig): number {
  const contextWindow = cfg.contextWindowTokens ?? DEFAULT_CONTEXT_WINDOW_TOKENS;
  const reserve = cfg.reserveTokensFloor ?? DEFAULT_RESERVE_TOKENS_FLOOR;
  const soft = cfg.softThresholdTokens ?? DEFAULT_SOFT_THRESHOLD_TOKENS;
  const threshold = contextWindow - reserve - soft;
  // Floor at a small positive number to avoid divide-by-zero in proximity gate
  return Math.max(threshold, 1_000);
}

/**
 * Resolve the proximity ratio from config, env var, and default. Clamped
 * to a safe range so misconfigured ratios cannot disable precompact entirely
 * (very high ratio) or fire on every turn (very low ratio).
 */
export function resolveProximityRatio(cfg: CompactionThresholdConfig): number {
  const fromConfig = cfg.precompactProximityRatio;
  const fromEnv = (() => {
    const raw = process.env.CLAWMEM_PRECOMPACT_PROXIMITY_RATIO;
    if (!raw) return undefined;
    const parsed = Number.parseFloat(raw);
    return Number.isFinite(parsed) ? parsed : undefined;
  })();
  const ratio = fromConfig ?? fromEnv ?? PRECOMPACT_PROXIMITY_RATIO_DEFAULT;
  // Clamp to safe range
  if (ratio < 0.5) return 0.5;
  if (ratio > 0.95) return 0.95;
  return ratio;
}

/**
 * Default chars-per-token ratios for common model families.
 * These are rough rules-of-thumb — not exact tokenizers.
 *
 * | Model family | Chars/token | Source |
 * |---|---|---|
 * | OpenAI (GPT-3.5/4) | 4.0 | OpenAI cookbook |
 * | Claude (2/3) | 3.2–3.5 | Anthropic docs |
 * | Qwen 2/2.5 | 2.0–2.5 | Tokenizer benchmark |
 * | Llama 3/3.1 | 3.0–3.5 | Meta tokenizer |
 *
 * Default 3.5 is conservative — slightly over-estimates token count,
 * which means precompact fires a bit earlier (safe).
 */
const MODEL_CHARS_PER_TOKEN: Record<string, number> = {
  "gpt": 4.0,
  "openai": 4.0,
  "claude": 3.4,
  "anthropic": 3.4,
  "qwen": 2.5,
  "llama": 3.2,
  "mistral": 3.5,
  "gemini": 4.0,
};

const DEFAULT_CHARS_PER_TOKEN = 3.5;

/**
 * Estimate chars-per-token ratio from a model identifier.
 * Does a case-insensitive substring match against known families.
 * Falls back to DEFAULT_CHARS_PER_TOKEN (3.5) for unknown models.
 */
export function resolveCharsPerToken(modelId?: string): number {
  if (!modelId) return DEFAULT_CHARS_PER_TOKEN;
  const lower = modelId.toLowerCase();
  for (const [key, ratio] of Object.entries(MODEL_CHARS_PER_TOKEN)) {
    if (lower.includes(key)) return ratio;
  }
  return DEFAULT_CHARS_PER_TOKEN;
}

/**
 * Estimate token count from a messages array. Intentionally cheap and
 * conservative — the precompact-extract handler is regex-only (milliseconds),
 * so over-firing has near-zero cost.
 *
 * Uses a configurable chars-per-token heuristic (default 3.5).
 * Walks the messages array best-effort, handling unknown shapes by
 * stringifying and estimating from the result length.
 *
 * @param messages — array of message objects
 * @param charsPerToken — optional override; auto-detected from modelId if omitted
 * @param modelId — optional model identifier for auto-detection
 */
export function estimateTokensFromMessages(
  messages: unknown[] | undefined,
  charsPerToken?: number,
  modelId?: string,
): number {
  if (!Array.isArray(messages) || messages.length === 0) return 0;
  const cpt = charsPerToken ?? resolveCharsPerToken(modelId);
  let totalChars = 0;
  for (const msg of messages) {
    if (typeof msg === "string") {
      totalChars += msg.length;
      continue;
    }
    if (msg && typeof msg === "object") {
      // Extract text-like fields fast-path: content string, content array of
      // {type: 'text', text} items, or fall back to JSON length.
      const m = msg as Record<string, unknown>;
      const content = m.content;
      if (typeof content === "string") {
        totalChars += content.length;
      } else if (Array.isArray(content)) {
        for (const part of content) {
          if (typeof part === "string") {
            totalChars += part.length;
          } else if (part && typeof part === "object") {
            const p = part as Record<string, unknown>;
            if (typeof p.text === "string") {
              totalChars += p.text.length;
            } else {
              try {
                totalChars += JSON.stringify(p).length;
              } catch {
                // Skip un-serializable parts
              }
            }
          }
        }
      } else {
        try {
          totalChars += JSON.stringify(msg).length;
        } catch {
          // Skip un-serializable messages
        }
      }
    }
  }
  // Conversion using configured or detected chars-per-token ratio
  return Math.ceil(totalChars / cpt);
}

/**
 * The proximity gate: returns true iff estimated tokens are at or above
 * `proximityRatio * threshold`. Pure function for unit testing.
 */
export function isWithinPrecompactProximity(params: {
  estimatedTokens: number;
  threshold: number;
  proximityRatio: number;
}): boolean {
  return params.estimatedTokens >= params.proximityRatio * params.threshold;
}
