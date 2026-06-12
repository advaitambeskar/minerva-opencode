export * as TaskGraph from "./task-graph"

/**
 * TaskGraph.Service
 *
 * Durable hierarchical task graph: T1, T1.1, T1.1.1, …
 *
 * Backed by:
 *  - `tasks` table in AgentDatabase for fast queries
 *  - `.agent/tasks/<id>/task.md` — user-visible task definition
 *  - `.agent/tasks/<id>/progress.md` — append-only timeline of what happened
 *
 * Commands available through the command system:
 *   /task create "title"
 *   /task split T1 "child 1" "child 2" …
 *   /task start T1.2
 *   /task block T1.2 "reason"
 *   /task done T1.2
 *   /task tree
 *   /task checkpoint
 */

import path from "path"
import { writeFileSync, mkdirSync, existsSync, readFileSync, appendFileSync } from "fs"
import { Context, Effect, Layer } from "effect"
import { InstanceState } from "@/effect/instance-state"
import type { InstanceContext } from "@/project/instance-context"
import { AgentDatabase } from "@/agent-db/database"
import { LayerNode } from "@opencode-ai/core/effect/layer-node"
import { ulid } from "ulid"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TaskStatus = "todo" | "in_progress" | "blocked" | "done" | "cancelled"

export interface Task {
  id: string        // e.g. "T1", "T1.1", "T1.1.2"
  project_id: string
  parent_id?: string
  title: string
  description: string
  status: TaskStatus
  created_at: number
  updated_at: number
  depends_on: string[]
  evidence: EvidenceRef[]
}

export interface EvidenceRef {
  type: "file" | "commit" | "test" | "url" | "note"
  ref: string
  note?: string
}

export interface Interface {
  /** Create a root-level task, returns the new task */
  readonly create: (input: { title: string; description?: string; parentId?: string }) => Effect.Effect<Task>
  /** Split a task into subtasks */
  readonly split: (parentId: string, titles: string[]) => Effect.Effect<Task[]>
  /** Update a task's status */
  readonly updateStatus: (id: string, status: TaskStatus, reason?: string) => Effect.Effect<Task>
  /** Append a progress note to .agent/tasks/<id>/progress.md */
  readonly progress: (id: string, note: string) => Effect.Effect<void>
  /** Add an evidence reference to a task */
  readonly addEvidence: (id: string, evidence: EvidenceRef) => Effect.Effect<void>
  /** List all tasks (optionally filtered) */
  readonly list: (opts?: { status?: TaskStatus; parentId?: string | null }) => Effect.Effect<Task[]>
  /** Get a single task by ID */
  readonly get: (id: string) => Effect.Effect<Task | undefined>
  /** Get the full tree of tasks */
  readonly tree: () => Effect.Effect<TaskTreeNode[]>
  /** Return a compact tree summary for checkpoint/context injection */
  readonly summary: () => Effect.Effect<string>
}

export interface TaskTreeNode extends Task {
  children: TaskTreeNode[]
}

export class Service extends Context.Service<Service, Interface>()("@opencode/TaskGraph") {}

// ---------------------------------------------------------------------------
// ID generation — T1, T1.1, T1.1.2, etc.
// ---------------------------------------------------------------------------

function nextRootId(existing: Task[]): string {
  const rootIds = existing.filter((t) => !t.parent_id).map((t) => parseInt(t.id.replace("T", ""), 10)).filter((n) => !isNaN(n))
  const max = rootIds.length > 0 ? Math.max(...rootIds) : 0
  return `T${max + 1}`
}

function nextChildId(parentId: string, siblings: Task[]): string {
  const prefix = `${parentId}.`
  const siblingNums = siblings
    .filter((t) => t.parent_id === parentId)
    .map((t) => {
      const suffix = t.id.startsWith(prefix) ? t.id.slice(prefix.length) : ""
      return parseInt(suffix, 10)
    })
    .filter((n) => !isNaN(n))
  const max = siblingNums.length > 0 ? Math.max(...siblingNums) : 0
  return `${parentId}.${max + 1}`
}

// ---------------------------------------------------------------------------
// Markdown helpers
// ---------------------------------------------------------------------------

const TASK_TEMPLATE = (id: string, title: string, description: string, parentId?: string) => `# ${id} ${title}

Status: todo
${parentId ? `Parent: ${parentId}` : ""}

## Objective
${description || title}

## Acceptance Criteria

## Progress
`

const PROGRESS_TEMPLATE = (note: string) => {
  const ts = new Date().toISOString().replace("T", " ").slice(0, 16)
  return `- [${ts}] ${note}\n`
}

// ---------------------------------------------------------------------------
// DB helpers
// ---------------------------------------------------------------------------

