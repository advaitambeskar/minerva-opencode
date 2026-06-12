import { describe, expect } from "bun:test"
import { Effect } from "effect"
import { Voice } from "@/voice/voice"
import { testEffect } from "../lib/effect"

const it = testEffect(Voice.defaultLayer)

describe("Voice", () => {
  it.effect("disabled stub returns off state", () =>
    Effect.gen(function* () {
      const previous = process.env.OPENCODE_DISABLE_VOICE
      process.env.OPENCODE_DISABLE_VOICE = "true"
      try {
        const voice = yield* Voice.Service.pipe(Effect.provide(Voice.defaultLayer))
        const state = yield* voice.state()
        expect(state.mode).toBe("off")
        expect(state.sessionActive).toBe(false)
      } finally {
        if (previous === undefined) delete process.env.OPENCODE_DISABLE_VOICE
        else process.env.OPENCODE_DISABLE_VOICE = previous
      }
    }),
  )

  it.effect("transcript buffer submit clears text", () =>
    Effect.gen(function* () {
      const previous = process.env.OPENCODE_DISABLE_VOICE
      delete process.env.OPENCODE_DISABLE_VOICE
      try {
        const voice = yield* Voice.Service.pipe(Effect.provide(Voice.defaultLayer))
        yield* voice.setTranscript("hello world")
        const submitted = yield* voice.submit()
        expect(submitted).toBe("hello world")
        expect((yield* voice.state()).partialTranscript).toBe("")
      } finally {
        if (previous === undefined) delete process.env.OPENCODE_DISABLE_VOICE
        else process.env.OPENCODE_DISABLE_VOICE = previous
      }
    }),
  )
})
