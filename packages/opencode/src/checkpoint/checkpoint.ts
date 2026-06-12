export * as Checkpoint from "./checkpoint"

/**
 * Checkpoint.Service
 *
 * Writes and reads `.agent/checkpoint.md` — the resumable session state that
 * allows the agent to restore context after a compaction, restart, or mode
 * switch without losing the current goal, task state, files touched, and
 * commands run.
 *
 * Trigger points (write checkpoint):
 *  - Context usage ≥ 55%  (first warning)
 *  - Context usage ≥ 75%  (pre-compaction)
 *  - Before spawning a subagent
 *  - After completing a task or subtask
 *  - Before switching modes (agent switch)
 *  - Before applying a multi-file patch
 *  - After a test failure (bash command returning non-zero)
 *
 * The checkpoint file is already registered as a mustKeep Context Source in
 * packages/core/src/memory-context.ts.
 */

import path from "path"
import { writeFileSync, mkdirSync } from "fs"
import { Context, Effect, Layer } from "effect"
import { InstanceState } from "@/effect/instance-state"
import type { InstanceContext } from "@/project/instance-context"
import { Memory } from "@/memory/memory"
import { LayerNode } from "@opencode-ai/core/effect/layer-node"
import { SecretRedact } from "@/memory/secret-redact"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CheckpointData {
  goal: string
  mode: string
  activeTasks: Array<{ id: string; title: string; status: string }>
  filesInspected: string[]
  filesModified: string[]
  commandsRun: Array<{ command: string; exitCode?: number; summary?: string }>
  keyDecisions: string[]
  openQuestions: string[]
  nextAction: string
  timestamp?: number
}

export type TriggerKind =
  | "context_55pct"
  | "context_75pct"
  | "context_90pct"
  | "pre_subagent"
  | "post_task"
  | "pre_mode_switch"
  | "pre_multifile_patch"
  | "post_test_failure"
  | "manual"

export interface Interface {
  /** Write a checkpoint from the provided data */
  readonly write: (data: CheckpointData, trigger?: TriggerKind) => Effect.Effect<void>
  /** Read the current checkpoint as structured data (or undefined if none) */
  readonly read: () => Effect.Effect<CheckpointData | undefined>
  /** Clear the checkpoint file */
  readonly clear: () => Effect.Effect<void>
  /** Returns the path to the checkpoint file */
  readonly path: () => Effect.Effect<string>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/Checkpoint") {}

// ---------------------------------------------------------------------------
// Checkpoint markdown format
// ---------------------------------------------------------------------------

function render(data: CheckpointData): string {
  const ts = data.timestamp ?? Date.now()
  const date = new Date(ts).toISOString().replace("T", " ").slice(0, 19)

  const taskLines =
    data.activeTasks.length > 0
      ? data.activeTasks.map((t) => `- ${t.id}: ${t.title} [${t.status}]`).join("\n")
      : "- (none)"

  const filesInspectedLines =
    data.filesInspected.length > 0
      ? data.filesInspected.slice(-30).map((f) => `- ${f}`).join("\n")
      : "- (none)"

  const filesModifiedLines =
    data.filesModified.length > 0
      ? data.filesModified.slice(-30).map((f) => `- ${f}`).join("\n")
      : "- (none)"

  const commandsLines =
    data.commandsRun.length > 0
      ? data.commandsRun
          .slice(-20)
          .map((c) => {
            const exit = c.exitCode !== undefined ? ` (exit ${c.exitCode})` : ""
            const summary = c.summary ? ` — ${c.summary}` : ""
            return `- \`${c.command}\`${exit}${summary}`
          })
          .join("\n")
      : "- (none)"

  const decisionsLines =
    data.keyDecisions.length > 0 ? data.keyDecisions.map((d) => `- ${d}`).join("\n") : "- (none)"

  const questionsLines =
    data.openQuestions.length > 0 ? data.openQuestions.map((q) => `- ${q}`).join("\n") : "- (none)"

  return `# Session Checkpoint
_Last updated: ${date}_

## Goal
${data.goal || "(no goal set — use /goal to set one)"}

## Current Mode
${data.mode || "build"}

## Active Tasks
${taskLines}

## Files Inspected
${filesInspectedLines}

## Files Modified
${filesModifiedLines}

## Commands Run
${commandsLines}

## Key Decisions
${decisionsLines}

## Open Questions
${questionsLines}

## Next Action
${data.nextAction || "(none recorded)"}
`
}

function parse(content: string): CheckpointData | undefined {
  if (!content.trim()) return undefined

  const extract = (heading: string): string => {
    const re = new RegExp(`##\\s+${heading}\\s*\\n([\\s\\S]*?)(?=\\n##\\s|$)`, "i")
    const m = content.match(re)
    return m ? m[1].trim() : ""
  }

  const parseList = (raw: string) =>
    raw
      .split("\n")
      .filter((l) => l.trim().startsWith("-"))
      .map((l) => l.replace(/^-\s*/, "").trim())
      .filter((l) => l && l !== "(none)")

  return {
    goal: extract("Goal"),
    mode: extract("Current Mode") || "build",
    activeTasks: parseList(extract("Active Tasks")).map((l) => {
      const m = l.match(/^([\w.]+):\s+(.+?)\s+\[(\w+)\]$/)
      return m ? { id: m[1], title: m[2], status: m[3] } : { id: "?", title: l, status: "unknown" }
    }),
    filesInspected: parseList(extract("Files Inspected")),
    filesModified: parseList(extract("Files Modified")),
    commandsRun: parseList(extract("Commands Run")).map((l) => ({ command: l })),
    keyDecisions: parseList(extract("Key Decisions")),
    openQuestions: parseList(extract("Open Questions")),
    nextAction: extract("Next Action"),
  }
}

// ---------------------------------------------------------------------------
// Service implementation
// ---------------------------------------------------------------------------

export const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const memory = yield* Memory.Service

    const instanceState = yield* InstanceState.make<{ agentDir: string }>(
      Effect.fn("Checkpoint.open")(function* (ctx: InstanceContext) {
        const agentDir = path.join(ctx.directory, ".agent")
        mkdirSync(agentDir, { recursive: true })
        return yield* Effect.succeed({ agentDir })
      }),
    )

    const getCtx = InstanceState.get(instanceState)

    const checkpointPath = () =>
      Effect.map(getCtx, (ctx) => path.join(ctx.agentDir, "checkpoint.md"))

    const write = (data: CheckpointData, _trigger?: TriggerKind) =>
      Effect.flatMap(getCtx, (ctx) =>
        Effect.gen(function* () {
          const filePath = path.join(ctx.agentDir, "checkpoint.md")
          const { text } = SecretRedact.redact(render({ ...data, timestamp: Date.now() }))
          writeFileSync(filePath, text, "utf8")
          // Re-index checkpoint in memory FTS
          yield* memory.reindex("checkpoint", filePath)
        }),
      )

    const read = () =>
      Effect.flatMap(getCtx, (ctx) =>
        memory.readCheckpoint().pipe(
          Effect.map((content) => {
            void ctx
            return parse(content)
          }),
        ),
      )

    const clear = () =>
      Effect.flatMap(getCtx, (ctx) =>
        Effect.sync(() => {
          const filePath = path.join(ctx.agentDir, "checkpoint.md")
          writeFileSync(filePath, "", "utf8")
        }),
      )

    return Service.of({ write, read, clear, path: checkpointPath })
  }),
)

export const defaultLayer = layer
export const node = LayerNode.make(layer, [])
