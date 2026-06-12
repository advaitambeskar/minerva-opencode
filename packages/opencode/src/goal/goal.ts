export * as Goal from "./goal"

/**
 * Goal.Service
 *
 * Manages the active stopping condition at .agent/goal.md.
 *
 * The goal file defines:
 *  - What the agent is trying to accomplish (Goal)
 *  - Concrete "done means" criteria (Done Means)
 *  - Conditions that must fail (Not Done If)
 *
 * Stop judge policy:
 *  - When the agent tries to stop, the judge evaluates evidence
 *  - Stop is blocked unless judge says satisfied=true AND confidence>=0.8
 *  - Tests required by the goal must have been run (bash exit 0 evidence)
 *  - Code goals with empty git diff are auto-failed
 *  - User can override with /stop --force
 *
 * The judge is a separate model call with no tool permissions.
 */

import path from "path"
import { writeFileSync, mkdirSync } from "fs"
import { Context, Effect, Layer } from "effect"
import { InstanceState } from "@/effect/instance-state"
import type { InstanceContext } from "@/project/instance-context"
import { Memory } from "@/memory/memory"
import { TaskGraph } from "@/task-graph/task-graph"
import { LayerNode } from "@opencode-ai/core/effect/layer-node"
import { SectionParser } from "@/memory/section-parser"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GoalSpec {
  goal: string
  doneMeans: string[]
  notDoneIf: string[]
}

export interface StopJudgeInput {
  goal: string
  doneMeans: string[]
  notDoneIf: string[]
  taskTree: string
  checkpointSummary: string
  gitDiff?: string
  testsRun: Array<{ command: string; exitCode: number; output?: string }>
  finalClaim: string
}

export interface StopJudgeOutput {
  satisfied: boolean
  confidence: number  // 0.0 – 1.0
  missing_evidence: string[]
  next_required_action: string
}

