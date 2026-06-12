export * as Workflow from "./workflow"

/**
 * Workflow.Service
 *
 * Loads and executes workflow definitions from .agent/workflows/*.yaml.
 * Persists run state to workflow_runs and workflow_steps tables in AgentDatabase
 * so runs can be resumed after interruption.
 *
 * Each step runs a subagent (via the task tool) with appropriate permissions
 * and waits for structured output. Steps can be approved, skipped, retried,
 * or cancelled by the user.
 */

import path from "path"
import { Context, Effect, Layer } from "effect"
import { InstanceState } from "@/effect/instance-state"
import type { InstanceContext } from "@/project/instance-context"
import { AgentDatabase } from "@/agent-db/database"
import { Glob } from "@opencode-ai/core/util/glob"
import { LayerNode } from "@opencode-ai/core/effect/layer-node"
import { ulid } from "ulid"
import { readFileSync, mkdirSync, existsSync } from "fs"
import { writeFileSync } from "fs"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WorkflowStep {
  id: string
  agent: string
  mode: "plan" | "build" | "compose"
  description: string
  input_from?: string[]
  requires_approval?: boolean
  output: string
}

export interface WorkflowDef {
  name: string
  description: string
  inputs: Array<{ name: string; required: boolean; description?: string }>
  steps: WorkflowStep[]
}

export type StepStatus = "pending" | "running" | "completed" | "failed" | "skipped" | "cancelled"
export type RunStatus = "pending" | "running" | "paused" | "completed" | "failed" | "cancelled"

export interface WorkflowRun {
  id: string
  name: string
  status: RunStatus
  input_json: string
  current_step?: string
  created_at: number
  updated_at: number
}

export interface WorkflowStepResult {
  id: string
  workflow_run_id: string
  step_id: string
  agent_name?: string
  status: StepStatus
  input_json?: string
  output_json?: string
  started_at?: number
  completed_at?: number
}

