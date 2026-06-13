import { afterEach, describe, expect } from "bun:test"
import { Effect } from "effect"
import { AgentDatabase } from "@/agent-db/database"
import { Checkpoint } from "@/checkpoint/checkpoint"
import { ContextGateway } from "@/context/context-gateway"
import { Goal } from "@/goal/goal"
import { Memory } from "@/memory/memory"
import { TaskGraph } from "@/task-graph/task-graph"
import { agentTestLayer, withAgentDir } from "../fixture/agent"
import { disposeAllInstances } from "../fixture/fixture"
import { testEffect } from "../lib/effect"

const it = testEffect(agentTestLayer)

afterEach(async () => {
  await disposeAllInstances()
})

describe("Agent stack bootstrap", () => {
  it.live("provides core unified agent services from test layer stack", () =>
    withAgentDir(() =>
      Effect.gen(function* () {
        yield* AgentDatabase.Service
        yield* Memory.Service
        yield* TaskGraph.Service
        yield* Goal.Service
        yield* Checkpoint.Service
        yield* ContextGateway.Service
        expect(true).toBe(true)
      }),
    ),
  )

  it.live("memory context card is available when MEMORY.md exists", () =>
    withAgentDir(() =>
      Effect.gen(function* () {
        const memory = yield* Memory.Service

        yield* memory.writeMemory(`# Project Memory

## Commands
bun test
`)

        const card = yield* memory.contextCard(500)
        expect(card).toContain("<ProjectMemory>")
        expect(card).toContain("bun test")
      }),
    ),
  )
})
