import path from "path"
import fs from "fs/promises"
import { Effect, Layer } from "effect"
import { CrossSpawnSpawner } from "@minerva-ai/core/cross-spawn-spawner"
import { Config } from "@minerva-ai/core/config"
import { FSUtil } from "@minerva-ai/core/fs-util"
import { Global } from "@minerva-ai/core/global"
import { Ripgrep } from "@minerva-ai/core/ripgrep"
import { AbsolutePath } from "@minerva-ai/core/schema"
import { AgentDatabase } from "@/agent-db/database"
import { AgentEventLog } from "@/agent-db/event-log"
import { Checkpoint } from "@/checkpoint/checkpoint"
import { CodeIndexer } from "@/code-index/indexer"
import { ContextGateway } from "@/context/context-gateway"
import { Goal } from "@/goal/goal"
import { Memory } from "@/memory/memory"
import { TaskGraph } from "@/task-graph/task-graph"
import { Workflow } from "@/workflow/workflow"
import { WorktreeManager } from "@/subagents/worktree-manager"
import { provideInstanceEffect, testInstanceStoreLayer, tmpdirScoped } from "./fixture"

const globalLayer = Global.layerWith({
  config: path.join(process.cwd(), ".test-global"),
  data: path.join(process.cwd(), ".test-data"),
  tmp: path.join(process.cwd(), ".test-tmp"),
})

const dbLayer = AgentDatabase.defaultLayer
const eventLogLayer = AgentEventLog.defaultLayer
const memoryLayer = Memory.defaultLayer.pipe(Layer.provide(dbLayer))
const taskGraphLayer = TaskGraph.defaultLayer.pipe(Layer.provide(dbLayer))
const goalLayer = Goal.defaultLayer.pipe(Layer.provide(memoryLayer), Layer.provide(taskGraphLayer))
const checkpointLayer = Checkpoint.defaultLayer.pipe(Layer.provide(memoryLayer))
const contextGatewayLayer = ContextGateway.defaultLayer.pipe(
  Layer.provide(memoryLayer),
  Layer.provide(taskGraphLayer),
  Layer.provide(dbLayer),
)
const codeIndexerLayer = CodeIndexer.defaultLayer.pipe(Layer.provide(dbLayer), Layer.provide(Ripgrep.defaultLayer))
const worktreeLayer = WorktreeManager.defaultLayer

export const agentStackLayer = Layer.mergeAll(
  dbLayer,
  eventLogLayer,
  memoryLayer,
  taskGraphLayer,
  goalLayer,
  checkpointLayer,
  contextGatewayLayer,
  FSUtil.defaultLayer,
  CrossSpawnSpawner.defaultLayer,
  Ripgrep.defaultLayer,
  globalLayer,
)

export const agentStackWithIndexerLayer = Layer.mergeAll(agentStackLayer, codeIndexerLayer, worktreeLayer)

export const configWithAgentDir = (directory: string) =>
  Config.Service.of({
    entries: () =>
      Effect.succeed([
        new Config.Directory({ type: "directory", path: AbsolutePath.make(path.join(directory, ".agent")) }),
      ]),
  })

export const workflowStackLayer = (directory: string) =>
  Workflow.defaultLayer.pipe(
    Layer.provide(dbLayer),
    Layer.provide(Layer.succeed(Config.Service, configWithAgentDir(directory))),
    Layer.provide(agentStackLayer),
  )

export const agentTestLayer = Layer.mergeAll(agentStackLayer, testInstanceStoreLayer)

export const agentIndexerTestLayer = Layer.mergeAll(agentStackWithIndexerLayer, testInstanceStoreLayer)

const agentTmpRoot = path.join(process.cwd(), ".test-tmp")

export const withAgentDir =
  <A, E, R>(self: (directory: string) => Effect.Effect<A, E, R>, options?: { git?: boolean }) =>
    Effect.gen(function* () {
      yield* Effect.promise(() => fs.mkdir(agentTmpRoot, { recursive: true }))
      const directory = yield* tmpdirScoped({ ...options, root: agentTmpRoot })
      return yield* self(directory).pipe(provideInstanceEffect(directory))
    })