export interface Interface {
  /** List available workflow definitions */
  readonly list: () => Effect.Effect<WorkflowDef[]>
  /** Get a workflow definition by name */
  readonly get: (name: string) => Effect.Effect<WorkflowDef | undefined>
  /** Start a new workflow run */
  readonly start: (workflowName: string, inputs: Record<string, string>) => Effect.Effect<WorkflowRun>
  /** Get a run by ID */
  readonly getRun: (runId: string) => Effect.Effect<WorkflowRun | undefined>
  /** List all runs for this project */
  readonly listRuns: (opts?: { status?: RunStatus }) => Effect.Effect<WorkflowRun[]>
  /** Get step results for a run */
  readonly getSteps: (runId: string) => Effect.Effect<WorkflowStepResult[]>
  /** Update a step's status and output */
  readonly updateStep: (stepId: string, status: StepStatus, output?: string) => Effect.Effect<void>
  /** Cancel a running workflow */
  readonly cancel: (runId: string) => Effect.Effect<void>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/Workflow") {}

// ---------------------------------------------------------------------------
// Simple YAML parser (same minimal approach as subagent loader)
// ---------------------------------------------------------------------------

function parseWorkflowYaml(text: string): WorkflowDef | undefined {
  try {
    const lines = text.split("\n")
    const result: Record<string, unknown> = {}
    let inSteps = false
    let inInputs = false
    let currentStep: Record<string, unknown> | null = null
    const steps: Record<string, unknown>[] = []
    const inputs: Record<string, unknown>[] = []

    for (const rawLine of lines) {
      const line = rawLine
      if (!line.trim() || line.trim().startsWith("#")) continue

      // Section headers
      if (line.match(/^steps\s*:/)) { inSteps = true; inInputs = false; continue }
      if (line.match(/^inputs\s*:/)) { inInputs = true; inSteps = false; continue }
      if (line.match(/^[a-z_]+\s*:/) && !line.startsWith(" ")) {
        if (currentStep) steps.push(currentStep)
        currentStep = null
        inSteps = false
        inInputs = false
      }

      // Top-level fields
      if (!line.startsWith(" ") && !line.startsWith("\t")) {
        const m = line.match(/^([a-z_]+)\s*:\s*(.*)$/)
        if (m) result[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, "") || undefined
        continue
      }

      // Steps
      if (inSteps) {
        if (line.match(/^\s{2}-\s+id:\s+(.+)$/)) {
          if (currentStep) steps.push(currentStep)
          const m = line.match(/^\s{2}-\s+id:\s+(.+)$/)
          currentStep = { id: m![1].trim() }
          continue
        }
        if (currentStep && line.match(/^\s{4}([a-z_]+)\s*:\s*(.+)$/)) {
          const m = line.match(/^\s{4}([a-z_]+)\s*:\s*(.*)$/)
          if (m) {
            const val = m[2].trim().replace(/^['"]|['"]$/g, "")
            if (m[1] === "requires_approval") currentStep[m[1]] = val === "true"
            else currentStep[m[1]] = val || undefined
          }
          continue
        }
        if (currentStep && line.match(/^\s{6}-\s+(.+)$/)) {
          const m = line.match(/^\s{6}-\s+(.+)$/)
          const prevKey = Object.keys(currentStep).at(-1)
          if (prevKey && !Array.isArray(currentStep[prevKey])) {
            currentStep[prevKey] = []
          }
          if (prevKey && Array.isArray(currentStep[prevKey])) {
            (currentStep[prevKey] as string[]).push(m![1].trim())
          }
          continue
        }
      }

      // Inputs
      if (inInputs) {
        if (line.match(/^\s{2}-\s+name:\s+(.+)$/)) {
          const m = line.match(/^\s{2}-\s+name:\s+(.+)$/)
          inputs.push({ name: m![1].trim(), required: true })
          continue
        }
        if (inputs.length > 0 && line.match(/^\s{4}([a-z_]+)\s*:\s*(.+)$/)) {
          const m = line.match(/^\s{4}([a-z_]+)\s*:\s*(.+)$/)
          if (m) {
            const last = inputs[inputs.length - 1]
            const val = m[2].trim().replace(/^['"]|['"]$/g, "")
            last[m[1]] = m[1] === "required" ? val === "true" : val
          }
          continue
        }
      }
    }
    if (currentStep) steps.push(currentStep)

    if (!result.name) return undefined
    return {
      name: result.name as string,
      description: (result.description as string) ?? "",
      inputs: inputs as WorkflowDef["inputs"],
      steps: steps as unknown as WorkflowStep[],
    }
  } catch {
    return undefined
  }
}

// ---------------------------------------------------------------------------
// Service implementation
// ---------------------------------------------------------------------------

export const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const db = yield* AgentDatabase.Service

    const instanceState = yield* InstanceState.make<{ projectId: string; projectDir: string }>(
      Effect.fn("Workflow.open")(function* (ctx: InstanceContext) {
        const projectId = yield* db.projectId()
        return yield* Effect.succeed({ projectId, projectDir: ctx.directory })
      }),
    )

    const getCtx = InstanceState.get(instanceState)

    // -----------------------------------------------------------------------
    // Discover workflow YAML files
    // -----------------------------------------------------------------------
    const discoverWorkflows = Effect.gen(function* () {
      const ctx = yield* getCtx
      const workflowDir = path.join(ctx.projectDir, ".agent", "workflows")
      const defs: WorkflowDef[] = []

      const files = yield* Effect.tryPromise({
        try: () => Glob.scan("*.yaml", { cwd: workflowDir, absolute: true }),
        catch: () => [],
      }).pipe(Effect.orElseSucceed(() => [] as string[]))

      for (const f of files) {
        try {
          const text = readFileSync(f, "utf8")
          const def = parseWorkflowYaml(text)
          if (def) defs.push(def)
        } catch {
          // Skip unreadable files
        }
      }
      return defs
    })

    const list = () => discoverWorkflows

    const get = (name: string) =>
      discoverWorkflows.pipe(
        Effect.map((defs) => defs.find((d) => d.name === name)),
      )

    // -----------------------------------------------------------------------
    // Start a run
    // -----------------------------------------------------------------------
    const start = (workflowName: string, inputs: Record<string, string>) =>
      Effect.flatMap(getCtx, (ctx) =>
        Effect.gen(function* () {
          const def = yield* get(workflowName)
          if (!def) throw new Error(`Workflow not found: ${workflowName}`)

          const runId = ulid()
          const now = Date.now()
          const firstStep = def.steps[0]?.id

          yield* db.run(
            `INSERT INTO workflow_runs (id, project_id, name, status, input_json, current_step, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [runId, ctx.projectId, workflowName, "pending", JSON.stringify(inputs), firstStep, now, now],
          )

          // Create pending step rows
          for (const step of def.steps) {
            const stepRowId = ulid()
            yield* db.run(
              `INSERT INTO workflow_steps (id, workflow_run_id, step_id, agent_name, status, input_json)
               VALUES (?, ?, ?, ?, ?, ?)`,
              [stepRowId, runId, step.id, step.agent, "pending", JSON.stringify(inputs)],
            )
          }

          return { id: runId, name: workflowName, status: "pending" as RunStatus, input_json: JSON.stringify(inputs), current_step: firstStep, created_at: now, updated_at: now }
        }),
      )

    // -----------------------------------------------------------------------
    // Get run
    // -----------------------------------------------------------------------
    const getRun = (runId: string) =>
      Effect.flatMap(getCtx, (ctx) =>
        db.get<WorkflowRun>(
          "SELECT * FROM workflow_runs WHERE id = ? AND project_id = ?",
          [runId, ctx.projectId],
        ),
      )

    // -----------------------------------------------------------------------
    // List runs
    // -----------------------------------------------------------------------
    const listRuns = (opts?: { status?: RunStatus }) =>
      Effect.flatMap(getCtx, (ctx) => {
        let sql = "SELECT * FROM workflow_runs WHERE project_id = ?"
        const params: unknown[] = [ctx.projectId]
        if (opts?.status) { sql += " AND status = ?"; params.push(opts.status) }
        sql += " ORDER BY created_at DESC"
        return db.all<WorkflowRun>(sql, params)
      })

    // -----------------------------------------------------------------------
    // Get steps
    // -----------------------------------------------------------------------
    const getSteps = (runId: string) =>
      db.all<WorkflowStepResult>(
        "SELECT * FROM workflow_steps WHERE workflow_run_id = ? ORDER BY rowid",
        [runId],
      )

    // -----------------------------------------------------------------------
    // Update step
    // -----------------------------------------------------------------------
    const updateStep = (stepId: string, status: StepStatus, output?: string) =>
      db.run(
        `UPDATE workflow_steps SET status = ?, output_json = ?, completed_at = ?
         WHERE id = ?`,
        [status, output ?? null, status === "completed" ? Date.now() : null, stepId],
      )

    // -----------------------------------------------------------------------
    // Cancel run
    // -----------------------------------------------------------------------
    const cancel = (runId: string) =>
      Effect.flatMap(getCtx, (ctx) =>
        Effect.gen(function* () {
          yield* db.run(
            "UPDATE workflow_runs SET status = 'cancelled', updated_at = ? WHERE id = ? AND project_id = ?",
            [Date.now(), runId, ctx.projectId],
          )
          yield* db.run(
            "UPDATE workflow_steps SET status = 'cancelled' WHERE workflow_run_id = ? AND status IN ('pending', 'running')",
            [runId],
          )
        }),
      )

    return Service.of({ list, get, start, getRun, listRuns, getSteps, updateStep, cancel })
  }),
)

export const defaultLayer = layer
export const node = LayerNode.make(layer, [AgentDatabase.node])
