export * as ContextGateway from "./context-gateway"

/**
 * ContextGateway
 *
 * The central facade for context retrieval and reconstruction. Used by:
 *  - Subagent launch (build minimal context for each subagent)
 *  - Checkpoint trigger at 90% context usage (reconstructContext)
 *  - Context card assembly for any agent turn
 *
 * Budget-bounded retrieval order (BEGIN/MIDDLE/END placement to mitigate
 * "lost in the middle" — relevant content at start and end of context):
 *
 * Beginning:
 *  - System instructions (mustKeep, handled separately)
 *  - Current mode + active goal
 *  - Active task tree summary
 *  - Key project memory (Commands, Conventions, Known Pitfalls, Decisions)
 *
 * Middle:
 *  - Supporting code chunks (P2 semantic index)
 *  - Task progress notes
 *  - Notes scratchpad relevant sections
 *  - Checkpoint (loaded separately as mustKeep Context Source)
 *
 * End:
 *  - Exact user request (handled by conversation)
 *  - Target file snippets (via read tool)
 *  - Failing test output
 *  - Next action
 */

import { Context, Effect, Layer } from "effect"
import { Memory } from "@/memory/memory"
import { TaskGraph } from "@/task-graph/task-graph"
import { AgentDatabase } from "@/agent-db/database"
import { LayerNode } from "@minerva-ai/core/effect/layer-node"

export type TokenBudget = number

export interface ContextItem {
  kind: "memory" | "code" | "task" | "checkpoint" | "notes"
  content: string
  source?: string
}

export interface CompiledContext {
  beginning: ContextItem[]
  middle: ContextItem[]
  totalChars: number
}

export interface Interface {
  /** Retrieve memory items relevant to a query, within a token budget */
  readonly searchMemory: (query: string, budget: TokenBudget) => Effect.Effect<ContextItem[]>
  /** Retrieve code context relevant to a query, within a token budget (P2) */
  readonly searchCode: (query: string, budget: TokenBudget) => Effect.Effect<ContextItem[]>
  /** Get task progress for specific task IDs, within a budget */
  readonly getTaskProgress: (taskIds: string[], budget: TokenBudget) => Effect.Effect<ContextItem[]>
  /** Get the current checkpoint, within a budget */
  readonly getCheckpoint: (budget: TokenBudget) => Effect.Effect<ContextItem[]>
  /** Build a compiled context for a subagent, given its task description */
  readonly buildForAgent: (agentName: string, task: string, totalBudget: TokenBudget) => Effect.Effect<CompiledContext>
}

export class Service extends Context.Service<Service, Interface>()("@minerva/ContextGateway") {}

const CHARS_PER_TOKEN = 4 // rough approximation: 1 token ≈ 4 chars

export const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const memory = yield* Memory.Service
    const taskGraph = yield* TaskGraph.Service
    const db = yield* AgentDatabase.Service

    const searchMemory = (query: string, budget: TokenBudget) =>
      db.searchMemory(query, 30).pipe(
        Effect.map((rows) => {
          const budgetChars = budget * CHARS_PER_TOKEN
          const items: ContextItem[] = []
          let used = 0
          for (const row of rows) {
            const content = `[${row.kind} / ${row.section}]\n${row.body}`
            if (used + content.length > budgetChars) break
            items.push({ kind: "memory", content, source: row.path })
            used += content.length
          }
          return items
        }),
      )

    const searchCode = (_query: string, _budget: TokenBudget) =>
      // P2: returns empty until semantic index is implemented
      Effect.succeed([] as ContextItem[])

    const getTaskProgress = (taskIds: string[], budget: TokenBudget) =>
      Effect.gen(function* () {
        const budgetChars = budget * CHARS_PER_TOKEN
        const items: ContextItem[] = []
        let used = 0
        for (const id of taskIds) {
          const task = yield* taskGraph.get(id)
          if (!task) continue
          const content = `Task ${task.id}: ${task.title} [${task.status}]\n${task.description}`
          if (used + content.length > budgetChars) break
          items.push({ kind: "task", content, source: id })
          used += content.length
        }
        return items
      })

    const getCheckpoint = (budget: TokenBudget) =>
      memory.readCheckpoint().pipe(
        Effect.map((content) => {
          if (!content) return []
          const truncated = content.slice(0, budget * CHARS_PER_TOKEN)
          return [{ kind: "checkpoint" as const, content: truncated }]
        }),
      )

    const buildForAgent = (agentName: string, task: string, totalBudget: TokenBudget) =>
      Effect.gen(function* () {
        const totalChars = totalBudget * CHARS_PER_TOKEN

        // BEGINNING: mode-independent context
        const beginning: ContextItem[] = []

        // Memory card
        const memCard = yield* memory.contextCard(Math.floor(totalChars * 0.25))
        if (memCard) beginning.push({ kind: "memory", content: memCard })

        // Active task tree
        const taskSummary = yield* taskGraph.summary()
        if (taskSummary && taskSummary !== "(no tasks)") {
          beginning.push({ kind: "task", content: `## Active Tasks\n${taskSummary}` })
        }

        // MIDDLE: task-specific context
        const middle: ContextItem[] = []

        // Relevant memory search
        const memSearch = yield* searchMemory(task, Math.floor(totalBudget * 0.15))
        middle.push(...memSearch)

        const totalContent = [...beginning, ...middle].map((i) => i.content).join("\n").length

        return {
          beginning,
          middle,
          totalChars: totalContent,
        } satisfies CompiledContext
      })

    return Service.of({ searchMemory, searchCode, getTaskProgress, getCheckpoint, buildForAgent })
  }),
)

export const defaultLayer = layer
export const node = LayerNode.make(layer, [Memory.node, TaskGraph.node, AgentDatabase.node])
