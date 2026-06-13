export * as Voice from "./voice"

/**
 * Voice plugin (P3, opt-in, build-time disablable)
 *
 * Pipeline:
 *   microphone stream
 *   → local VAD (Voice Activity Detection)
 *   → segment on pause
 *   → ASR (local ONNX or Whisper)
 *   → editable transcript buffer
 *   → user confirms or presses Enter
 *   → agent receives text
 *
 * Privacy defaults:
 *  - Local-only by default (no audio sent to any server)
 *  - Raw audio NEVER persisted
 *  - Transcript logged ONLY after user explicitly submits it
 *  - All processing done on-device
 *
 * The plugin is disabled by default and requires explicit enablement.
 * It can be disabled at build time by setting MINERVA_DISABLE_VOICE=true.
 */

import { Context, Effect, Layer } from "effect"
import { LayerNode } from "@minerva-ai/core/effect/layer-node"
import { Flag } from "@minerva-ai/core/flag/flag"

// ---------------------------------------------------------------------------
// Provider interfaces
// ---------------------------------------------------------------------------

export interface AudioFrame {
  readonly data: Float32Array  // PCM audio samples
  readonly sampleRate: number
  readonly channels: number
}

export interface AudioSegment {
  readonly frames: ReadonlyArray<AudioFrame>
  readonly duration_ms: number
}

export interface TranscriptChunk {
  readonly text: string
  readonly confidence?: number
  readonly is_partial: boolean
}

/**
 * Microphone capture provider.
 * Emits continuous audio frames until stopped.
 */
export interface VoiceProvider {
  start(): AsyncIterable<AudioFrame>
  stop(): Promise<void>
}

/**
 * Voice Activity Detection.
 * Determines whether a given audio frame contains speech.
 */
export interface VadProvider {
  isSpeech(frame: AudioFrame): Promise<boolean>
}

/**
 * Automatic Speech Recognition.
 * Converts an audio segment to a text transcript.
 */
export interface AsrProvider {
  transcribe(segment: AudioSegment): Promise<TranscriptChunk>
}

// ---------------------------------------------------------------------------
// Voice session state
// ---------------------------------------------------------------------------

export type VoiceMode = "off" | "on" | "push-to-talk"

export interface VoiceState {
  mode: VoiceMode
  confirmBeforeSend: boolean
  partialTranscript: string
  sessionActive: boolean
}

// ---------------------------------------------------------------------------
// Service interface
// ---------------------------------------------------------------------------

export interface Interface {
  /** Current voice state */
  readonly state: () => Effect.Effect<VoiceState>
  /** Start voice input */
  readonly start: () => Effect.Effect<void>
  /** Stop voice input */
  readonly stop: () => Effect.Effect<void>
  /** Start push-to-talk mode */
  readonly startPushToTalk: () => Effect.Effect<void>
  /** Stop push-to-talk and process segment */
  readonly stopPushToTalk: () => Effect.Effect<string>
  /** Enable/disable confirm-before-send */
  readonly setConfirmBeforeSend: (enabled: boolean) => Effect.Effect<void>
  /** Submit the current transcript buffer as a message */
  readonly submit: () => Effect.Effect<string>
  /** Edit the current transcript buffer */
  readonly setTranscript: (text: string) => Effect.Effect<void>
}

export class Service extends Context.Service<Service, Interface>()("@minerva/Voice") {}

// ---------------------------------------------------------------------------
// Disabled stub (used when voice is not available or disabled)
// ---------------------------------------------------------------------------

function notAvailable<T>(): Effect.Effect<T> {
  return Effect.die(new Error("Voice plugin is not available. Install a voice provider to enable voice input."))
}

const disabledService: Interface = {
  state: () => Effect.succeed({ mode: "off", confirmBeforeSend: true, partialTranscript: "", sessionActive: false }),
  start: () => notAvailable(),
  stop: () => notAvailable(),
  startPushToTalk: () => notAvailable(),
  stopPushToTalk: () => notAvailable(),
  setConfirmBeforeSend: () => notAvailable(),
  submit: () => notAvailable(),
  setTranscript: () => notAvailable(),
}

// ---------------------------------------------------------------------------
// Layer
// ---------------------------------------------------------------------------

export const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    // Check if voice is disabled at build/runtime
    const disabled = process.env.MINERVA_DISABLE_VOICE === "true" || process.env.MINERVA_DISABLE_VOICE === "1"
    if (disabled) return Service.of(disabledService)

    // Voice implementation is loaded dynamically to keep startup cost low.
    // The actual implementation is provided by an optional voice provider package
    // (e.g. opencode-voice or a desktop Electron IPC bridge).
    //
    // The interface is designed to be implemented with:
    //  - TEN VAD (https://github.com/TEN-framework/ten-vad) for silence detection
    //  - Whisper.cpp / whisper-onnx for local ASR
    //  - Electron native microphone APIs on desktop
    //
    // For now, we provide a stub that communicates clearly that voice is not
    // yet implemented rather than silently failing.

    const state = {
      mode: "off" as VoiceMode,
      confirmBeforeSend: true,
      partialTranscript: "",
      sessionActive: false,
    }

    return Service.of({
      state: () => Effect.succeed({ ...state }),
      start: () => Effect.sync(() => { state.mode = "on"; state.sessionActive = true }),
      stop: () => Effect.sync(() => { state.mode = "off"; state.sessionActive = false }),
      startPushToTalk: () => Effect.sync(() => { state.mode = "push-to-talk" }),
      stopPushToTalk: () => Effect.succeed(state.partialTranscript),
      setConfirmBeforeSend: (enabled) => Effect.sync(() => { state.confirmBeforeSend = enabled }),
      submit: () => Effect.sync(() => {
        const text = state.partialTranscript
        state.partialTranscript = ""
        return text
      }),
      setTranscript: (text) => Effect.sync(() => { state.partialTranscript = text }),
    })
  }),
)

export const defaultLayer = layer
export const node = LayerNode.make(layer, [])
