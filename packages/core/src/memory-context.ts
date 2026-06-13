export * as MemoryContext from "./memory-context"

/**
 * System Context source for project memory files in `.agent/`.
 *
 * Reads .agent/MEMORY.md and (when present) .agent/checkpoint.md and injects
 * a compact memory card at each provider-turn boundary.
 *
 * This is a lightweight read-only context source (like InstructionContext) that
 * lives in packages/core so it can be wired into the Location layer without
 * depending on the opencode-package Memory.Service. The full Memory.Service
 * (FTS indexing, write operations, secret redaction) lives in packages/minerva.
 */

import path from "path"
import { Effect, Layer, Schema } from "effect"
import { FSUtil } from "./fs-util"
import { Flag } from "./flag/flag"
import { Location } from "./location"
import { SystemContext } from "./system-context/index"
import { SystemContextRegistry } from "./system-context/registry"

const MEMORY_KEY = SystemContext.Key.make("core/project-memory")
const CHECKPOINT_KEY = SystemContext.Key.make("core/session-checkpoint")

const MemoryValue = Schema.Struct({
  path: Schema.String,
  content: Schema.String,
})
type MemoryValue = typeof MemoryValue.Type

const CardValue = Schema.Struct({
  kind: Schema.String,
  content: Schema.String,
})
type CardValue = typeof CardValue.Type

/** Max chars to inject for memory card (prevents oversized context) */
const MEMORY_BUDGET = 3000
/** Max chars to inject for checkpoint card */
const CHECKPOINT_BUDGET = 2000

function truncateToLines(content: string, maxChars: number): string {
  if (content.length <= maxChars) return content
  const truncated = content.slice(0, maxChars)
  const lastNewline = truncated.lastIndexOf("\n")
  return lastNewline > 0 ? truncated.slice(0, lastNewline) + "\n\n[... truncated for context window ...]" : truncated
}

export const layer = Layer.effectDiscard(
  Effect.gen(function* () {
    const fs = yield* FSUtil.Service
    const location = yield* Location.Service
    const registry = yield* SystemContextRegistry.Service

    if (Flag.MINERVA_DISABLE_PROJECT_CONFIG) return

    const projectDir = location.project.directory

    // -----------------------------------------------------------------------
    // Memory card: inject .agent/MEMORY.md at session start
    // -----------------------------------------------------------------------
    yield* registry.register({
      key: MEMORY_KEY,
      load: Effect.gen(function* () {
        const memPath = path.join(projectDir, ".agent", "MEMORY.md")
        const content = yield* fs.readFileStringSafe(memPath)

        if (!content) return SystemContext.empty

        const truncated = truncateToLines(content, MEMORY_BUDGET)
        const value: CardValue = { kind: "memory", content: truncated }

        return SystemContext.make({
          key: MEMORY_KEY,
          codec: Schema.toCodecJson(CardValue),
          load: Effect.succeed(value),
          baseline: (v) =>
            `<ProjectMemory path="${memPath}">\n${v.content}\n</ProjectMemory>`,
          update: (_prev, v) =>
            `<ProjectMemory path="${memPath}" updated="true">\n${v.content}\n</ProjectMemory>`,
          removed: () =>
            "Previously loaded project memory no longer applies.",
        })
      }).pipe(
        Effect.catch(() => Effect.succeed(SystemContext.empty)),
      ),
    })

    // -----------------------------------------------------------------------
    // Checkpoint card: inject .agent/checkpoint.md when resuming
    // -----------------------------------------------------------------------
    yield* registry.register({
      key: CHECKPOINT_KEY,
      load: Effect.gen(function* () {
        const checkpointPath = path.join(projectDir, ".agent", "checkpoint.md")
        const content = yield* fs.readFileStringSafe(checkpointPath)

        if (!content) return SystemContext.empty

        const truncated = truncateToLines(content, CHECKPOINT_BUDGET)
        const value: CardValue = { kind: "checkpoint", content: truncated }

        return SystemContext.make({
          key: CHECKPOINT_KEY,
          codec: Schema.toCodecJson(CardValue),
          load: Effect.succeed(value),
          baseline: (v) =>
            `<SessionCheckpoint path="${checkpointPath}">\n${v.content}\n</SessionCheckpoint>`,
          update: (_prev, v) =>
            `<SessionCheckpoint path="${checkpointPath}" updated="true">\n${v.content}\n</SessionCheckpoint>`,
          removed: () =>
            "Previously loaded session checkpoint no longer applies.",
        })
      }).pipe(
        Effect.catch(() => Effect.succeed(SystemContext.empty)),
      ),
    })
  }),
)
