export * as AgentEventLog from "./event-log"

/**
 * Append-only JSONL event log at `.agent/state/event-log.jsonl`.
 *
 * Used by:
 *  - Structured deny logging (mode, tool, resource, reason, ts)
 *  - Dream/distill: source of recent session events for memory extraction
 *  - Checkpoint triggers: tool-execution audit trail
 */

import path from "path"
import { appendFileSync, mkdirSync } from "fs"
import { Context, Effect, Layer } from "effect"
import { InstanceState } from "@/effect/instance-state"
import type { InstanceContext } from "@/project/instance-context"
import { LayerNode } from "@minerva-ai/core/effect/layer-node"

export type EventKind =
  | "tool_deny"
  | "tool_allow"
  | "tool_ask"
  | "permission_ask"
  | "permission_reply"
  | "mode_switch"
  | "checkpoint"
  | "task_update"
  | "workflow_step"
  | "memory_update"
  | "goal_judge"
  | "session_start"
  | "session_end"

export interface LogEntry {
  ts: number
  kind: EventKind
  session_id?: string
  mode?: string
  tool?: string
  resource?: string
  reason?: string
  data?: unknown
}

export interface Interface {
  readonly append: (entry: Omit<LogEntry, "ts">) => Effect.Effect<void>
  /** Read the last N lines as parsed entries */
  readonly tail: (n?: number) => Effect.Effect<LogEntry[]>
}

export class Service extends Context.Service<Service, Interface>()("@minerva/agent/EventLog") {}

interface Handle {
  logPath: string
}

export const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const instanceState = yield* InstanceState.make<Handle>(
      Effect.fn("AgentEventLog.open")(function* (ctx: InstanceContext) {
        const stateDir = path.join(ctx.directory, ".agent", "state")
        mkdirSync(stateDir, { recursive: true })
        return yield* Effect.succeed({ logPath: path.join(stateDir, "event-log.jsonl") })
      }),
    )

    const getHandle = InstanceState.get(instanceState)

    const append = (entry: Omit<LogEntry, "ts">) =>
      Effect.flatMap(getHandle, (handle) =>
        Effect.sync(() => {
          const line = JSON.stringify({ ts: Date.now(), ...entry })
          appendFileSync(handle.logPath, line + "\n")
        }),
      )

    const tail = (n = 200) =>
      Effect.flatMap(getHandle, (handle) =>
        Effect.sync(() => {
          const { readFileSync, existsSync } = require("fs") as typeof import("fs")
          if (!existsSync(handle.logPath)) return [] as LogEntry[]
          const content = readFileSync(handle.logPath, "utf8")
          const lines = content.split("\n").filter((l) => l.trim())
          const recent = lines.slice(-n)
          return recent.flatMap((line) => {
            try {
              return [JSON.parse(line) as LogEntry]
            } catch {
              return []
            }
          })
        }),
      )

    return Service.of({ append, tail })
  }),
)

export const defaultLayer = layer
export const node = LayerNode.make(layer, [])
