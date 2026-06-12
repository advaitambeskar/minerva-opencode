export * as Memory from "./memory"

/**
 * Memory.Service
 *
 * Manages the project memory files in .agent/:
 *   MEMORY.md     – durable project knowledge
 *   notes.md      – temporary scratchpad
 *   goal.md       – active stopping condition
 *   checkpoint.md – latest resumable session state (written by Checkpoint.Service)
 *
 * Responsibilities:
 *  - Parse/write memory files with strict section schema
 *  - Index sections into AgentDatabase FTS5
 *  - Subscribe to file-watcher events so manual edits re-index
 *  - Register a System Context source that injects compact memory cards
 *  - Expose /memory list|search|forget tool actions (via commands in the command system)
 *  - Apply secret redaction before writing
 */

import path from "path"
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs"
import { createHash } from "crypto"
import { Context, Effect, Layer } from "effect"
import { InstanceState } from "@/effect/instance-state"
import type { InstanceContext } from "@/project/instance-context"
import { AgentDatabase } from "@/agent-db/database"
import { LayerNode } from "@opencode-ai/core/effect/layer-node"
import { SectionParser } from "./section-parser"
import { SecretRedact } from "./secret-redact"
import { ulid } from "ulid"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MemoryKind = "memory" | "checkpoint" | "notes" | "task_progress" | "agents_md" | "goal"

export interface MemoryItem {
  id: string
  scope: string  // project | session | task | user
  kind: string   // rule | decision | command | pitfall | preference | fact
  text: string
  source_path: string
  source_section?: string
  confidence: number  // 0-100
  created_at: number
  updated_at: number
  superseded_by?: string
  deleted_at?: number
}

export interface Interface {
  /** Read .agent/MEMORY.md, returning raw content or empty string */
  readonly readMemory: () => Effect.Effect<string>
  /** Read .agent/notes.md */
  readonly readNotes: () => Effect.Effect<string>
  /** Read .agent/goal.md */
  readonly readGoal: () => Effect.Effect<string>
  /** Read .agent/checkpoint.md */
  readonly readCheckpoint: () => Effect.Effect<string>
  /** Write .agent/MEMORY.md (redacts secrets) */
  readonly writeMemory: (content: string) => Effect.Effect<{ secretsFound: boolean }>
  /** Write .agent/notes.md (redacts secrets) */
  readonly writeNotes: (content: string) => Effect.Effect<{ secretsFound: boolean }>
  /** Write .agent/goal.md */
  readonly writeGoal: (content: string) => Effect.Effect<void>
  /** Append an entry to a section in MEMORY.md */
  readonly appendToMemory: (section: string, entry: string) => Effect.Effect<{ secretsFound: boolean }>
  /** Re-index a file into FTS5 */
  readonly reindex: (kind: MemoryKind, filePath: string) => Effect.Effect<void>
  /** List all non-deleted memory items */
  readonly list: (opts?: { scope?: string; kind?: string }) => Effect.Effect<MemoryItem[]>
  /** Full-text search over memory */
  readonly search: (query: string, limit?: number) => Effect.Effect<Array<{ section: string; body: string; path: string; kind: string }>>
  /** Soft-delete a memory item by ID */
  readonly forget: (id: string) => Effect.Effect<void>
  /** Build a compact memory card for injection into a context window (budget in chars) */
  readonly contextCard: (budget: number) => Effect.Effect<string>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/Memory") {}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hash(content: string): string {
  return createHash("sha256").update(content).digest("hex").slice(0, 16)
}

function readFileSafe(p: string): string {
  try {
    return existsSync(p) ? readFileSync(p, "utf8") : ""
  } catch {
    return ""
  }
}

function writeFileSafe(p: string, content: string): void {
  mkdirSync(path.dirname(p), { recursive: true })
  writeFileSync(p, content, "utf8")
}

const MEMORY_TEMPLATE = `# Project Memory

## Project Overview


## Architecture Decisions


## Commands


## Conventions


## Known Pitfalls


## Glossary


## Superseded / Deprecated

`

const GOAL_TEMPLATE = `# Active Goal

## Goal


## Done Means


## Not Done If

`

