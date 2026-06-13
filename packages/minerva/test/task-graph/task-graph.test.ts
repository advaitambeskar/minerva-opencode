import { afterEach, describe, expect } from "bun:test"
import { Effect } from "effect"
import path from "path"
import fs from "fs/promises"
import { TaskGraph } from "@/task-graph/task-graph"
import { agentTestLayer, withAgentDir } from "../fixture/agent"
import { disposeAllInstances } from "../fixture/fixture"
import { testEffect } from "../lib/effect"

const it = testEffect(agentTestLayer)

afterEach(async () => {
  await disposeAllInstances()
})

describe("TaskGraph", () => {
  it.live("create inserts T1 and writes task files", () =>
    withAgentDir((directory) =>
      Effect.gen(function* () {
        const tasks = yield* TaskGraph.Service

        const task = yield* tasks.create({ title: "Root task", description: "Do work" })
        expect(task.id).toBe("T1")

        const content = yield* Effect.promise(() =>
          fs.readFile(path.join(directory, ".agent", "tasks", "T1", "task.md"), "utf8"),
        )
        expect(content).toContain("Root task")
      }),
    ),
  )

  it.live("split creates child tasks", () =>
    withAgentDir(() =>
      Effect.gen(function* () {
        const tasks = yield* TaskGraph.Service

        const parent = yield* tasks.create({ title: "Parent" })
        const children = yield* tasks.split(parent.id, ["Child A", "Child B"])

        expect(children.map((c) => c.id).sort()).toEqual(["T1.1", "T1.2"])
        const updated = yield* tasks.get(parent.id)
        expect(updated?.status).toBe("in_progress")
      }),
    ),
  )

  it.live("updateStatus persists and appends progress", () =>
    withAgentDir((directory) =>
      Effect.gen(function* () {
        const tasks = yield* TaskGraph.Service

        const task = yield* tasks.create({ title: "Work" })
        const done = yield* tasks.updateStatus(task.id, "done", "completed successfully")
        expect(done.status).toBe("done")

        const progress = yield* Effect.promise(() =>
          fs.readFile(path.join(directory, ".agent", "tasks", task.id, "progress.md"), "utf8"),
        )
        expect(progress).toContain("done")
      }),
    ),
  )

  it.live("tree and summary reflect hierarchy", () =>
    withAgentDir(() =>
      Effect.gen(function* () {
        const tasks = yield* TaskGraph.Service

        const parent = yield* tasks.create({ title: "Parent" })
        yield* tasks.split(parent.id, ["Child"])

        const tree = yield* tasks.tree()
        expect(tree).toHaveLength(1)
        expect(tree[0].children).toHaveLength(1)

        const summary = yield* tasks.summary()
        expect(summary).toContain("T1:")
        expect(summary).toContain("T1.1:")
      }),
    ),
  )
})
