import { afterEach, describe, expect } from "bun:test"
import { Effect } from "effect"
import path from "path"
import fs from "fs/promises"
import { AgentEventLog } from "@/agent-db/event-log"
import { agentTestLayer, withAgentDir } from "../fixture/agent"
import { disposeAllInstances } from "../fixture/fixture"
import { testEffect } from "../lib/effect"

const it = testEffect(agentTestLayer)

afterEach(async () => {
  await disposeAllInstances()
})

describe("AgentEventLog", () => {
  it.live("append writes JSONL and tail returns entries", () =>
    withAgentDir((directory) =>
      Effect.gen(function* () {
        const log = yield* AgentEventLog.Service

        yield* log.append({ kind: "mode_switch", mode: "plan", reason: "user" })
        yield* log.append({ kind: "checkpoint", data: { trigger: "manual" } })

        const entries = yield* log.tail(10)
        expect(entries).toHaveLength(2)
        expect(entries[0].kind).toBe("mode_switch")
        expect(entries[1].kind).toBe("checkpoint")

        const raw = yield* Effect.promise(() =>
          fs.readFile(path.join(directory, ".agent", "state", "event-log.jsonl"), "utf8"),
        )
        expect(raw.split("\n").filter(Boolean)).toHaveLength(2)
      }),
    ),
  )

  it.live("tail skips invalid JSON lines", () =>
    withAgentDir((directory) =>
      Effect.gen(function* () {
        const logPath = path.join(directory, ".agent", "state", "event-log.jsonl")
        yield* Effect.promise(async () => {
          await fs.mkdir(path.dirname(logPath), { recursive: true })
          await fs.writeFile(logPath, '{"ts":1,"kind":"session_start"}\nnot-json\n{"ts":2,"kind":"session_end"}\n')
        })

        const log = yield* AgentEventLog.Service
        const entries = yield* log.tail(10)
        expect(entries).toHaveLength(2)
        expect(entries.map((e) => e.kind)).toEqual(["session_start", "session_end"])
      }),
    ),
  )
})
