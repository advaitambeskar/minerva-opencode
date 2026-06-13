export * as WorktreeManager from "./worktree-manager"

/**
 * WorktreeManager.Service
 *
 * Creates and manages isolated git worktrees for write-capable subagents.
 * Write subagents (builder, memory-writer) operate in these isolated branches
 * so they cannot accidentally modify the main worktree.
 *
 * Parent agent merges patches back after reviewer approval.
 */

import path from "path"
import { Context, Effect, Layer } from "effect"
import { InstanceState } from "@/effect/instance-state"
import type { InstanceContext } from "@/project/instance-context"
import { ChildProcessSpawner } from "effect/unstable/process/ChildProcessSpawner"
import { ChildProcess } from "effect/unstable/process"
import { LayerNode } from "@minerva-ai/core/effect/layer-node"
import { CrossSpawnSpawner } from "@minerva-ai/core/cross-spawn-spawner"
import { ulid } from "ulid"
import { mkdirSync } from "fs"

export interface WorktreeInfo {
  id: string
  branchName: string
  worktreePath: string
  agentName: string
  createdAt: number
}

export interface Interface {
  /** Create an isolated worktree for a write subagent */
  readonly create: (agentName: string, baseBranch?: string) => Effect.Effect<WorktreeInfo>
  /** Remove a worktree */
  readonly remove: (worktreeId: string) => Effect.Effect<void>
  /** List active worktrees */
  readonly list: () => Effect.Effect<WorktreeInfo[]>
  /** Generate a git diff from a worktree */
  readonly diff: (worktreeId: string) => Effect.Effect<string>
  /** Apply a worktree's changes to the main worktree via cherry-pick */
  readonly apply: (worktreeId: string) => Effect.Effect<{ success: boolean; output: string }>
}

export class Service extends Context.Service<Service, Interface>()("@minerva/WorktreeManager") {}

async function git(args: string[], cwd: string): Promise<{ stdout: string; stderr: string; code: number }> {
  const { execFile } = await import("child_process")
  return new Promise((resolve) => {
    execFile("git", args, { cwd }, (err, stdout, stderr) => {
      resolve({
        stdout: stdout ?? "",
        stderr: stderr ?? "",
        code: err && typeof err.code === "number" ? err.code : err ? 1 : 0,
      })
    })
  })
}

export const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const instanceState = yield* InstanceState.make<{ projectDir: string; worktrees: Map<string, WorktreeInfo> }>(
      Effect.fn("WorktreeManager.open")(function* (ctx: InstanceContext) {
        return yield* Effect.succeed({
          projectDir: ctx.directory,
          worktrees: new Map<string, WorktreeInfo>(),
        })
      }),
    )

    const getCtx = InstanceState.get(instanceState)

    const create = (agentName: string, _baseBranch?: string) =>
      Effect.flatMap(getCtx, (ctx) =>
        Effect.tryPromise({
          try: async () => {
            const id = ulid()
            const branchName = `subagent/${agentName}-${id.slice(-8).toLowerCase()}`
            const worktreePath = path.join(ctx.projectDir, ".agent", "worktrees", id)
            mkdirSync(path.dirname(worktreePath), { recursive: true })

            // Create the worktree on a new branch
            const result = await git(["worktree", "add", "-b", branchName, worktreePath], ctx.projectDir)
            if (result.code !== 0) {
              throw new Error(`Failed to create worktree: ${result.stderr}`)
            }

            const info: WorktreeInfo = {
              id,
              branchName,
              worktreePath,
              agentName,
              createdAt: Date.now(),
            }
            ctx.worktrees.set(id, info)
            return info
          },
          catch: (e) => new Error(`WorktreeManager.create failed: ${e}`),
        }).pipe(Effect.orDie),
      )

    const remove = (worktreeId: string) =>
      Effect.flatMap(getCtx, (ctx) =>
        Effect.tryPromise({
          try: async () => {
            const info = ctx.worktrees.get(worktreeId)
            if (!info) return

            await git(["worktree", "remove", "--force", info.worktreePath], ctx.projectDir)
            await git(["branch", "-D", info.branchName], ctx.projectDir).catch(() => {})
            ctx.worktrees.delete(worktreeId)
          },
          catch: (e) => new Error(`WorktreeManager.remove failed: ${e}`),
        }).pipe(Effect.orDie),
      )

    const list = () =>
      Effect.flatMap(getCtx, (ctx) =>
        Effect.succeed(Array.from(ctx.worktrees.values())),
      )

    const diff = (worktreeId: string) =>
      Effect.flatMap(getCtx, (ctx) =>
        Effect.tryPromise({
          try: async () => {
            const info = ctx.worktrees.get(worktreeId)
            if (!info) return ""
            const result = await git(["diff", "HEAD", info.branchName, "--stat"], ctx.projectDir)
            return result.stdout
          },
          catch: (e) => new Error(String(e)),
        }).pipe(Effect.catch(() => Effect.succeed(""))),
      )

    const apply = (worktreeId: string) =>
      Effect.flatMap(getCtx, (ctx) =>
        Effect.tryPromise({
          try: async () => {
            const info = ctx.worktrees.get(worktreeId)
            if (!info) return { success: false as const, output: "Worktree not found" }

            // Get the commit(s) to cherry-pick
            const log = await git(["log", "--oneline", `HEAD..${info.branchName}`], ctx.projectDir)
            const commits = log.stdout.trim().split("\n").filter(Boolean).reverse()

            if (commits.length === 0) {
              return { success: true as const, output: "No new commits to apply" }
            }

            // Cherry-pick each commit
            for (const commit of commits) {
              const hash = commit.split(" ")[0]
              const result = await git(["cherry-pick", hash], ctx.projectDir)
              if (result.code !== 0) {
                // Abort cherry-pick on failure
                await git(["cherry-pick", "--abort"], ctx.projectDir).catch(() => {})
                return { success: false as const, output: result.stderr }
              }
            }

            return { success: true as const, output: `Applied ${commits.length} commit(s)` }
          },
          catch: (e) => ({ success: false as const, output: String(e) }),
        }).pipe(Effect.catch(Effect.succeed)),
      )

    return Service.of({ create, remove, list, diff, apply })
  }),
)

export const defaultLayer = layer
export const node = LayerNode.make(layer, [])