function dbRowToTask(row: Record<string, unknown>): Task {
  return {
    id: row.id as string,
    project_id: row.project_id as string,
    parent_id: (row.parent_id as string | null) ?? undefined,
    title: row.title as string,
    description: row.description as string,
    status: row.status as TaskStatus,
    created_at: row.created_at as number,
    updated_at: row.updated_at as number,
    depends_on: (() => { try { return JSON.parse(row.depends_on as string) } catch { return [] } })(),
    evidence: (() => { try { return JSON.parse(row.evidence as string) } catch { return [] } })(),
  }
}

// ---------------------------------------------------------------------------
// Service implementation
// ---------------------------------------------------------------------------

export const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const db = yield* AgentDatabase.Service

    const instanceState = yield* InstanceState.make<{ agentDir: string; projectId: string }>(
      Effect.fn("TaskGraph.open")(function* (ctx: InstanceContext) {
        const agentDir = path.join(ctx.directory, ".agent")
        mkdirSync(path.join(agentDir, "tasks"), { recursive: true })
        const projectId = yield* db.projectId()
        return yield* Effect.succeed({ agentDir, projectId })
      }),
    )

    const getCtx = InstanceState.get(instanceState)

    // -----------------------------------------------------------------------
    // Write task files
    // -----------------------------------------------------------------------
    const writeTaskFiles = (task: Task, ctx: { agentDir: string }) => {
      const taskDir = path.join(ctx.agentDir, "tasks", task.id)
      mkdirSync(taskDir, { recursive: true })
      const taskFile = path.join(taskDir, "task.md")
      if (!existsSync(taskFile)) {
        writeFileSync(taskFile, TASK_TEMPLATE(task.id, task.title, task.description, task.parent_id), "utf8")
      }
      const progressFile = path.join(taskDir, "progress.md")
      if (!existsSync(progressFile)) {
        writeFileSync(progressFile, `# ${task.id} Progress\n\n`, "utf8")
      }
    }

    // -----------------------------------------------------------------------
    // Create
    // -----------------------------------------------------------------------
    const create = (input: { title: string; description?: string; parentId?: string }) =>
      Effect.flatMap(getCtx, (ctx) =>
        Effect.gen(function* () {
          const rows = yield* db.all<Record<string, unknown>>("SELECT * FROM tasks WHERE project_id = ?", [ctx.projectId])
          const all = rows.map(dbRowToTask)
          const id = input.parentId ? nextChildId(input.parentId, all) : nextRootId(all)
          const now = Date.now()
          const task: Task = {
            id,
            project_id: ctx.projectId,
            parent_id: input.parentId,
            title: input.title,
            description: input.description ?? "",
            status: "todo",
            created_at: now,
            updated_at: now,
            depends_on: [],
            evidence: [],
          }
          yield* db.run(
            `INSERT INTO tasks (id, project_id, parent_id, title, description, status, created_at, updated_at, depends_on, evidence)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [task.id, task.project_id, task.parent_id ?? null, task.title, task.description, task.status, now, now, "[]", "[]"],
          )
          writeTaskFiles(task, ctx)
          appendFileSync(
            path.join(ctx.agentDir, "tasks", task.id, "progress.md"),
            PROGRESS_TEMPLATE(`Task created: ${task.title}`),
          )
          return task
        }),
      )

    // -----------------------------------------------------------------------
    // Split
    // -----------------------------------------------------------------------
    const split = (parentId: string, titles: string[]) =>
      Effect.flatMap(getCtx, (ctx) =>
        Effect.gen(function* () {
          const rows = yield* db.all<Record<string, unknown>>("SELECT * FROM tasks WHERE project_id = ?", [ctx.projectId])
          const all = rows.map(dbRowToTask)
          const children: Task[] = []
          for (const title of titles) {
            const existingWithNew = [...all, ...children]
            const id = nextChildId(parentId, existingWithNew)
            const now = Date.now()
            const task: Task = {
              id, project_id: ctx.projectId, parent_id: parentId, title, description: "",
              status: "todo", created_at: now, updated_at: now, depends_on: [], evidence: [],
            }
            yield* db.run(
              `INSERT INTO tasks (id, project_id, parent_id, title, description, status, created_at, updated_at, depends_on, evidence)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [task.id, ctx.projectId, parentId, title, "", "todo", now, now, "[]", "[]"],
            )
            writeTaskFiles(task, ctx)
            children.push(task)
          }
          yield* db.run("UPDATE tasks SET status = 'in_progress', updated_at = ? WHERE id = ? AND project_id = ?",
            [Date.now(), parentId, ctx.projectId])
          return children
        }),
      )

    // -----------------------------------------------------------------------
    // Update status
    // -----------------------------------------------------------------------
    const updateStatus = (id: string, status: TaskStatus, reason?: string) =>
      Effect.flatMap(getCtx, (ctx) =>
        Effect.gen(function* () {
          const row = yield* db.get<Record<string, unknown>>("SELECT * FROM tasks WHERE id = ? AND project_id = ?", [id, ctx.projectId])
          if (!row) throw new Error(`Task not found: ${id}`)
          const now = Date.now()
          yield* db.run("UPDATE tasks SET status = ?, updated_at = ? WHERE id = ? AND project_id = ?",
            [status, now, id, ctx.projectId])
          const progressFile = path.join(ctx.agentDir, "tasks", id, "progress.md")
          if (existsSync(progressFile)) {
            appendFileSync(progressFile, PROGRESS_TEMPLATE(
              reason ? `Status → ${status}: ${reason}` : `Status → ${status}`
            ))
          }
          return dbRowToTask({ ...row, status, updated_at: now })
        }),
      )

    // -----------------------------------------------------------------------
    // Progress note
    // -----------------------------------------------------------------------
    const progress = (id: string, note: string) =>
      Effect.flatMap(getCtx, (ctx) =>
        Effect.sync(() => {
          const progressFile = path.join(ctx.agentDir, "tasks", id, "progress.md")
          mkdirSync(path.dirname(progressFile), { recursive: true })
          appendFileSync(progressFile, PROGRESS_TEMPLATE(note))
        }),
      )

    // -----------------------------------------------------------------------
    // Evidence
    // -----------------------------------------------------------------------
    const addEvidence = (id: string, evidence: EvidenceRef) =>
      Effect.flatMap(getCtx, (ctx) =>
        Effect.gen(function* () {
          const row = yield* db.get<Record<string, unknown>>("SELECT evidence FROM tasks WHERE id = ? AND project_id = ?", [id, ctx.projectId])
          if (!row) throw new Error(`Task not found: ${id}`)
          const existing: EvidenceRef[] = (() => { try { return JSON.parse(row.evidence as string) } catch { return [] } })()
          const updated = JSON.stringify([...existing, evidence])
          yield* db.run("UPDATE tasks SET evidence = ?, updated_at = ? WHERE id = ? AND project_id = ?",
            [updated, Date.now(), id, ctx.projectId])
        }),
      )

    // -----------------------------------------------------------------------
    // List
    // -----------------------------------------------------------------------
    const list = (opts?: { status?: TaskStatus; parentId?: string | null }) =>
      Effect.flatMap(getCtx, (ctx) => {
        let sql = "SELECT * FROM tasks WHERE project_id = ?"
        const params: unknown[] = [ctx.projectId]
        if (opts?.status) { sql += " AND status = ?"; params.push(opts.status) }
        if (opts?.parentId !== undefined) {
          if (opts.parentId === null) { sql += " AND parent_id IS NULL" }
          else { sql += " AND parent_id = ?"; params.push(opts.parentId) }
        }
        sql += " ORDER BY id"
        return db.all<Record<string, unknown>>(sql, params).pipe(
          Effect.map((rows) => rows.map(dbRowToTask)),
        )
      })

    // -----------------------------------------------------------------------
    // Get
    // -----------------------------------------------------------------------
    const get = (id: string) =>
      Effect.flatMap(getCtx, (ctx) =>
        db.get<Record<string, unknown>>("SELECT * FROM tasks WHERE id = ? AND project_id = ?", [id, ctx.projectId]).pipe(
          Effect.map((row) => row ? dbRowToTask(row) : undefined),
        ),
      )

    // -----------------------------------------------------------------------
    // Tree
    // -----------------------------------------------------------------------
    const tree = () =>
      list().pipe(
        Effect.map((tasks) => {
          const byId = new Map(tasks.map((t) => [t.id, { ...t, children: [] as TaskTreeNode[] } as TaskTreeNode]))
          const roots: TaskTreeNode[] = []
          for (const node of byId.values()) {
            if (node.parent_id) {
              const parent = byId.get(node.parent_id)
              if (parent) parent.children.push(node)
              else roots.push(node)
            } else {
              roots.push(node)
            }
          }
          return roots
        }),
      )

    // -----------------------------------------------------------------------
    // Summary (for checkpoint/context injection)
    // -----------------------------------------------------------------------
    const summary = () =>
      tree().pipe(
        Effect.map((roots) => {
          if (roots.length === 0) return "(no tasks)"
          const renderNode = (node: TaskTreeNode, indent = ""): string => {
            const statusIcon = { todo: "○", in_progress: "●", blocked: "⊘", done: "✓", cancelled: "✗" }[node.status] ?? "?"
            const line = `${indent}${statusIcon} ${node.id}: ${node.title}`
            const children = node.children.map((c) => renderNode(c, indent + "  ")).join("\n")
            return children ? `${line}\n${children}` : line
          }
          return roots.map((r) => renderNode(r)).join("\n")
        }),
      )

    return Service.of({ create, split, updateStatus, progress, addEvidence, list, get, tree, summary })
  }),
)

export const defaultLayer = layer
export const node = LayerNode.make(layer, [AgentDatabase.node])
