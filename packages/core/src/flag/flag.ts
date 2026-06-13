import { Config } from "effect"

export function truthy(key: string) {
  const value = process.env[key]?.toLowerCase()
  return value === "true" || value === "1"
}

const copy = process.env["MINERVA_EXPERIMENTAL_DISABLE_COPY_ON_SELECT"]
const fff = process.env["MINERVA_DISABLE_FFF"]

function enabledByExperimental(key: string) {
  return process.env[key] === undefined ? truthy("MINERVA_EXPERIMENTAL") : truthy(key)
}

export const Flag = {
  OTEL_EXPORTER_OTLP_ENDPOINT: process.env["OTEL_EXPORTER_OTLP_ENDPOINT"],
  OTEL_EXPORTER_OTLP_HEADERS: process.env["OTEL_EXPORTER_OTLP_HEADERS"],

  MINERVA_AUTO_HEAP_SNAPSHOT: truthy("MINERVA_AUTO_HEAP_SNAPSHOT"),
  MINERVA_GIT_BASH_PATH: process.env["MINERVA_GIT_BASH_PATH"],
  MINERVA_CONFIG: process.env["MINERVA_CONFIG"],
  MINERVA_CONFIG_CONTENT: process.env["MINERVA_CONFIG_CONTENT"],
  MINERVA_DISABLE_AUTOUPDATE: truthy("MINERVA_DISABLE_AUTOUPDATE"),
  MINERVA_ALWAYS_NOTIFY_UPDATE: truthy("MINERVA_ALWAYS_NOTIFY_UPDATE"),
  MINERVA_DISABLE_PRUNE: truthy("MINERVA_DISABLE_PRUNE"),
  MINERVA_DISABLE_TERMINAL_TITLE: truthy("MINERVA_DISABLE_TERMINAL_TITLE"),
  MINERVA_SHOW_TTFD: truthy("MINERVA_SHOW_TTFD"),
  MINERVA_DISABLE_AUTOCOMPACT: truthy("MINERVA_DISABLE_AUTOCOMPACT"),
  MINERVA_DISABLE_MODELS_FETCH: truthy("MINERVA_DISABLE_MODELS_FETCH"),
  MINERVA_DISABLE_MOUSE: truthy("MINERVA_DISABLE_MOUSE"),
  MINERVA_FAKE_VCS: process.env["MINERVA_FAKE_VCS"],
  MINERVA_SERVER_PASSWORD: process.env["MINERVA_SERVER_PASSWORD"],
  MINERVA_SERVER_USERNAME: process.env["MINERVA_SERVER_USERNAME"],
  MINERVA_DISABLE_FFF: fff === undefined ? process.platform === "win32" : truthy("MINERVA_DISABLE_FFF"),

  // Experimental
  MINERVA_EXPERIMENTAL_FILEWATCHER: Config.boolean("MINERVA_EXPERIMENTAL_FILEWATCHER").pipe(
    Config.withDefault(false),
  ),
  MINERVA_EXPERIMENTAL_DISABLE_FILEWATCHER: Config.boolean("MINERVA_EXPERIMENTAL_DISABLE_FILEWATCHER").pipe(
    Config.withDefault(false),
  ),
  MINERVA_EXPERIMENTAL_DISABLE_COPY_ON_SELECT:
    copy === undefined ? process.platform === "win32" : truthy("MINERVA_EXPERIMENTAL_DISABLE_COPY_ON_SELECT"),
  MINERVA_MODELS_URL: process.env["MINERVA_MODELS_URL"],
  MINERVA_MODELS_PATH: process.env["MINERVA_MODELS_PATH"],
  MINERVA_DB: process.env["MINERVA_DB"],

  MINERVA_WORKSPACE_ID: process.env["MINERVA_WORKSPACE_ID"],
  MINERVA_EXPERIMENTAL_WORKSPACES: enabledByExperimental("MINERVA_EXPERIMENTAL_WORKSPACES"),

  // Evaluated at access time (not module load) because tests, the CLI, and
  // external tooling set these env vars at runtime.
  get MINERVA_DISABLE_PROJECT_CONFIG() {
    return truthy("MINERVA_DISABLE_PROJECT_CONFIG")
  },
  get MINERVA_EXPERIMENTAL_REFERENCES() {
    return enabledByExperimental("MINERVA_EXPERIMENTAL_REFERENCES")
  },
  get MINERVA_TUI_CONFIG() {
    return process.env["MINERVA_TUI_CONFIG"]
  },
  get MINERVA_CONFIG_DIR() {
    return process.env["MINERVA_CONFIG_DIR"]
  },
  get MINERVA_PURE() {
    return truthy("MINERVA_PURE")
  },
  get MINERVA_PERMISSION() {
    return process.env["MINERVA_PERMISSION"]
  },
  get MINERVA_PLUGIN_META_FILE() {
    return process.env["MINERVA_PLUGIN_META_FILE"]
  },
  get MINERVA_CLIENT() {
    return process.env["MINERVA_CLIENT"] ?? "cli"
  },
}
