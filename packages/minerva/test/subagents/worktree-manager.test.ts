import { afterEach, describe, expect } from "bun:test"
import { execSync } from "child_process"
import { mkdirSync, rmSync } from "fs"
import { Effect } from "effect"
import path from "path"
import fs from "fs/promises"
import { WorktreeManager } from "@/subagents/worktree-manager"
import { agentIndexerTestLayer, withAgentDir } from "../fixture/agent"
import { disposeAllInstances } from "../fixture/fixture"
import { testEffect } from "../lib/effect"

const it = testEffect(agentIndexerTestLayer)

afterEach(async () => {
  await disposeAllInstances()
})

function gitWorktreeSupported() {
  const dir = path.join(process.cwd(), ".test-tmp", `git-probe-${process.pid}`)
  try {
    mkdirSync(dir, { recursive: true })
    execSync("git -c init.templateDir= init", { cwd: dir, stdio: "ignore" })
    return true
  } catch {
    return false
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

const gitWorktree = gitWorktreeSupported()

describe.skipIf(!gitWorktree)("WorktreeManager", () => {
  it.live(
    "create list diff apply and remove lifecycle",
    () =>
      withAgentDir(
        (directory) =>
          Effect.gen(function* () {
            const worktrees = yield* WorktreeManager.Service

            const info = yield* worktrees.create("builder")
            expect(info.agentName).toBe("builder")

            const listed = yield* worktrees.list()
            expect(listed.some((w) => w.id === info.id)).toBe(true)

            const target = path.join(info.worktreePath, "feature.txt")
            yield* Effect.promise(() => fs.writeFile(target, "subagent work\n"))
            yield* Effect.promise(() =>
              import("child_process").then(({ execFile }) =>
                new Promise<void>((resolve, reject) => {
                  execFile("git", ["add", "feature.txt"], { cwd: info.worktreePath }, (err) =>
                    err ? reject(err) : resolve(),
                  )
                }),
              ),
            )
            yield* Effect.promise(() =>
              import("child_process").then(({ execFile }) =>
                new Promise<void>((resolve, reject) => {
                  execFile(
                    "git",
                    ["-c", "user.email=test@opencode.test", "-c", "user.name=Test", "commit", "-m", "subagent change"],
                    { cwd: info.worktreePath },
                    (err) => (err ? reject(err) : resolve()),
                  )
                }),
              ),
            )

            const diff = yield* worktrees.diff(info.id)
            expect(diff.length).toBeGreaterThan(0)

            const applied = yield* worktrees.apply(info.id)
            expect(applied.success).toBe(true)

            const mainFile = path.join(directory, "feature.txt")
            const exists = yield* Effect.promise(() => fs.stat(mainFile).then(() => true).catch(() => false))
            expect(exists).toBe(true)

            yield* worktrees.remove(info.id)
            const after = yield* worktrees.list()
            expect(after.some((w) => w.id === info.id)).toBe(false)
          }),
        { git: true },
      ),
    30_000,
  )
})
