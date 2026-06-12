import { describe, expect } from "bun:test"
import { Effect, Layer } from "effect"
import { FSUtil } from "@opencode-ai/core/fs-util"
import { Flag } from "@opencode-ai/core/flag/flag"
import { Global } from "@opencode-ai/core/global"
import { Location } from "@opencode-ai/core/location"
import { AbsolutePath } from "@opencode-ai/core/schema"
import { SystemContext } from "@opencode-ai/core/system-context"
import { SystemContextBuiltIns } from "@opencode-ai/core/system-context/builtins"
import { SystemContextRegistry } from "@opencode-ai/core/system-context/registry"
import { location } from "./fixture/location"
import { testEffect } from "./lib/effect"

const projectDir = AbsolutePath.make("/repo")
const memoryPath = "/repo/.agent/MEMORY.md"
const checkpointPath = "/repo/.agent/checkpoint.md"

const memoryFS = Layer.effect(
  FSUtil.Service,
  FSUtil.Service.pipe(
    Effect.map((fs) =>
      FSUtil.Service.of({
        ...fs,
        readFileStringSafe: (path) =>
          Effect.succeed(
            path === memoryPath
              ? `# Project Memory\n\n## Commands\nbun test\n`
              : path === checkpointPath
                ? `# Session Checkpoint\n\n## Goal\nResume work\n`
                : undefined,
          ),
      }),
    ),
  ),
).pipe(Layer.provide(FSUtil.defaultLayer))

const locationLayer = Layer.succeed(
  Location.Service,
  Location.Service.of(
    location({ directory: AbsolutePath.make("/repo/packages/opencode") }, { projectDirectory: projectDir }),
  ),
)

const baseLayer = SystemContextBuiltIns.locationLayer.pipe(
  Layer.provide(memoryFS),
  Layer.provide(Global.layerWith({ config: "/global" })),
  Layer.provide(locationLayer),
)

const it = testEffect(baseLayer)

const longMemoryBody = "x".repeat(5000)
const truncFSLayer = Layer.effect(
  FSUtil.Service,
  FSUtil.Service.pipe(
    Effect.map((fs) =>
      FSUtil.Service.of({
        ...fs,
        readFileStringSafe: (path) =>
          Effect.succeed(path === memoryPath ? `# Memory\n\n## Commands\n${longMemoryBody}` : undefined),
      }),
    ),
  ),
).pipe(Layer.provide(FSUtil.defaultLayer))

const truncLayer = SystemContextBuiltIns.locationLayer.pipe(
  Layer.provide(truncFSLayer),
  Layer.provide(Global.layerWith({ config: "/global" })),
  Layer.provide(locationLayer),
)

const truncIt = testEffect(truncLayer)

describe("MemoryContext", () => {
  it.effect("injects project memory and checkpoint cards", () =>
    Effect.gen(function* () {
      const registry = yield* SystemContextRegistry.Service
      const initialized = yield* SystemContext.initialize(yield* registry.load())

      expect(initialized.baseline).toContain("<ProjectMemory")
      expect(initialized.baseline).toContain("bun test")
      expect(initialized.baseline).toContain("<SessionCheckpoint")
      expect(initialized.baseline).toContain("Resume work")
    }),
  )

  truncIt.effect("truncates oversized memory content", () =>
    Effect.gen(function* () {
      const registry = yield* SystemContextRegistry.Service
      const initialized = yield* SystemContext.initialize(yield* registry.load())
      expect(initialized.baseline).toContain("[... truncated for context window ...]")
      expect(initialized.baseline.length).toBeLessThan(5000)
    }),
  )

})
