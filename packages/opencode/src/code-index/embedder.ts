export * as Embedder from "./embedder"

/**
 * Local ONNX embedder for semantic code indexing.
 *
 * Uses @huggingface/transformers (transformers.js) with a small ONNX model
 * (bge-small-en-v1.5 or all-MiniLM-L6-v2) to generate embeddings entirely
 * on the user's machine. The model is downloaded once to Global.Path.cache
 * and reused across sessions.
 *
 * No network calls are made for indexing — only the user's configured
 * LLM providers receive network traffic.
 */

import path from "path"
import { Context, Effect, Layer, Semaphore } from "effect"
import { Global } from "@opencode-ai/core/global"
import { LayerNode } from "@opencode-ai/core/effect/layer-node"

export const MODEL_ID = "Xenova/bge-small-en-v1.5"
export const EMBEDDING_DIM = 384

export interface Interface {
  /** Generate embeddings for an array of texts. Returns Float32Array per text. */
  readonly embed: (texts: string[]) => Effect.Effect<Float32Array[]>
  /** Embed a single text */
  readonly embedOne: (text: string) => Effect.Effect<Float32Array>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/Embedder") {}

export const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const global = yield* Global.Service
    const cacheDir = path.join(global.cache, "models")
    const semaphore = yield* Semaphore.make(2) // max 2 concurrent embedding calls

    // Lazy-load the transformers pipeline (heavy import, only needed for indexing)
    // Typed loosely because FeatureExtractionPipeline is a callable class not a plain function
    let pipeline: ((texts: string[], opts?: Record<string, unknown>) => Promise<Array<{ data: Float32Array }>>) | undefined

    const getPipeline = () =>
      Effect.tryPromise({
        try: async () => {
          if (pipeline) return pipeline

          // Dynamic import to avoid startup cost when indexing is disabled
          const { pipeline: makePipeline, env } = await import("@huggingface/transformers")
          // Override cache to Global.Path.cache so model lives in a controlled location
          env.cacheDir = cacheDir
          env.allowLocalModels = true

          const p = await makePipeline("feature-extraction", MODEL_ID, {
            dtype: "q8",
            progress_callback: undefined, // suppress progress logs
          })
          pipeline = p as unknown as typeof pipeline
          return pipeline!
        },
        catch: (e) => new Error(`Failed to load embedder: ${e}`),
      })

    const embed = (texts: string[]) =>
      semaphore.withPermit(
        Effect.gen(function* () {
          const p = yield* getPipeline()
          return yield* Effect.tryPromise({
            try: async () => {
              const outputs = await p(texts, { pooling: "mean", normalize: true })
              return outputs.map((o) => o.data)
            },
            catch: (e) => new Error(`Embedding failed: ${e}`),
          })
        }),
      ).pipe(Effect.orDie)

    const embedOne = (text: string) =>
      embed([text]).pipe(Effect.map((results) => results[0]))

    return Service.of({ embed, embedOne })
  }),
)

export const defaultLayer = layer
export const node = LayerNode.make(layer, [Global.node])
