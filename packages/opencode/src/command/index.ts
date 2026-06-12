import { LayerNode } from "@opencode-ai/core/effect/layer-node"
import { InstanceState } from "@/effect/instance-state"
import { EffectBridge } from "@/effect/bridge"
import type { InstanceContext } from "@/project/instance-context"
import { SessionID, MessageID } from "@/session/schema"
import { Effect, Layer, Context, Schema } from "effect"
import { Config } from "@/config/config"
import { MCP } from "../mcp"
import { Skill } from "../skill"
import { EventV2 } from "@opencode-ai/core/event"
import PROMPT_INITIALIZE from "./template/initialize.txt"
import PROMPT_REVIEW from "./template/review.txt"
import PROMPT_MODE_PLAN from "./template/mode-plan.txt"
import PROMPT_MODE_BUILD from "./template/mode-build.txt"
import PROMPT_MODE_COMPOSE from "./template/mode-compose.txt"
import PROMPT_MODE_SHOW from "./template/mode-show.txt"
import PROMPT_MEMORY_LIST from "./template/memory-list.txt"
import PROMPT_MEMORY_SEARCH from "./template/memory-search.txt"
import PROMPT_MEMORY_FORGET from "./template/memory-forget.txt"
import PROMPT_CHECKPOINT from "./template/checkpoint.txt"
import PROMPT_TASK from "./template/task.txt"
import PROMPT_GOAL from "./template/goal.txt"
import PROMPT_STOP from "./template/stop.txt"
import PROMPT_COMPOSE from "./template/compose.txt"
import PROMPT_DREAM from "./template/dream.txt"
import PROMPT_DISTILL from "./template/distill.txt"
import PROMPT_VOICE from "./template/voice.txt"

type State = {
  commands: Record<string, Info>
}

export const Event = {
  Executed: EventV2.define({
    type: "command.executed",
    schema: {
      name: Schema.String,
      sessionID: SessionID,
      arguments: Schema.String,
      messageID: MessageID,
    },
  }),
}

export const Info = Schema.Struct({
  name: Schema.String,
  description: Schema.optional(Schema.String),
  agent: Schema.optional(Schema.String),
  model: Schema.optional(Schema.String),
  source: Schema.optional(Schema.Literals(["command", "mcp", "skill"])),
  // Some command templates are lazy promises from MCP prompt resolution.
  template: Schema.Unknown,
  subtask: Schema.optional(Schema.Boolean),
  hints: Schema.Array(Schema.String),
}).annotate({ identifier: "Command" })

export type Info = Omit<Schema.Schema.Type<typeof Info>, "template"> & { template: Promise<string> | string }

export function hints(template: string) {
  const result: string[] = []
  const numbered = template.match(/\$\d+/g)
  if (numbered) {
    for (const match of [...new Set(numbered)].sort()) result.push(match)
  }
  if (template.includes("$ARGUMENTS")) result.push("$ARGUMENTS")
  return result
}

export const Default = {
  INIT: "init",
  REVIEW: "review",
  MODE_PLAN: "plan",
  MODE_BUILD: "build",
  MODE_COMPOSE: "compose",
  MODE_SHOW: "mode",
  MEMORY_LIST: "memory",
  MEMORY_SEARCH: "memory-search",
  MEMORY_FORGET: "memory-forget",
  CHECKPOINT: "checkpoint",
  TASK: "task",
  GOAL: "goal",
  STOP: "stop",
  COMPOSE: "compose",
  DREAM: "dream",
  DISTILL: "distill",
  VOICE: "voice",
} as const

export interface Interface {
  readonly get: (name: string) => Effect.Effect<Info | undefined>
  readonly list: () => Effect.Effect<Info[]>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/Command") {}

export const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const config = yield* Config.Service
    const mcp = yield* MCP.Service
    const skill = yield* Skill.Service

