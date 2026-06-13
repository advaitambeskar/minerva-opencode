export * as LongContext from "./long-context"

/**
 * Long-context strategy module.
 *
 * This repo does NOT claim "unlimited context." The correct claim is:
 * "The agent supports virtual long context through local memory, code indexing,
 *  checkpointing, and context reconstruction."
 *
 * Strategy tiers by priority:
 *
 * P0 (active, shipped):
 *  - Context reconstruction (ContextGateway, memory injection, checkpoint)
 *  - Memory.Service (persistent project knowledge)
 *  - Semantic code index (FTS5 + ONNX embeddings for retrieval)
 *
 * P1 (active, shipped):
 *  - Checkpoint-based reconstruction at 75%/90% context usage
 *  - Subagent isolation (each subagent gets a minimal context window)
 *  - ContextGateway budget-bounded retrieval with BEGIN/MIDDLE/END placement
 *
 * P2 (future):
 *  - Prompt compression (summarize less-relevant middle content)
 *  - Map-reduce over large files (chunk → process in parallel → reduce)
 *
 * P3 (research-gated, behind flags):
 *  - vLLM / PagedAttention support for local model serving
 *  - ReasonAlloc-style hierarchical KV-cache allocation for local reasoning models
 *    (see AGENTS.md for the ReasonAlloc paper reference)
 *
 * These research features are gated behind MINERVA_EXPERIMENTAL flags and
 * will not activate unless explicitly enabled.
 */

import { Effect, Layer, Schema } from "effect"
import { SystemContext } from "@minerva-ai/core/system-context/index"
import { SystemContextRegistry } from "@minerva-ai/core/system-context/registry"

// ---------------------------------------------------------------------------
// Context usage monitoring (stub — actual usage comes from the LLM provider)
// ---------------------------------------------------------------------------

export interface ContextUsage {
  /** Tokens used in the current context window */
  used: number
  /** Maximum context window size for the current model */
  max: number
  /** Fraction: 0.0 – 1.0 */
  fraction: number
}

export const WARNING_55_PCT = 0.55
export const WARNING_75_PCT = 0.75
export const RECONSTRUCT_90_PCT = 0.90

export type ContextPressureLevel = "normal" | "warning_55" | "warning_75" | "critical_90"

export function getPressureLevel(usage: ContextUsage): ContextPressureLevel {
  if (usage.fraction >= RECONSTRUCT_90_PCT) return "critical_90"
  if (usage.fraction >= WARNING_75_PCT) return "warning_75"
  if (usage.fraction >= WARNING_55_PCT) return "warning_55"
  return "normal"
}

// ---------------------------------------------------------------------------
// Virtual long-context System Context Source
//
// Injects a brief note about the long-context strategy into every session's
// system context, so the model knows it has access to persistent memory,
// a code index, and checkpoint reconstruction — and does NOT need to repeat
// everything in the conversation.
// ---------------------------------------------------------------------------

const LONG_CONTEXT_KEY = SystemContext.Key.make("core/long-context-strategy")

const LONG_CONTEXT_NOTE = `## Virtual Long Context

This agent maintains virtual long context through:
- **Project Memory** (.agent/MEMORY.md): durable project-wide facts, loaded at session start
- **Session Checkpoint** (.agent/checkpoint.md): resumable session state, reloaded after reconstruction
- **Code Index**: FTS5 + semantic search over all indexed source files via the semantic_search tool
- **Task Graph**: durable task state in .agent/tasks/

When context usage exceeds 75%, a checkpoint is written and context is reconstructed from these sources.
You do NOT need to repeat or summarize conversation history manually — use /checkpoint to save state at any time.
Do NOT claim "unlimited context." Instead, say: "I maintain virtual long context through local memory, indexing, and checkpointing."`

const LongContextStrategyValue = Schema.Struct({ note: Schema.String })

export const layer = Layer.effectDiscard(
  Effect.gen(function* () {
    const registry = yield* SystemContextRegistry.Service

    yield* registry.register({
      key: LONG_CONTEXT_KEY,
      load: Effect.succeed(
        SystemContext.make({
          key: LONG_CONTEXT_KEY,
          codec: Schema.toCodecJson(LongContextStrategyValue),
          load: Effect.succeed({ note: LONG_CONTEXT_NOTE }),
          baseline: (v) => v.note,
          update: (_prev, v) => v.note,
        }),
      ),
    })
  }),
)