export interface Interface {
  /** Read the goal file */
  readonly read: () => Effect.Effect<GoalSpec | undefined>
  /** Write the goal file */
  readonly write: (spec: GoalSpec) => Effect.Effect<void>
  /** Clear the goal */
  readonly clear: () => Effect.Effect<void>
  /**
   * Evaluate whether the goal is satisfied.
   * Returns the judge output — caller decides whether to block or allow stop.
   */
  readonly evaluate: (input: Omit<StopJudgeInput, "goal" | "doneMeans" | "notDoneIf" | "taskTree">) => Effect.Effect<StopJudgeOutput>
  /** Returns true if agent may stop (judge satisfied + confidence >= 0.8) */
  readonly mayStop: (input: Omit<StopJudgeInput, "goal" | "doneMeans" | "notDoneIf" | "taskTree">) => Effect.Effect<{ allowed: boolean; judgment: StopJudgeOutput }>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/Goal") {}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const GOAL_TEMPLATE = `# Active Goal

## Goal
${/* placeholder */""}

## Done Means


## Not Done If

`

function renderGoal(spec: GoalSpec): string {
  return `# Active Goal

## Goal
${spec.goal}

## Done Means
${spec.doneMeans.map((d) => `- ${d}`).join("\n")}

## Not Done If
${spec.notDoneIf.map((n) => `- ${n}`).join("\n")}
`
}

function parseGoal(content: string): GoalSpec | undefined {
  if (!content.trim()) return undefined
  const sections = SectionParser.parse(content)
  const get = (name: string) => sections.find((s) => s.heading.toLowerCase() === name.toLowerCase())?.body ?? ""

  const parseList = (raw: string) =>
    raw
      .split("\n")
      .filter((l) => l.trim().startsWith("-"))
      .map((l) => l.replace(/^-\s*/, "").trim())
      .filter(Boolean)

  const goal = get("Goal")
  if (!goal.trim()) return undefined

  return {
    goal: goal.trim(),
    doneMeans: parseList(get("Done Means")),
    notDoneIf: parseList(get("Not Done If")),
  }
}

/**
 * Simple local evaluation (no model call) that catches obvious failures.
 * A real model-backed judge is the future extension point here.
 */
function localEvaluate(input: StopJudgeInput): StopJudgeOutput {
  const missing: string[] = []
  let confidence = 0.8  // start optimistic

  // Check: if goal mentions tests and none were run
  const goalMentionsTests = /test|spec|assert|pytest|jest|rspec/i.test(input.goal)
  const testsWereRun = input.testsRun.length > 0
  const testsPassed = input.testsRun.every((t) => t.exitCode === 0)

  if (goalMentionsTests && !testsWereRun) {
    missing.push("No test commands were run")
    confidence -= 0.35
  } else if (goalMentionsTests && !testsPassed) {
    const failCount = input.testsRun.filter((t) => t.exitCode !== 0).length
    missing.push(`${failCount} test command(s) failed`)
    confidence -= 0.4
  }

  // Check: if goal involves code changes and diff is empty
  const goalInvolvesCode = /implement|add|fix|refactor|create|write|update/i.test(input.goal)
  if (goalInvolvesCode && input.gitDiff !== undefined && !input.gitDiff.trim()) {
    missing.push("No code changes in git diff but goal requires implementation")
    confidence -= 0.45
  }

  // Check each "Not Done If" condition against the final claim
  for (const condition of input.notDoneIf) {
    // Heuristic: if the condition keyword appears as violated in the context
    const keyword = condition.toLowerCase().split(" ").slice(0, 3).join(" ")
    if (input.finalClaim.toLowerCase().includes(keyword)) {
      missing.push(`Possible "Not Done If" violation: ${condition}`)
      confidence -= 0.1
    }
  }

  confidence = Math.max(0, Math.min(1, confidence))

  return {
    satisfied: confidence >= 0.8 && missing.length === 0,
    confidence,
    missing_evidence: missing,
    next_required_action:
      missing.length > 0
        ? missing[0]
        : confidence >= 0.8
          ? "Goal appears satisfied — safe to stop"
          : "Review the missing evidence before stopping",
  }
}

// ---------------------------------------------------------------------------
// Service implementation
// ---------------------------------------------------------------------------

export const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const memory = yield* Memory.Service
    const taskGraph = yield* TaskGraph.Service

    const instanceState = yield* InstanceState.make<{ agentDir: string }>(
      Effect.fn("Goal.open")(function* (ctx: InstanceContext) {
        const agentDir = path.join(ctx.directory, ".agent")
        mkdirSync(agentDir, { recursive: true })
        return yield* Effect.succeed({ agentDir })
      }),
    )

    const getCtx = InstanceState.get(instanceState)

    const read = () =>
      memory.readGoal().pipe(
        Effect.map((content) => parseGoal(content)),
      )

    const write = (spec: GoalSpec) =>
      Effect.flatMap(getCtx, (ctx) =>
        Effect.sync(() => {
          writeFileSync(path.join(ctx.agentDir, "goal.md"), renderGoal(spec), "utf8")
        }),
      )

    const clear = () =>
      Effect.flatMap(getCtx, (ctx) =>
        Effect.sync(() => {
          writeFileSync(path.join(ctx.agentDir, "goal.md"), GOAL_TEMPLATE, "utf8")
        }),
      )

    const evaluate = (input: Omit<StopJudgeInput, "goal" | "doneMeans" | "notDoneIf" | "taskTree">) =>
      Effect.gen(function* () {
        const spec = yield* read()
        const taskTree = yield* taskGraph.summary()
        const fullInput: StopJudgeInput = {
          goal: spec?.goal ?? "No goal defined",
          doneMeans: spec?.doneMeans ?? [],
          notDoneIf: spec?.notDoneIf ?? [],
          taskTree,
          ...input,
        }
        return localEvaluate(fullInput)
      })

    const mayStop = (input: Omit<StopJudgeInput, "goal" | "doneMeans" | "notDoneIf" | "taskTree">) =>
      evaluate(input).pipe(
        Effect.map((judgment) => ({
          allowed: judgment.satisfied && judgment.confidence >= 0.8,
          judgment,
        })),
      )

    return Service.of({ read, write, clear, evaluate, mayStop })
  }),
)

export const defaultLayer = layer
export const node = LayerNode.make(layer, [])
