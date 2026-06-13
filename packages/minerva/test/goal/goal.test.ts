import { afterEach, describe, expect } from "bun:test"
import { Effect } from "effect"
import path from "path"
import fs from "fs/promises"
import { Goal } from "@/goal/goal"
import { agentTestLayer, withAgentDir } from "../fixture/agent"
import { disposeAllInstances } from "../fixture/fixture"
import { testEffect } from "../lib/effect"

const it = testEffect(agentTestLayer)

afterEach(async () => {
  await disposeAllInstances()
})

describe("Goal", () => {
  it.live("blocks stop when goal mentions tests but none were run", () =>
    withAgentDir(() =>
      Effect.gen(function* () {
        const goal = yield* Goal.Service

        yield* goal.write({
          goal: "Add feature and run tests",
          doneMeans: ["tests pass"],
          notDoneIf: [],
        })

        const result = yield* goal.mayStop({
          checkpointSummary: "",
          gitDiff: "diff content",
          testsRun: [],
          finalClaim: "Done",
        })

        expect(result.allowed).toBe(false)
        expect(result.judgment.missing_evidence).toContain("No test commands were run")
      }),
    ),
  )

  it.live("blocks stop when tests fail", () =>
    withAgentDir(() =>
      Effect.gen(function* () {
        const goal = yield* Goal.Service

        yield* goal.write({
          goal: "Fix bug with test coverage",
          doneMeans: [],
          notDoneIf: [],
        })

        const result = yield* goal.mayStop({
          checkpointSummary: "",
          testsRun: [{ command: "bun test", exitCode: 1 }],
          finalClaim: "Done",
        })

        expect(result.allowed).toBe(false)
        expect(result.judgment.missing_evidence.some((m) => m.includes("failed"))).toBe(true)
      }),
    ),
  )

  it.live("blocks stop when implementation goal has empty diff", () =>
    withAgentDir(() =>
      Effect.gen(function* () {
        const goal = yield* Goal.Service

        yield* goal.write({
          goal: "Implement the API endpoint",
          doneMeans: [],
          notDoneIf: [],
        })

        const result = yield* goal.mayStop({
          checkpointSummary: "",
          gitDiff: "",
          testsRun: [],
          finalClaim: "Implemented",
        })

        expect(result.allowed).toBe(false)
        expect(result.judgment.missing_evidence.some((m) => m.includes("No code changes"))).toBe(true)
      }),
    ),
  )

  it.live("allows stop when evidence satisfies heuristics", () =>
    withAgentDir(() =>
      Effect.gen(function* () {
        const goal = yield* Goal.Service

        yield* goal.write({
          goal: "Document the workflow",
          doneMeans: ["docs updated"],
          notDoneIf: [],
        })

        const result = yield* goal.mayStop({
          checkpointSummary: "",
          gitDiff: " docs/workflow.md | 10 +++++",
          testsRun: [],
          finalClaim: "Documentation updated",
        })

        expect(result.allowed).toBe(true)
        expect(result.judgment.confidence).toBeGreaterThanOrEqual(0.8)
      }),
    ),
  )

  it.live("read and write round-trip goal.md", () =>
    withAgentDir((directory) =>
      Effect.gen(function* () {
        const goal = yield* Goal.Service

        yield* goal.write({
          goal: "Ship feature X",
          doneMeans: ["CI green"],
          notDoneIf: ["tests skipped"],
        })

        const spec = yield* goal.read()
        expect(spec).toEqual({
          goal: "Ship feature X",
          doneMeans: ["CI green"],
          notDoneIf: ["tests skipped"],
        })

        const content = yield* Effect.promise(() =>
          fs.readFile(path.join(directory, ".agent", "goal.md"), "utf8"),
        )
        expect(content).toContain("Ship feature X")
      }),
    ),
  )
})