// ---------------------------------------------------------------------------
// Service implementation
// ---------------------------------------------------------------------------

export const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const db = yield* AgentDatabase.Service

    const instanceState = yield* InstanceState.make<{ agentDir: string; projectId: string }>(
      Effect.fn("Memory.open")(function* (ctx: InstanceContext) {
        const agentDir = path.join(ctx.directory, ".agent")
        mkdirSync(agentDir, { recursive: true })
        const projectId = yield* db.projectId()
        return yield* Effect.succeed({ agentDir, projectId })
      }),
    )

    const getCtx = InstanceState.get(instanceState)

    // -----------------------------------------------------------------------
    // Index a markdown file's sections into FTS5
    // -----------------------------------------------------------------------
    const reindex = (kind: MemoryKind, filePath: string) =>
      Effect.flatMap(getCtx, (ctx) =>
        Effect.gen(function* () {
          const content = readFileSafe(filePath)
          if (!content) return
          const contentHash = hash(content)

          const existing = yield* db.get<{ content_hash: string }>(
            "SELECT content_hash FROM memory_docs WHERE path = ? AND project_id = ?",
            [filePath, ctx.projectId],
          )
          if (existing?.content_hash === contentHash) return

          const sections = SectionParser.parse(content)
          const docId = ulid()

          yield* db.run("DELETE FROM memory_docs_fts WHERE path = ? AND project_id = ?", [filePath, ctx.projectId])
          yield* db.run(
            `INSERT OR REPLACE INTO memory_docs (id, project_id, path, kind, content_hash, updated_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [docId, ctx.projectId, filePath, kind, contentHash, Date.now()],
          )

          for (const section of sections) {
            if (!section.body.trim()) continue
            yield* db.run(
              `INSERT INTO memory_docs_fts (doc_id, project_id, path, kind, section, body)
               VALUES (?, ?, ?, ?, ?, ?)`,
              [docId, ctx.projectId, filePath, kind, section.heading, section.body],
            )
          }
        }),
      )

    // -----------------------------------------------------------------------
    // Read helpers
    // -----------------------------------------------------------------------
    const readMemory = () =>
      Effect.flatMap(getCtx, (ctx) => Effect.sync(() => readFileSafe(path.join(ctx.agentDir, "MEMORY.md"))))

    const readNotes = () =>
      Effect.flatMap(getCtx, (ctx) => Effect.sync(() => readFileSafe(path.join(ctx.agentDir, "notes.md"))))

    const readGoal = () =>
      Effect.flatMap(getCtx, (ctx) => Effect.sync(() => readFileSafe(path.join(ctx.agentDir, "goal.md"))))

    const readCheckpoint = () =>
      Effect.flatMap(getCtx, (ctx) => Effect.sync(() => readFileSafe(path.join(ctx.agentDir, "checkpoint.md"))))

    // -----------------------------------------------------------------------
    // Write helpers (with secret redaction + re-index)
    // -----------------------------------------------------------------------
    const writeMemory = (content: string) =>
      Effect.flatMap(getCtx, (ctx) =>
        Effect.sync(() => {
          const { text, found } = SecretRedact.redact(content)
          const filePath = path.join(ctx.agentDir, "MEMORY.md")
          writeFileSafe(filePath, text || MEMORY_TEMPLATE)
          return { secretsFound: found.length > 0 }
        }).pipe(
          Effect.tap(() => reindex("memory", path.join(ctx.agentDir, "MEMORY.md"))),
        ),
      )

    const writeNotes = (content: string) =>
      Effect.flatMap(getCtx, (ctx) =>
        Effect.sync(() => {
          const { text, found } = SecretRedact.redact(content)
          const filePath = path.join(ctx.agentDir, "notes.md")
          writeFileSafe(filePath, text)
          return { secretsFound: found.length > 0 }
        }).pipe(
          Effect.tap(() => reindex("notes", path.join(ctx.agentDir, "notes.md"))),
        ),
      )

    const writeGoal = (content: string) =>
      Effect.flatMap(getCtx, (ctx) =>
        Effect.sync(() => {
          const filePath = path.join(ctx.agentDir, "goal.md")
          writeFileSafe(filePath, content || GOAL_TEMPLATE)
        }),
      )

    // -----------------------------------------------------------------------
    // Append to a specific MEMORY.md section
    // -----------------------------------------------------------------------
    const appendToMemory = (section: string, entry: string) =>
      Effect.flatMap(getCtx, (ctx) =>
        Effect.gen(function* () {
          const filePath = path.join(ctx.agentDir, "MEMORY.md")
          const current = readFileSafe(filePath) || MEMORY_TEMPLATE
          const sections = SectionParser.parse(current)
          const updated = SectionParser.appendToSection(sections, section, entry)
          const rendered = SectionParser.render(updated)
          const { text, found } = SecretRedact.redact(rendered)
          writeFileSafe(filePath, text)
          yield* reindex("memory", filePath)
          return { secretsFound: found.length > 0 }
        }),
      )

    // -----------------------------------------------------------------------
    // List memory items
    // -----------------------------------------------------------------------
    const list = (opts?: { scope?: string; kind?: string }) =>
      Effect.flatMap(getCtx, (ctx) =>
        db.all<MemoryItem>(
          `SELECT * FROM memory_items
           WHERE project_id = ? AND deleted_at IS NULL
           ${opts?.scope ? "AND scope = ?" : ""}
           ${opts?.kind ? "AND kind = ?" : ""}
           ORDER BY updated_at DESC`,
          [ctx.projectId, ...(opts?.scope ? [opts.scope] : []), ...(opts?.kind ? [opts.kind] : [])].filter(Boolean),
        ),
      )

    // -----------------------------------------------------------------------
    // FTS search
    // -----------------------------------------------------------------------
    const search = (query: string, limit = 20) =>
      db.searchMemory(query, limit).pipe(
        Effect.map((rows) =>
          rows.map((r) => ({ section: r.section, body: r.body, path: r.path, kind: r.kind })),
        ),
      )

    // -----------------------------------------------------------------------
    // Soft-delete a memory item
    // -----------------------------------------------------------------------
    const forget = (id: string) =>
      Effect.flatMap(getCtx, (ctx) =>
        db.run(
          "UPDATE memory_items SET deleted_at = ? WHERE id = ? AND project_id = ?",
          [Date.now(), id, ctx.projectId],
        ),
      )

    // -----------------------------------------------------------------------
    // Context card for injection
    // -----------------------------------------------------------------------
    const contextCard = (budget: number) =>
      Effect.flatMap(getCtx, (ctx) =>
        Effect.sync(() => {
          const memContent = readFileSafe(path.join(ctx.agentDir, "MEMORY.md"))
          if (!memContent) return ""

          const sections = SectionParser.parse(memContent)
          const prioritySections = ["Commands", "Conventions", "Known Pitfalls", "Architecture Decisions"]
          const lines: string[] = []

          for (const name of prioritySections) {
            const sec = sections.find((s) => s.heading.toLowerCase() === name.toLowerCase())
            if (!sec?.body.trim()) continue
            lines.push(`**${sec.heading}:**\n${sec.body.trim()}`)
            if (lines.join("\n\n").length > budget) break
          }

          // Fill remainder with other non-deprecated sections
          for (const sec of sections) {
            if (prioritySections.includes(sec.heading)) continue
            if (sec.heading.toLowerCase().includes("deprecated")) continue
            if (!sec.body.trim()) continue
            const candidate = lines.join("\n\n") + "\n\n" + `**${sec.heading}:**\n${sec.body.trim()}`
            if (candidate.length > budget) break
            lines.push(`**${sec.heading}:**\n${sec.body.trim()}`)
          }

          const content = lines.join("\n\n")
          return content
            ? `<ProjectMemory>\n${content}\n</ProjectMemory>`
            : ""
        }),
      )

    return Service.of({
      readMemory,
      readNotes,
      readGoal,
      readCheckpoint,
      writeMemory,
      writeNotes,
      writeGoal,
      appendToMemory,
      reindex,
      list,
      search,
      forget,
      contextCard,
    })
  }),
)

export const defaultLayer = layer
export const node = LayerNode.make(layer, [AgentDatabase.node])
