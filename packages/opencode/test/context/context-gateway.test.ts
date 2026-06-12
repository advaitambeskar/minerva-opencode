import { afterEach, describe, expect } from "bun:test"
import { Effect } from "effect"
import { Checkpoint } from "@/checkpoint/checkpoint"
import { ContextGateway } from "@/context/context-gateway"
import { Memory } from "@/memory/memory"
import { TaskGraph } from "@/task-graph/task-graph"
import { agentTestLayer, withAgentDir } from "../fixture/agent"
import { disposeAllInstances } from "../fixture/fixture"
import { testEffect } from "../lib/effect"

const it = testEffect(agentTestLayer)

afterEach(async () => {
  await disposeAllInstances()
})

describe("ContextGateway", () => {
  it.live("searchMemory delegates to memory FTS", () =>
    withAgentDir(() =>
      Effect.gen(function* () {
        const memory = yield* Memory.Service
        const gateway = yield* ContextGateway.Service

        yield* memory.writeMemory(`# Project Memory

## Commands
bun test packages/opencode
`)

        const items = yield* gateway.searchMemory("opencode", 50)
        expect(items.length).toBeGreaterThan(0)
        expect(items[0].kind).toBe("memory")
        expect(items[0].content).toContain("bun test")
      }),
    ),
  )

  it.live("getTaskProgress returns active task summary", () =>
    withAgentDir(() =>
      Effect.gen(function* () {
        const tasks = yield* TaskGraph.Service
        const gateway = yield* ContextGateway.Service

        const task = yield* tasks.create({ title: "Gateway task" })
        yield* tasks.progress(task.id, "Started work")

        const items = yield* gateway.getTaskProgress([task.id], 200)
        expect(items.some((i) => i.kind === "task" && i.content.includes("Gateway task"))).toBe(true)
      }),
    ),
  )

  it.live("getCheckpoint returns checkpoint content", () =>
    withAgentDir(() =>
      Effect.gen(function* () {
        const checkpoint = yield* Checkpoint.Service
        const gateway = yield* ContextGateway.Service

        yield* checkpoint.write({
          goal: "Finish gateway tests",
          mode: "build",
          activeTasks: [],
          filesInspected: [],
          filesModified: [],
          commandsRun: [],
          keyDecisions: [],
          openQuestions: [],
          nextAction: "verify",
        })

        const items = yield* gateway.getCheckpoint(500)
        expect(items).toHaveLength(1)
        expect(items[0].kind).toBe("checkpoint")
        expect(items[0].content).toContain("Finish gateway tests")
      }),
    ),
  )

  it.live("buildForAgent respects token budget", () =>
    withAgentDir(() =>
      Effect.gen(function* () {
        const memory = yield* Memory.Service
        const gateway = yield* ContextGateway.Service

        yield* memory.writeMemory(`# Project Memory

## Commands
${"word ".repeat(200)}
`)

        const compiled = yield* gateway.buildForAgent("researcher", "find auth code", 50)
        expect(compiled.beginning.length + compiled.middle.length).toBeGreaterThan(0)
        expect(compiled.totalChars).toBeGreaterThan(0)
      }),
    ),
  )
})
