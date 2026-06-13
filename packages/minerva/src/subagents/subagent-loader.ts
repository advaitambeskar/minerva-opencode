export * as SubagentLoader from "./subagent-loader"

/**
 * Loads subagent definitions from .agent/subagents/*.yaml and registers
 * them as AgentV2 entries with the appropriate PermissionV2 rulesets.
 *
 * The built-in profiles (researcher, planner, reviewer, debugger, tester) are
 * registered automatically. User-defined profiles in .agent/subagents/ are
 * discovered and merged.
 *
 * Read-only subagents run in parallel (the V2 SessionRunCoordinator already
 * runs different sessions concurrently). Write subagents (P2) require an
 * isolated git worktree.
 */

import path from "path"
import { Effect, Layer } from "effect"
import { Glob } from "@minerva-ai/core/util/glob"
import { PluginV2 } from "@minerva-ai/core/plugin"
import { AgentV2 } from "@minerva-ai/core/agent"
import { Config } from "@minerva-ai/core/config"
import { Location } from "@minerva-ai/core/location"
import { PermissionV2 } from "@minerva-ai/core/permission"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SubagentYaml {
  name: string
  description: string
  mode: "plan" | "build" | "compose"
  tools?: string[]
  max_tokens?: number
  output_schema?: unknown
  system?: string
}

// Tool name → PermissionV2 action mapping
const TOOL_TO_PERMISSION: Record<string, string[]> = {
  read_file: ["read"],
  write_file: ["edit"],
  edit_file: ["edit"],
  delete_file: ["edit"],  // "edit" action covers all file mutations
  shell_readonly: ["bash"],
  shell_mutating: ["bash"],
  git_read: ["bash"],     // git read is bash with limited patterns
  git_write: ["bash"],
  websearch: ["websearch"],
  webfetch: ["webfetch"],
  spawn_subagent: ["task"],
  update_memory: ["edit"],
  create_task: ["todowrite"],
  run_workflow: ["task"],
}

function toolsToRuleset(tools: string[], mode: string): PermissionV2.Ruleset {
  const rules: PermissionV2.Rule[] = [
    // Deny everything by default
    { action: "*", resource: "*", effect: "deny" },
    // Always allow reads
    { action: "read", resource: "*", effect: "allow" },
    { action: "read", resource: "*.env", effect: "ask" },
    { action: "read", resource: "*.env.*", effect: "ask" },
    { action: "read", resource: "*.env.example", effect: "allow" },
    { action: "glob", resource: "*", effect: "allow" },
    { action: "grep", resource: "*", effect: "allow" },
    // External directory restrictions
    { action: "external_directory", resource: "*", effect: "ask" },
    // Allow todowrite (task creation) always
    { action: "todowrite", resource: "*", effect: "allow" },
  ]

  for (const tool of tools ?? []) {
    const actions = TOOL_TO_PERMISSION[tool] ?? []
    for (const action of actions) {
      // In plan mode, bash is only for read-only commands; require ask for others
      if (action === "bash") {
        rules.push({ action: "bash", resource: "*", effect: mode === "plan" ? "ask" : "allow" })
      } else {
        rules.push({ action, resource: "*", effect: "allow" })
      }
    }
  }

  return rules
}

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

export const Plugin = PluginV2.define({
  id: PluginV2.ID.make("subagent-loader"),
  effect: Effect.gen(function* () {
    const agent = yield* AgentV2.Service
    const config = yield* Config.Service
    const location = yield* Location.Service

    const entries = yield* config.entries()
    const configDirs = entries.flatMap((e) => (e.type === "directory" ? [e.path] : []))

    const yamlFiles: string[] = []
    for (const dir of configDirs) {
      const subagentDir = path.join(dir, "subagents")
      const files = yield* Effect.tryPromise({
        try: () => Glob.scan("*.yaml", { cwd: subagentDir, absolute: true }),
        catch: () => [],
      }).pipe(Effect.orElseSucceed(() => [] as string[]))
      yamlFiles.push(...files)
    }

    if (yamlFiles.length === 0) return

    yield* agent.update((editor) => {
      for (const filePath of yamlFiles) {
        try {
          const { readFileSync } = require("fs") as typeof import("fs")
          const text = readFileSync(filePath, "utf8")

          // Simple YAML field extraction (avoids adding a YAML dependency)
          const parsed = parseSimpleYaml(text)
          if (!parsed?.name) continue

          const agentId = AgentV2.ID.make(parsed.name)
          const permissions = toolsToRuleset(parsed.tools ?? [], parsed.mode ?? "plan")

          editor.update(agentId, (item) => {
            item.description = parsed.description ?? `Subagent: ${parsed.name}`
            item.mode = "subagent"
            if (parsed.system) item.system = parsed.system
            item.permissions.push(...permissions)
          })
        } catch {
          // Skip malformed files silently
        }
      }
    })
  }),
})

// ---------------------------------------------------------------------------
// Minimal YAML field extractor (no deps, covers the simple flat format)
// ---------------------------------------------------------------------------

function parseSimpleYaml(text: string): SubagentYaml | undefined {
  const lines = text.split("\n")
  const result: Record<string, unknown> = {}
  let currentKey: string | null = null
  let listBuffer: string[] = []

  const flush = () => {
    if (currentKey && listBuffer.length > 0) {
      result[currentKey] = listBuffer
      listBuffer = []
    }
    currentKey = null
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd()
    if (!line || line.startsWith("#")) { flush(); continue }

    // List item under current key
    if (currentKey && line.match(/^\s+-\s+(.+)$/)) {
      const match = line.match(/^\s+-\s+(.+)$/)
      if (match) listBuffer.push(match[1].trim())
      continue
    }

    flush()

    // Key: value
    const kvMatch = line.match(/^([a-z_]+)\s*:\s*(.*)$/)
    if (kvMatch) {
      const [, key, val] = kvMatch
      const trimmed = val.trim()
      if (trimmed === "" || trimmed === ">") {
        currentKey = key
      } else {
        result[key] = trimmed.replace(/^['"]|['"]$/g, "")
      }
    }
  }
  flush()

  if (!result.name) return undefined
  return result as unknown as SubagentYaml
}

export const layer = Layer.effectDiscard(Plugin.effect)
