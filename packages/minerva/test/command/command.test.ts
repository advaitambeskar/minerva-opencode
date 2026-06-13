import { afterEach, describe, expect } from "bun:test"
import { Effect, Layer } from "effect"
import { Command } from "@/command/index"
import { MCP } from "@/mcp"
import { Skill } from "@/skill"
import { withAgentDir } from "../fixture/agent"
import { TestConfig } from "../fixture/config"
import { CrossSpawnSpawner } from "@minerva-ai/core/cross-spawn-spawner"
import { disposeAllInstances, provideInstanceEffect, testInstanceStoreLayer, tmpdirScoped } from "../fixture/fixture"
import { testEffect } from "../lib/effect"

const commandLayer = (_directory: string) =>
  Command.layer.pipe(
    Layer.provide(TestConfig.layer()),
    Layer.provide(
      Layer.succeed(
        MCP.Service,
        MCP.Service.of({
          status: () => Effect.succeed({}),
          clients: () => Effect.succeed({}),
          tools: () => Effect.succeed({}),
          prompts: () => Effect.succeed({}),
          resources: () => Effect.succeed({}),
          add: () => Effect.succeed({ status: { status: "disabled" as const } }),
          connect: () => Effect.void,
          disconnect: () => Effect.void,
          getPrompt: () => Effect.succeed(undefined),
          readResource: () => Effect.succeed(undefined),
          startAuth: () => Effect.die("unexpected MCP auth in command tests"),
          authenticate: () => Effect.die("unexpected MCP auth in command tests"),
          finishAuth: () => Effect.die("unexpected MCP auth in command tests"),
          removeAuth: () => Effect.void,
          supportsOAuth: () => Effect.succeed(false),
          hasStoredTokens: () => Effect.succeed(false),
          getAuthStatus: () => Effect.succeed("not_authenticated" as const),
        }),
      ),
    ),
    Layer.provide(
      Layer.succeed(
        Skill.Service,
        Skill.Service.of({
          get: () => Effect.succeed(undefined),
          require: () => Effect.die("unexpected skill lookup in command tests"),
          all: () => Effect.succeed([]),
          dirs: () => Effect.succeed([]),
          available: () => Effect.succeed([]),
        }),
      ),
    ),
    Layer.provide(testInstanceStoreLayer),
  )

const it = testEffect(Layer.mergeAll(testInstanceStoreLayer, CrossSpawnSpawner.defaultLayer))

afterEach(async () => {
  await disposeAllInstances()
})

const EXPECTED_COMMANDS = [
  "plan",
  "build",
  "compose",
  "memory",
  "memory-search",
  "memory-forget",
  "checkpoint",
  "task",
  "goal",
  "stop",
  "dream",
  "distill",
  "voice",
] as const

const withCommand = <A, E, R>(directory: string, self: Effect.Effect<A, E, R>) =>
  self.pipe(Effect.provide(commandLayer(directory)), provideInstanceEffect(directory))

describe("Command registry", () => {
  it.live("lists unified agent commands", () =>
    Effect.gen(function* () {
      const directory = yield* tmpdirScoped()
      const names = yield* withCommand(
        directory,
        Effect.gen(function* () {
          const commands = yield* Command.Service
          return (yield* commands.list()).map((c) => c.name)
        }),
      )
      for (const name of EXPECTED_COMMANDS) {
        expect(names).toContain(name)
      }
    }),
  )

  it.live("memory command template references .agent/MEMORY.md", () =>
    Effect.gen(function* () {
      const directory = yield* tmpdirScoped()
      const memory = yield* withCommand(
        directory,
        Effect.gen(function* () {
          const commands = yield* Command.Service
          return yield* commands.get("memory")
        }),
      )
      expect(memory).toBeDefined()
      const template =
        typeof memory!.template === "string"
          ? memory!.template
          : yield* Effect.promise(() => Promise.resolve(memory!.template))
      expect(template.length).toBeGreaterThan(0)
      expect(template).toContain(".agent/MEMORY.md")
    }),
  )

  it.live("mode commands target correct agents", () =>
    Effect.gen(function* () {
      const directory = yield* tmpdirScoped()
      yield* withCommand(
        directory,
        Effect.gen(function* () {
          const commands = yield* Command.Service
          expect((yield* commands.get("plan"))?.agent).toBe("plan")
          expect((yield* commands.get("build"))?.agent).toBe("build")
          expect((yield* commands.get("compose"))?.agent).toBe("compose")
        }),
      )
    }),
  )

  it.live("extracts $ARGUMENTS hints", () =>
    Effect.gen(function* () {
      const directory = yield* tmpdirScoped()
      const task = yield* withCommand(
        directory,
        Effect.gen(function* () {
          const commands = yield* Command.Service
          return yield* commands.get("task")
        }),
      )
      expect(task?.hints).toContain("$ARGUMENTS")
    }),
  )
})
