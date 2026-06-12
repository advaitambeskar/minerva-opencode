import { afterEach, describe, expect } from "bun:test"
import { Effect } from "effect"
import path from "path"
import fs from "fs/promises"
import { AgentDatabase } from "@/agent-db/database"
import { agentTestLayer, withAgentDir } from "../fixture/agent"
import { disposeAllInstances } from "../fixture/fixture"
import { testEffect } from "../lib/effect"

const it = testEffect(agentTestLayer)

afterEach(async () => {
  await disposeAllInstances()
})

describe("AgentDatabase", () => {
  it.live("creates .agent/state/agent.sqlite on first open", () =>
    withAgentDir((directory) =>
      Effect.gen(function* () {
        yield* AgentDatabase.Service.pipe(Effect.flatMap((db) => db.projectId()))
        const dbPath = path.join(directory, ".agent", "state", "agent.sqlite")
        const stat = yield* Effect.promise(() => fs.stat(dbPath))
        expect(stat.isFile()).toBe(true)
      }),
    ),
  )

  it.live("searchMemory returns FTS results after insert", () =>
    withAgentDir((directory) =>
      Effect.gen(function* () {
        const db = yield* AgentDatabase.Service
        const projectId = yield* db.projectId()

        yield* db.run(
          `INSERT INTO memory_docs (id, project_id, path, kind, content_hash, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          ["doc1", projectId, path.join(directory, ".agent/MEMORY.md"), "memory", "hash1", Date.now()],
        )
        yield* db.run(
          `INSERT INTO memory_docs_fts (doc_id, project_id, path, kind, section, body)
           VALUES (?, ?, ?, ?, ?, ?)`,
          ["doc1", projectId, path.join(directory, ".agent/MEMORY.md"), "memory", "Commands", "bun test packages/opencode"],
        )

        const rows = yield* db.searchMemory("bun", 5)
        expect(rows.length).toBeGreaterThan(0)
        expect(rows[0].body).toContain("bun test")
      }),
    ),
  )

  it.live("isolates databases per directory", () =>
    Effect.gen(function* () {
      const idOne = yield* withAgentDir((directory) =>
        AgentDatabase.Service.pipe(Effect.flatMap((db) => db.projectId()), Effect.map((id) => ({ directory, id }))),
      )
      const idTwo = yield* withAgentDir((directory) =>
        AgentDatabase.Service.pipe(Effect.flatMap((db) => db.projectId()), Effect.map((id) => ({ directory, id }))),
      )

      expect(idOne.id).not.toBe(idTwo.id)
      expect(
        yield* Effect.promise(() =>
          fs.stat(path.join(idOne.directory, ".agent/state/agent.sqlite")).then(() => true).catch(() => false),
        ),
      ).toBe(true)
      expect(
        yield* Effect.promise(() =>
          fs.stat(path.join(idTwo.directory, ".agent/state/agent.sqlite")).then(() => true).catch(() => false),
        ),
      ).toBe(true)
    }),
  )
})
