import * as Tool from "./tool"
import { Effect, Schema } from "effect"
import { AgentDatabase } from "@/agent-db/database"

const DESCRIPTION = `Search the local code index using semantic/full-text search.

Searches across all indexed source files in the project using FTS5 full-text search.
Returns file paths, line ranges, and relevant code snippets.

Use this tool to:
- Find where a concept, pattern, or term appears in the codebase
- Locate function definitions, class names, or error strings
- Search for usage patterns across multiple files

The semantic_search tool is faster than grep for exploratory searches because:
1. It searches a pre-built index rather than scanning files
2. It returns ranked results by relevance
3. It handles multi-word queries intelligently

IMPORTANT: After finding relevant files, always use the Read tool to load the
exact lines before editing. Never edit code based on search results alone.`

const Parameters = Schema.Struct({
  query: Schema.String.annotate({ description: "Search query — natural language or code pattern" }),
  limit: Schema.Number.pipe(Schema.optional).annotate({ description: "Max results to return (default: 10)" }),
  path: Schema.String.pipe(Schema.optional).annotate({ description: "Restrict search to files matching this path prefix" }),
})

type Metadata = {
  query: string
  results_count: number
  truncated: boolean
}

export const SemanticSearchTool = Tool.define<typeof Parameters, Metadata, AgentDatabase.Service>(
  "semantic_search",
  Effect.gen(function* () {
    const db = yield* AgentDatabase.Service
    return {
      description: DESCRIPTION,
      parameters: Parameters,
      execute: (params, _ctx) =>
        Effect.gen(function* () {
          const limit = params.limit ?? 10
          const rows = yield* db.searchCode(params.query, limit * 2)  // get more for path filtering

          const filtered = params.path
            ? rows.filter((r) => r.path.includes(params.path!))
            : rows

          const results = filtered.slice(0, limit)

          if (results.length === 0) {
            return {
              title: `No results for: ${params.query}`,
              metadata: { query: params.query, results_count: 0, truncated: false },
              output: `No code found matching "${params.query}". Try a different search term or use the grep tool for exact pattern matching.`,
            }
          }

          const lines = results.map((r, i) => {
            const preview = r.body.slice(0, 300).replace(/\n/g, "\n  ")
            return `${i + 1}. ${r.path}\n  ${preview}${r.body.length > 300 ? "..." : ""}`
          })

          return {
            title: `${results.length} results for: ${params.query}`,
            metadata: { query: params.query, results_count: results.length, truncated: filtered.length > limit },
            output: lines.join("\n\n"),
          }
        }),
    }
  }),
)
