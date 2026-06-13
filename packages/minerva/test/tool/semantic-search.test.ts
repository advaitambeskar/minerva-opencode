import { afterEach, describe, expect } from "bun:test"
import { Effect, Layer } from "effect"
import path from "path"
import fs from "fs/promises"
import { CodeIndexer } from "@/code-index/indexer"
import { SemanticSearchTool } from "@/tool/semantic-search"
import { Truncate } from "@/tool/truncate"
import { Agent } from "@/agent/agent"
import { SessionID, MessageID } from "@/session/schema"
import { agentIndexerTestLayer, withAgentDir } from "../fixture/agent"
import { disposeAllInstances } from "../fixture/fixture"
import { testEffect } from "../lib/effect"
import type * as Tool from "@/tool/tool"

const it = testEffect(Layer.mergeAll(agentIndexerTestLayer, Truncate.defaultLayer, Agent.defaultLayer))

const ctx: Tool.Context = {
  sessionID: SessionID.make("ses_semantic"),
  messageID: MessageID.make("msg_semantic"),
  callID: "",
  agent: "build",
  abort: AbortSignal.any([]),
  messages: [],
  metadata: () => Effect.void,
  ask: () => Effect.void,
}

afterEach(async () => {
  await disposeAllInstances()
})

describe("SemanticSearchTool", () => {
  it.live(
    "returns ranked code search results",
    () =>
      withAgentDir((directory) =>
        Effect.gen(function* () {
          const indexer = yield* CodeIndexer.Service

          const filePath = path.join(directory, "search-target.ts")
          yield* Effect.promise(() =>
            fs.writeFile(filePath, "export function findMeUniqueSymbol() { return 42 }\n"),
          )
          yield* indexer.reindexFile(filePath)

          const toolInfo = yield* SemanticSearchTool
          const tool = yield* toolInfo.init()
          const result = yield* tool.execute({ query: "findMeUniqueSymbol" }, ctx)

          expect(result.metadata.results_count).toBeGreaterThan(0)
          expect(result.output).toContain("search-target.ts")
          expect(result.output).toContain("findMeUniqueSymbol")
        }),
      ),
    15_000,
  )

  it.live("reports empty results for unknown query", () =>
    withAgentDir(() =>
      Effect.gen(function* () {
        const toolInfo = yield* SemanticSearchTool
        const tool = yield* toolInfo.init()
        const result = yield* tool.execute({ query: "zzz-no-match-xyz" }, ctx)

        expect(result.metadata.results_count).toBe(0)
        expect(result.output).toContain("No code found")
      }),
    ),
  )
})
