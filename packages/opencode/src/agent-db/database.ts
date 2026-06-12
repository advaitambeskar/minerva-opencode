export * as AgentDatabase from "./database"

/**
 * Per-repo local SQLite database for agent state.
 *
 * Opened at `.agent/state/agent.sqlite` relative to the project worktree.
 * Separate from the global opencode.db so it is per-project, gitignorable,
 * and inspectable by the user.
 *
 * Provides:
 *  - FTS5 for memory and code text search (built into bun:sqlite)
 *  - Structured tables for memory, tasks, workflows (P0)
 *  - Reserved code_chunk + FTS slot for semantic index (P2)
 */

import path from "path"
import { mkdirSync } from "fs"
import { Database as BunDatabase } from "bun:sqlite"
import { Context, Effect, Layer } from "effect"
import { InstanceState } from "@/effect/instance-state"
import type { InstanceContext } from "@/project/instance-context"
import { LayerNode } from "@opencode-ai/core/effect/layer-node"
import { INIT_SQL } from "./schema.sql"

export interface MemorySearchRow {
  doc_id: string
  project_id: string
  path: string
  kind: string
  section: string
  body: string
  rank: number
}

export interface CodeSearchRow {
  chunk_id: string
  project_id: string
  path: string
  body: string
  rank: number
}

/** Raw per-instance DB handle (not the public service interface) */
interface DbHandle {
  readonly native: BunDatabase
  readonly projectId: string
}

export interface Interface {
  /** Project ID derived from the project directory basename */
  readonly projectId: () => Effect.Effect<string>
  /** Execute raw SQL (write) */
  readonly run: (sql: string, params?: unknown[]) => Effect.Effect<void>
  /** Execute raw SQL (read) returning typed rows */
  readonly all: <T = Record<string, unknown>>(sql: string, params?: unknown[]) => Effect.Effect<T[]>
  /** Execute raw SQL returning a single row or undefined */
  readonly get: <T = Record<string, unknown>>(sql: string, params?: unknown[]) => Effect.Effect<T | undefined>
  /** FTS5 full-text search over memory_docs_fts */
  readonly searchMemory: (query: string, limit?: number) => Effect.Effect<MemorySearchRow[]>
  /** FTS5 full-text search over code_chunks_fts */
  readonly searchCode: (query: string, limit?: number) => Effect.Effect<CodeSearchRow[]>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/agent/AgentDatabase") {}

function ftsQuery(query: string): string {
  const terms = query.trim().split(/\s+/).filter(Boolean)
  if (terms.length === 0) return '""'
  return terms.map((term) => `"${term.replaceAll('"', '""')}"`).join(" ")
}

function openHandle(ctx: InstanceContext): DbHandle {
  const stateDir = path.join(ctx.directory, ".agent", "state")
  mkdirSync(stateDir, { recursive: true })
  const dbPath = path.join(stateDir, "agent.sqlite")
  const projectId = path.basename(ctx.directory)

  const native = new BunDatabase(dbPath, { create: true })
  native.run("PRAGMA journal_mode = WAL")
  native.run("PRAGMA synchronous = NORMAL")
  native.run("PRAGMA busy_timeout = 5000")
  native.run("PRAGMA foreign_keys = ON")
  // Initialize schema (idempotent CREATE IF NOT EXISTS for every table)
  native.run(INIT_SQL)

  return { native, projectId }
}

export const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const instanceState = yield* InstanceState.make<DbHandle>(
      Effect.fn("AgentDatabase.open")(function* (ctx) {
        const handle = yield* Effect.sync(() => openHandle(ctx))
        yield* Effect.addFinalizer(() =>
          Effect.sync(() => {
            handle.native.close()
          }),
        )
        return handle
      }),
    )

    const getHandle = InstanceState.get(instanceState)

    const projectId = () => Effect.map(getHandle, (h) => h.projectId)

    const run = (sql: string, params: unknown[] = []) =>
      Effect.map(getHandle, (h) => {
        h.native.run(sql, params as any)
      })

    const all = <T>(sql: string, params: unknown[] = []) =>
      Effect.map(getHandle, (h) => h.native.prepare(sql).all(...(params as any)) as T[])

    const get = <T>(sql: string, params: unknown[] = []) =>
      Effect.map(getHandle, (h) => h.native.prepare(sql).get(...(params as any)) as T | undefined)

    const searchMemory = (query: string, limit = 20) =>
      Effect.flatMap(getHandle, (h) =>
        Effect.sync(() =>
          h.native
            .prepare(
              `SELECT doc_id, project_id, path, kind, section, body, rank
               FROM memory_docs_fts
               WHERE memory_docs_fts MATCH ?
                 AND project_id = ?
               ORDER BY rank
               LIMIT ?`,
            )
            .all(ftsQuery(query), h.projectId, limit) as MemorySearchRow[],
        ),
      )

    const searchCode = (query: string, limit = 20) =>
      Effect.flatMap(getHandle, (h) =>
        Effect.sync(() =>
          h.native
            .prepare(
              `SELECT chunk_id, project_id, path, body, rank
               FROM code_chunks_fts
               WHERE code_chunks_fts MATCH ?
                 AND project_id = ?
               ORDER BY rank
               LIMIT ?`,
            )
            .all(ftsQuery(query), h.projectId, limit) as CodeSearchRow[],
        ),
      )

    return Service.of({ projectId, run, all, get, searchMemory, searchCode })
  }),
)

export const defaultLayer = layer
export const node = LayerNode.make(layer, [])
