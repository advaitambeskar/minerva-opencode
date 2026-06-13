import { run as runTui, type TuiInput } from "@minerva-ai/tui"
import { Global } from "@minerva-ai/core/global"
import { Effect } from "effect"

export function run(input: TuiInput) {
  return runTui(input).pipe(Effect.provide(Global.defaultLayer))
}