    const init = Effect.fn("Command.state")(function* (ctx: InstanceContext) {
      const cfg = yield* config.get()
      const bridge = yield* EffectBridge.make()
      const commands: Record<string, Info> = {}

      commands[Default.INIT] = {
        name: Default.INIT,
        description: "guided AGENTS.md setup",
        source: "command",
        get template() {
          return PROMPT_INITIALIZE.replace("${path}", ctx.worktree)
        },
        hints: hints(PROMPT_INITIALIZE),
      }
      commands[Default.REVIEW] = {
        name: Default.REVIEW,
        description: "review changes [commit|branch|pr], defaults to uncommitted",
        source: "command",
        get template() {
          return PROMPT_REVIEW.replace("${path}", ctx.worktree)
        },
        subtask: true,
        hints: hints(PROMPT_REVIEW),
      }
      // Mode switching commands
      commands[Default.MODE_PLAN] = {
        name: Default.MODE_PLAN,
        description: "switch to read-only plan mode",
        agent: "plan",
        source: "command",
        get template() {
          return PROMPT_MODE_PLAN
        },
        hints: [],
      }
      commands[Default.MODE_BUILD] = {
        name: Default.MODE_BUILD,
        description: "switch to full-access build mode",
        agent: "build",
        source: "command",
        get template() {
          return PROMPT_MODE_BUILD
        },
        hints: [],
      }
      commands[Default.MODE_COMPOSE] = {
        name: Default.MODE_COMPOSE,
        description: "switch to workflow orchestration compose mode",
        agent: "compose",
        source: "command",
        get template() {
          return PROMPT_MODE_COMPOSE
        },
        hints: [],
      }
      commands[Default.MODE_SHOW] = {
        name: Default.MODE_SHOW,
        description: "show current mode and capability profile",
        source: "command",
        get template() {
          return PROMPT_MODE_SHOW
        },
        hints: [],
      }
      // Memory commands
      commands[Default.MEMORY_LIST] = {
        name: Default.MEMORY_LIST,
        description: "list project memory items from .agent/MEMORY.md",
        source: "command",
        get template() {
          return PROMPT_MEMORY_LIST
        },
        hints: ["$ARGUMENTS"],
      }
      commands[Default.MEMORY_SEARCH] = {
        name: Default.MEMORY_SEARCH,
        description: "search project memory",
        source: "command",
        get template() {
          return PROMPT_MEMORY_SEARCH
        },
        hints: ["$ARGUMENTS"],
      }
      commands[Default.MEMORY_FORGET] = {
        name: Default.MEMORY_FORGET,
        description: "remove an item from project memory",
        source: "command",
        get template() {
          return PROMPT_MEMORY_FORGET
        },
        hints: ["$ARGUMENTS"],
      }
      commands[Default.CHECKPOINT] = {
        name: Default.CHECKPOINT,
        description: "write a session checkpoint to .agent/checkpoint.md",
        source: "command",
        get template() {
          return PROMPT_CHECKPOINT
        },
        hints: ["$ARGUMENTS"],
      }
      commands[Default.TASK] = {
        name: Default.TASK,
        description: "manage the task graph — create|split|start|block|done|tree",
        source: "command",
        get template() {
          return PROMPT_TASK
        },
        hints: ["$ARGUMENTS"],
      }
      commands[Default.GOAL] = {
        name: Default.GOAL,
        description: "manage the active goal and stopping condition at .agent/goal.md",
        source: "command",
        get template() {
          return PROMPT_GOAL
        },
        hints: ["$ARGUMENTS"],
      }
      commands[Default.STOP] = {
        name: Default.STOP,
        description: "evaluate goal completion before stopping (use --force to override)",
        source: "command",
        get template() {
          return PROMPT_STOP
        },
        hints: ["$ARGUMENTS"],
      }
      commands[Default.COMPOSE] = {
        name: Default.COMPOSE,
        description: "run a multi-step compose workflow — feature|tdd|debug|review|list|status|cancel",
        agent: "compose",
        source: "command",
        get template() {
          return PROMPT_COMPOSE
        },
        hints: ["$ARGUMENTS"],
      }
      // Dream & Distill — memory promotion and skill extraction
      commands[Default.DREAM] = {
        name: Default.DREAM,
        description: "extract durable project knowledge from this session into .agent/MEMORY.md",
        agent: "build",
        source: "command",
        get template() {
          return PROMPT_DREAM
        },
        hints: ["$ARGUMENTS"],
      }
      commands[Default.DISTILL] = {
        name: Default.DISTILL,
        description: "detect repeated patterns and propose reusable skills/workflows/commands",
        agent: "plan",
        source: "command",
        get template() {
          return PROMPT_DISTILL
        },
        hints: ["$ARGUMENTS"],
      }
      commands[Default.VOICE] = {
        name: Default.VOICE,
        description: "control local voice input — on|off|push-to-talk|confirm-before-send|status",
        source: "command",
        get template() {
          return PROMPT_VOICE
        },
        hints: ["$ARGUMENTS"],
      }

      for (const [name, command] of Object.entries(cfg.command ?? {})) {
        commands[name] = {
          name,
          agent: command.agent,
          model: command.model,
          description: command.description,
          source: "command",
          get template() {
            return command.template
          },
          subtask: command.subtask,
          hints: hints(command.template),
        }
      }

      for (const [name, prompt] of Object.entries(yield* mcp.prompts())) {
        commands[name] = {
          name,
          source: "mcp",
          description: prompt.description,
          get template() {
            return bridge.promise(
              mcp
                .getPrompt(
                  prompt.client,
                  prompt.name,
                  prompt.arguments
                    ? Object.fromEntries(prompt.arguments.map((argument, i) => [argument.name, `$${i + 1}`]))
                    : {},
                )
                .pipe(
                  Effect.map(
                    (template) =>
                      template?.messages
                        .map((message) => (message.content.type === "text" ? message.content.text : ""))
                        .join("\n") || "",
                  ),
                ),
            )
          },
          hints: prompt.arguments?.map((_, i) => `$${i + 1}`) ?? [],
        }
      }

      for (const item of yield* skill.all()) {
        if (commands[item.name]) continue
        commands[item.name] = {
          name: item.name,
          description: item.description,
          source: "skill",
          get template() {
            return item.content
          },
          hints: [],
        }
      }

      return {
        commands,
      }
    })

    const state = yield* InstanceState.make<State>((ctx) => init(ctx))

    const get = Effect.fn("Command.get")(function* (name: string) {
      const s = yield* InstanceState.get(state)
      return s.commands[name]
    })

    const list = Effect.fn("Command.list")(function* () {
      const s = yield* InstanceState.get(state)
      return Object.values(s.commands)
    })

    return Service.of({ get, list })
  }),
)

export const defaultLayer = layer.pipe(
  Layer.provide(Config.defaultLayer),
  Layer.provide(MCP.defaultLayer),
  Layer.provide(Skill.defaultLayer),
)

export const node = LayerNode.make(layer, [Config.node, MCP.node, Skill.node])

export * as Command from "."
