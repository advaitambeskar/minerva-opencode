import { describe, expect } from "bun:test"
import { Effect, Exit, Scope } from "effect"
import { AgentV2 } from "@opencode-ai/core/agent"
import { Location } from "@opencode-ai/core/location"
import { AgentPlugin } from "@opencode-ai/core/plugin/agent"
import { PermissionV2 } from "@opencode-ai/core/permission"
import { AbsolutePath } from "@opencode-ai/core/schema"
import { location } from "./fixture/location"
import { testEffect } from "./lib/effect"

const it = testEffect(AgentV2.locationLayer)

describe("AgentV2", () => {
  it.effect("starts without agents", () =>
    Effect.gen(function* () {
      const agent = yield* AgentV2.Service

      expect(yield* agent.all()).toEqual([])
      expect(yield* agent.get(AgentV2.ID.make("build"))).toBeUndefined()
    }),
  )

  it.effect("materializes replayable agent transforms", () =>
    Effect.gen(function* () {
      const agent = yield* AgentV2.Service
      const id = AgentV2.ID.make("reviewer")
      const transform = yield* agent.transform()

      yield* transform((editor) =>
        editor.update(id, (info) => {
          info.description = "Reviews code"
          info.mode = "subagent"
        }),
      )

      expect(yield* agent.get(id)).toMatchObject({ id, description: "Reviews code", mode: "subagent" })
      expect((yield* agent.all()).map((info) => info.id)).toEqual([id])
    }),
  )

  it.effect("rebuilds state when a transform is replaced", () =>
    Effect.gen(function* () {
      const agent = yield* AgentV2.Service
      const id = AgentV2.ID.make("reviewer")
      const transform = yield* agent.transform()

      yield* transform((editor) =>
        editor.update(id, (info) => {
          info.description = "Old description"
          info.hidden = true
        }),
      )
      yield* transform((editor) =>
        editor.update(id, (info) => {
          info.description = "New description"
        }),
      )

      expect(yield* agent.get(id)).toMatchObject({ description: "New description", hidden: false })
    }),
  )

  it.effect("removes a transform when its scope closes", () =>
    Effect.gen(function* () {
      const agent = yield* AgentV2.Service
      const id = AgentV2.ID.make("scoped")
      const scope = yield* Scope.make()
      const transform = yield* agent.transform().pipe(Scope.provide(scope))

      yield* transform((editor) => editor.update(id, () => {}))
      expect(yield* agent.get(id)).toBeDefined()

      yield* Scope.close(scope, Exit.void)
      expect(yield* agent.get(id)).toBeUndefined()
    }),
  )

  it.effect("applies direct agent updates", () =>
    Effect.gen(function* () {
      const agent = yield* AgentV2.Service
      const id = AgentV2.ID.make("build")

      yield* agent.update((editor) =>
        editor.update(id, (info) => {
          info.mode = "primary"
          info.hidden = true
        }),
      )

      expect(yield* agent.get(id)).toMatchObject({ id, mode: "primary", hidden: true })
    }),
  )

  it.effect("creates agents with runtime defaults and supports direct removal", () =>
    Effect.gen(function* () {
      const agent = yield* AgentV2.Service
      const id = AgentV2.ID.make("custom")

      yield* agent.update((editor) => editor.update(id, () => {}))
      expect(yield* agent.get(id)).toEqual(AgentV2.Info.empty(id))

      yield* agent.update((editor) => editor.remove(id))
      expect(yield* agent.get(id)).toBeUndefined()
    }),
  )

  it.effect("does not ambiently opt built-in agents into bash", () =>
    Effect.gen(function* () {
      const agent = yield* AgentV2.Service
      yield* AgentPlugin.Plugin.effect.pipe(
        Effect.provideService(
          Location.Service,
          Location.Service.of(location({ directory: AbsolutePath.make("/project") })),
        ),
      )

      const agents = yield* agent.all()
      expect(agents.map((item) => String(item.id)).sort()).toEqual([
        "build",
        "compaction",
        "compose",
        "explore",
        "general",
        "plan",
        "summary",
        "title",
      ])
      const controlledBash = new Set(["build", "plan", "compose"])
      for (const item of agents) {
        if (controlledBash.has(String(item.id))) continue
        expect(item.permissions.some((rule) => rule.action === "bash" && rule.effect !== "deny")).toBe(false)
      }
    }),
  )

  it.effect("plan mode blocks edits except agent memory and task files", () =>
    Effect.gen(function* () {
      const agent = yield* AgentV2.Service
      yield* AgentPlugin.Plugin.effect.pipe(
        Effect.provideService(
          Location.Service,
          Location.Service.of(location({ directory: AbsolutePath.make("/project") })),
        ),
      )

      const plan = yield* agent.get(AgentV2.ID.make("plan"))
      if (!plan) throw new Error("expected plan agent")
      expect(PermissionV2.evaluate("edit", "src/main.ts", plan.permissions).effect).toBe("deny")
      expect(PermissionV2.evaluate("edit", ".agent/MEMORY.md", plan.permissions).effect).toBe("allow")
      expect(PermissionV2.evaluate("edit", ".agent/tasks/T1/task.md", plan.permissions).effect).toBe("allow")
      expect(PermissionV2.evaluate("plan_exit", "*", plan.permissions).effect).toBe("allow")
    }),
  )

  it.effect("build mode allows edits with ask gates on destructive bash", () =>
    Effect.gen(function* () {
      const agent = yield* AgentV2.Service
      yield* AgentPlugin.Plugin.effect.pipe(
        Effect.provideService(
          Location.Service,
          Location.Service.of(location({ directory: AbsolutePath.make("/project") })),
        ),
      )

      const build = yield* agent.get(AgentV2.ID.make("build"))
      if (!build) throw new Error("expected build agent")
      expect(PermissionV2.evaluate("edit", "src/main.ts", build.permissions).effect).toBe("allow")
      expect(PermissionV2.evaluate("bash", "rm -rf node_modules", build.permissions).effect).toBe("ask")
      expect(PermissionV2.evaluate("plan_enter", "*", build.permissions).effect).toBe("allow")
    }),
  )

  it.effect("compose mode asks for direct edits but allows agent memory files", () =>
    Effect.gen(function* () {
      const agent = yield* AgentV2.Service
      yield* AgentPlugin.Plugin.effect.pipe(
        Effect.provideService(
          Location.Service,
          Location.Service.of(location({ directory: AbsolutePath.make("/project") })),
        ),
      )

      const compose = yield* agent.get(AgentV2.ID.make("compose"))
      if (!compose) throw new Error("expected compose agent")
      expect(PermissionV2.evaluate("edit", "src/main.ts", compose.permissions).effect).toBe("ask")
      expect(PermissionV2.evaluate("edit", ".agent/checkpoint.md", compose.permissions).effect).toBe("allow")
      expect(PermissionV2.evaluate("task", "*", compose.permissions).effect).toBe("allow")
    }),
  )
})
