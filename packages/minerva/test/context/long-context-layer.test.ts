import { describe, expect } from "bun:test"
import { Effect, Layer } from "effect"
import { SystemContext } from "@minerva-ai/core/system-context"
import { SystemContextRegistry } from "@minerva-ai/core/system-context/registry"
import { LongContext } from "@/context/long-context"
import { testEffect } from "../lib/effect"

const it = testEffect(LongContext.layer.pipe(Layer.provideMerge(SystemContextRegistry.layer)))

describe("LongContext layer", () => {
  it.effect("registers virtual long context strategy note", () =>
    Effect.gen(function* () {
      const registry = yield* SystemContextRegistry.Service
      const initialized = yield* SystemContext.initialize(yield* registry.load())

      expect(initialized.baseline).toContain("Virtual Long Context")
      expect(initialized.baseline).toContain("semantic_search")
      expect(initialized.baseline).toContain("Do NOT claim")
    }),
  )
})
