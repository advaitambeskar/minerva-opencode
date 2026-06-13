import { afterEach, describe, expect } from "bun:test"
import { Effect } from "effect"
import path from "path"
import fs from "fs/promises"
import { Workflow } from "@/workflow/workflow"
import { agentTestLayer, workflowStackLayer, withAgentDir } from "../fixture/agent"
import { disposeAllInstances } from "../fixture/fixture"
import { testEffect } from "../lib/effect"

const it = testEffect(agentTestLayer)

afterEach(async () => {
  await disposeAllInstances()
})

const FEATURE_YAML = `name: feature
description: Build a feature end-to-end
inputs:
  - name: title
    required: true
steps:
  - id: plan
    agent: planner
    mode: plan
    description: Plan the feature
    output: plan.md
  - id: build
    agent: builder
    mode: build
    description: Implement
    output: code
`

async function writeFeatureWorkflow(directory: string) {
  const dir = path.join(directory, ".agent", "workflows")
  await fs.mkdir(dir, { recursive: true })
  await fs.writeFile(path.join(dir, "feature.yaml"), FEATURE_YAML)
}

describe("Workflow", () => {
  it.live("list discovers workflows in .agent/workflows", () =>
    withAgentDir((directory) =>
      Effect.gen(function* () {
        yield* Effect.promise(() => writeFeatureWorkflow(directory))

        const defs = yield* Effect.gen(function* () {
          const workflow = yield* Workflow.Service
          return yield* workflow.list()
        }).pipe(Effect.provide(workflowStackLayer(directory)))

        expect(defs.some((d) => d.name === "feature")).toBe(true)
        expect(defs.find((d) => d.name === "feature")?.steps).toHaveLength(2)
      }),
    ),
  )

  it.live("start creates run and step rows", () =>
    withAgentDir((directory) =>
      Effect.gen(function* () {
        yield* Effect.promise(() => writeFeatureWorkflow(directory))
        const stack = workflowStackLayer(directory)

        const run = yield* Effect.gen(function* () {
          const workflow = yield* Workflow.Service
          return yield* workflow.start("feature", { title: "Auth" })
        }).pipe(Effect.provide(stack))

        expect(run.status).toBe("pending")
        expect(run.current_step).toBe("plan")

        const steps = yield* Effect.gen(function* () {
          const workflow = yield* Workflow.Service
          return yield* workflow.getSteps(run.id)
        }).pipe(Effect.provide(stack))

        expect(steps).toHaveLength(2)
        expect(steps.every((s) => s.status === "pending")).toBe(true)
      }),
    ),
  )

  it.live("cancel marks run and pending steps cancelled", () =>
    withAgentDir((directory) =>
      Effect.gen(function* () {
        yield* Effect.promise(() => writeFeatureWorkflow(directory))
        const stack = workflowStackLayer(directory)

        const run = yield* Effect.gen(function* () {
          const workflow = yield* Workflow.Service
          return yield* workflow.start("feature", { title: "Auth" })
        }).pipe(Effect.provide(stack))

        yield* Effect.gen(function* () {
          const workflow = yield* Workflow.Service
          yield* workflow.cancel(run.id)
        }).pipe(Effect.provide(stack))

        const cancelled = yield* Effect.gen(function* () {
          const workflow = yield* Workflow.Service
          return yield* workflow.getRun(run.id)
        }).pipe(Effect.provide(stack))

        expect(cancelled?.status).toBe("cancelled")

        const steps = yield* Effect.gen(function* () {
          const workflow = yield* Workflow.Service
          return yield* workflow.getSteps(run.id)
        }).pipe(Effect.provide(stack))

        expect(steps.every((s) => s.status === "cancelled")).toBe(true)
      }),
    ),
  )
})
