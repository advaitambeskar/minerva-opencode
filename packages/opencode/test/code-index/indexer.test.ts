import { afterEach, describe, expect } from "bun:test"
import { Effect } from "effect"
import path from "path"
import fs from "fs/promises"
import { AgentDatabase } from "@/agent-db/database"
import { CodeIndexer } from "@/code-index/indexer"
import { agentIndexerTestLayer, withAgentDir } from "../fixture/agent"
import { disposeAllInstances } from "../fixture/fixture"
import { testEffect } from "../lib/effect"

const it = testEffect(agentIndexerTestLayer)

afterEach(async () => {
  await disposeAllInstances()
})

describe("CodeIndexer", () => {
  it.live(
    "reindexFile writes chunks and FTS rows",
    () =>
      withAgentDir((directory) =>
        Effect.gen(function* () {
          const indexer = yield* CodeIndexer.Service
          const db = yield* AgentDatabase.Service

          const filePath = path.join(directory, "hello.ts")
          yield* Effect.promise(() =>
            fs.writeFile(filePath, "export function greet() {\n  return 'hello'\n}\n"),
          )

          yield* indexer.reindexFile(filePath)

          const rows = yield* db.searchCode("greet", 5)
          expect(rows.some((r) => r.path === filePath && r.body.includes("greet"))).toBe(true)

          const stats = yield* indexer.stats()
          expect(stats.chunks_total).toBeGreaterThan(0)
        }),
      ),
    15_000,
  )

  it.live(
    "removeFile deletes indexed chunks",
    () =>
      withAgentDir((directory) =>
        Effect.gen(function* () {
          const indexer = yield* CodeIndexer.Service
          const db = yield* AgentDatabase.Service

          const filePath = path.join(directory, "remove-me.ts")
          yield* Effect.promise(() => fs.writeFile(filePath, "export const x = 1\n"))
          yield* indexer.reindexFile(filePath)
          yield* indexer.removeFile(filePath)

          const rows = yield* db.searchCode("export", 5)
          expect(rows.filter((r) => r.path === filePath)).toHaveLength(0)
        }),
      ),
    15_000,
  )

  it.live(
    "reindexFile is idempotent for unchanged content",
    () =>
      withAgentDir((directory) =>
        Effect.gen(function* () {
          const indexer = yield* CodeIndexer.Service

          const filePath = path.join(directory, "stable.ts")
          yield* Effect.promise(() => fs.writeFile(filePath, "export const stable = true\n"))
          yield* indexer.reindexFile(filePath)
          const first = yield* indexer.stats()
          yield* indexer.reindexFile(filePath)
          const second = yield* indexer.stats()
          expect(second.chunks_total).toBe(first.chunks_total)
        }),
      ),
    15_000,
  )
})
