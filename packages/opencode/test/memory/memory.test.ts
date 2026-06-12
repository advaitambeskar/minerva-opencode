import { afterEach, describe, expect } from "bun:test"
import { Effect } from "effect"
import path from "path"
import fs from "fs/promises"
import { Memory } from "@/memory/memory"
import { agentTestLayer, withAgentDir } from "../fixture/agent"
import { disposeAllInstances } from "../fixture/fixture"
import { testEffect } from "../lib/effect"

const it = testEffect(agentTestLayer)

afterEach(async () => {
  await disposeAllInstances()
})

describe("Memory", () => {
  it.live("writeMemory and readMemory round-trip", () =>
    withAgentDir(() =>
      Effect.gen(function* () {
        const memory = yield* Memory.Service

        yield* memory.writeMemory(`# Project Memory

## Project Overview
Test project

## Commands
bun test
`)

        const content = yield* memory.readMemory()
        expect(content).toContain("Test project")
        expect(content).toContain("bun test")
      }),
    ),
  )

  it.live("redacts secrets on write", () =>
    withAgentDir((directory) =>
      Effect.gen(function* () {
        const memory = yield* Memory.Service

        const result = yield* memory.writeMemory("## Commands\nkey=sk-abcdefghijklmnopqrstuvwxyz123456")
        expect(result.secretsFound).toBe(true)

        const onDisk = yield* Effect.promise(() =>
          fs.readFile(path.join(directory, ".agent", "MEMORY.md"), "utf8"),
        )
        expect(onDisk).toContain("[REDACTED]")
        expect(onDisk).not.toContain("sk-abcdefghijklmnopqrstuvwxyz123456")
      }),
    ),
  )

  it.live("appendToMemory adds to section", () =>
    withAgentDir(() =>
      Effect.gen(function* () {
        const memory = yield* Memory.Service

        yield* memory.writeMemory(`# Project Memory

## Commands
bun test
`)
        yield* memory.appendToMemory("Commands", "bun typecheck")

        const content = yield* memory.readMemory()
        expect(content).toContain("bun test")
        expect(content).toContain("bun typecheck")
      }),
    ),
  )

  it.live("search finds indexed content", () =>
    withAgentDir(() =>
      Effect.gen(function* () {
        const memory = yield* Memory.Service

        yield* memory.writeMemory(`# Project Memory

## Known Pitfalls
Never run tests from repo root
`)

        const results = yield* memory.search("root")
        expect(results.some((r) => r.body.includes("repo root"))).toBe(true)
      }),
    ),
  )

  it.live("contextCard includes priority sections within budget when content is small", () =>
    withAgentDir(() =>
      Effect.gen(function* () {
        const memory = yield* Memory.Service

        yield* memory.writeMemory(`# Project Memory

## Commands
bun test

## Conventions
use Effect layers
`)

        const card = yield* memory.contextCard(200)
        expect(card).toContain("<ProjectMemory>")
        expect(card).toContain("bun test")
        expect(card.length).toBeLessThanOrEqual(250)
      }),
    ),
  )
})
