export * as ConfigPaths from "./paths"

import path from "path"
import { Flag } from "@opencode-ai/core/flag/flag"
import { Global } from "@opencode-ai/core/global"
import { unique } from "remeda"
import * as Effect from "effect/Effect"
import { FSUtil } from "@opencode-ai/core/fs-util"

export const files = Effect.fn("ConfigPaths.projectFiles")(function* (
  name: string,
  directory: string,
  worktree?: string,
) {
  const afs = yield* FSUtil.Service
  return (yield* afs.up({
    targets: [`${name}.jsonc`, `${name}.json`],
    start: directory,
    stop: worktree,
  })).toReversed()
})

// Canonical project dir is .agent/; .opencode/ is kept as a deprecated fallback.
const PROJECT_DIR_NAMES = [".agent", ".opencode"]

function dedupeProjectDirs(found: string[]): string[] {
  const seenLevels = new Set<string>()
  return found.filter((item) => {
    if (!PROJECT_DIR_NAMES.includes(path.basename(item))) return true
    const level = path.dirname(item)
    if (seenLevels.has(level)) return false
    seenLevels.add(level)
    return true
  })
}

export const directories = Effect.fn("ConfigPaths.directories")(function* (directory: string, worktree?: string) {
  const afs = yield* FSUtil.Service
  const projectDirs = !Flag.OPENCODE_DISABLE_PROJECT_CONFIG
    ? dedupeProjectDirs(
        yield* afs.up({
          targets: PROJECT_DIR_NAMES,
          start: directory,
          stop: worktree,
        }),
      )
    : []
  const homeDirs = dedupeProjectDirs(
    yield* afs.up({
      targets: PROJECT_DIR_NAMES,
      start: Global.Path.home,
      stop: Global.Path.home,
    }),
  )
  return unique([Global.Path.config, ...projectDirs, ...homeDirs, ...(Flag.OPENCODE_CONFIG_DIR ? [Flag.OPENCODE_CONFIG_DIR] : [])])
})

export function fileInDirectory(dir: string, name: string) {
  return [path.join(dir, `${name}.json`), path.join(dir, `${name}.jsonc`)]
}
