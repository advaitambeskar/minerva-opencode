import { describe, expect } from "bun:test"
import fs from "fs/promises"
import path from "path"
import { Effect, Layer } from "effect"
import { AgentV2 } from "@minerva-ai/core/agent"
import { Config } from "@minerva-ai/core/config"
import { Location } from "@minerva-ai/core/location"
import { Project } from "@minerva-ai/core/project"
import { PermissionV2 } from "@minerva-ai/core/permission"
import { AbsolutePath } from "@minerva-ai/core/schema"
import { SubagentLoader } from "@/subagents/subagent-loader"
import { tmpdir } from "../fixture/fixture"
import { testEffect } from "../lib/effect"

const it = testEffect(AgentV2.locationLayer)

const RESEARCHER_YAML = `name: researcher
description: Read-only codebase research
mode: plan
tools:
  - read_file
  - grep
  - glob
system: Research carefully.
`

describe("SubagentLoader", () => {
  it.live("discovers yaml profiles and registers agents", () =>
    Effect.acquireRelease(
      Effect.promise(() => tmpdir()),
      (tmp) => Effect.promise(() => tmp[Symbol.asyncDispose]()),
    ).pipe(
      Effect.flatMap((tmp) =>
        Effect.gen(function* () {
          const agentDir = path.join(tmp.path, ".agent", "subagents")
          yield* Effect.promise(async () => {
            await fs.mkdir(agentDir, { recursive: true })
            await fs.writeFile(path.join(agentDir, "researcher.yaml"), RESEARCHER_YAML)
          })

          const agents = yield* AgentV2.Service
          yield* SubagentLoader.Plugin.effect.pipe(
            Effect.provideService(
              Config.Service,
              Config.Service.of({
                entries: () =>
                  Effect.succeed([
                    new Config.Directory({ type: "directory", path: AbsolutePath.make(path.join(tmp.path, ".agent")) }),
                  ]),
              }),
            ),
            Effect.provideService(
              Location.Service,
              Location.Service.of({
                directory: AbsolutePath.make(tmp.path),
                project: { directory: AbsolutePath.make(tmp.path), id: Project.ID.global },
              } satisfies Location.Interface),
            ),
            Effect.provideService(AgentV2.Service, agents),
          )

          const researcher = yield* agents.get(AgentV2.ID.make("researcher"))
          expect(researcher?.description).toBe("Read-only codebase research")
          expect(researcher?.mode).toBe("subagent")
          expect(PermissionV2.evaluate("read", "src/main.ts", researcher!.permissions).effect).toBe("allow")
          expect(PermissionV2.evaluate("edit", "src/main.ts", researcher!.permissions).effect).toBe("deny")
        }),
      ),
    ),
  )

  it.live("skips invalid yaml without crashing", () =>
    Effect.acquireRelease(
      Effect.promise(() => tmpdir()),
      (tmp) => Effect.promise(() => tmp[Symbol.asyncDispose]()),
    ).pipe(
      Effect.flatMap((tmp) =>
        Effect.gen(function* () {
          const agentDir = path.join(tmp.path, ".agent", "subagents")
          yield* Effect.promise(async () => {
            await fs.mkdir(agentDir, { recursive: true })
            await fs.writeFile(path.join(agentDir, "broken.yaml"), "not: [valid: yaml")
          })

          const agents = yield* AgentV2.Service
          yield* SubagentLoader.Plugin.effect.pipe(
            Effect.provideService(
              Config.Service,
              Config.Service.of({
                entries: () =>
                  Effect.succeed([
                    new Config.Directory({ type: "directory", path: AbsolutePath.make(path.join(tmp.path, ".agent")) }),
                  ]),
              }),
            ),
            Effect.provideService(
              Location.Service,
              Location.Service.of({
                directory: AbsolutePath.make(tmp.path),
                project: { directory: AbsolutePath.make(tmp.path), id: Project.ID.global },
              } satisfies Location.Interface),
            ),
            Effect.provideService(AgentV2.Service, agents),
          )

          expect(yield* agents.get(AgentV2.ID.make("broken"))).toBeUndefined()
        }),
      ),
    ),
  )
})
