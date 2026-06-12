import { afterEach, describe, expect } from "bun:test"
import { Effect } from "effect"
import path from "path"
import fs from "fs/promises"
import { Checkpoint } from "@/checkpoint/checkpoint"
import { agentTestLayer, withAgentDir } from "../fixture/agent"
import { disposeAllInstances } from "../fixture/fixture"
import { testEffect } from "../lib/effect"

const it = testEffect(agentTestLayer)

afterEach(async () => {
  await disposeAllInstances()
})

describe("Checkpoint", () => {
  it.live("write and read round-trip checkpoint data", () =>
    withAgentDir(() =>
      Effect.gen(function* () {
        const checkpoint = yield* Checkpoint.Service

        yield* checkpoint.write({
          goal: "Ship auth",
          mode: "build",
          activeTasks: [{ id: "T1", title: "Implement login", status: "in_progress" }],
          filesInspected: ["src/auth.ts"],
          filesModified: ["src/auth.ts"],
          commandsRun: [{ command: "bun test", exitCode: 0, summary: "passed" }],
          keyDecisions: ["Use JWT"],
          openQuestions: ["Refresh token TTL?"],
          nextAction: "Add logout endpoint",
        })

        const data = yield* checkpoint.read()
        expect(data?.goal).toBe("Ship auth")
        expect(data?.mode).toBe("build")
        expect(data?.activeTasks[0]?.id).toBe("T1")
        expect(data?.filesModified).toContain("src/auth.ts")
        expect(data?.nextAction).toBe("Add logout endpoint")
      }),
    ),
  )

  it.live("redacts secrets in checkpoint body", () =>
    withAgentDir((directory) =>
      Effect.gen(function* () {
        const checkpoint = yield* Checkpoint.Service

        yield* checkpoint.write({
          goal: "Test",
          mode: "build",
          activeTasks: [],
          filesInspected: [],
          filesModified: [],
          commandsRun: [{ command: "export TOKEN=sk-abcdefghijklmnopqrstuvwxyz123456" }],
          keyDecisions: [],
          openQuestions: [],
          nextAction: "continue",
        })

        const onDisk = yield* Effect.promise(() =>
          fs.readFile(path.join(directory, ".agent", "checkpoint.md"), "utf8"),
        )
        expect(onDisk).toContain("[REDACTED]")
        expect(onDisk).not.toContain("sk-abcdefghijklmnopqrstuvwxyz123456")
      }),
    ),
  )

  it.live("clear empties checkpoint file", () =>
    withAgentDir((directory) =>
      Effect.gen(function* () {
        const checkpoint = yield* Checkpoint.Service

        yield* checkpoint.write({
          goal: "Temp",
          mode: "plan",
          activeTasks: [],
          filesInspected: [],
          filesModified: [],
          commandsRun: [],
          keyDecisions: [],
          openQuestions: [],
          nextAction: "stop",
        })
        yield* checkpoint.clear()

        const content = yield* Effect.promise(() =>
          fs.readFile(path.join(directory, ".agent", "checkpoint.md"), "utf8"),
        )
        expect(content).toBe("")
        expect(yield* checkpoint.read()).toBeUndefined()
      }),
    ),
  )
})
