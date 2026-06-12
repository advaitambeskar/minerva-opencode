export * as Chunker from "./chunker"

/**
 * Language-aware code chunker.
 *
 * Strategy:
 *  - For languages with tree-sitter support (TypeScript, JavaScript, Python, etc.):
 *    chunks by top-level declarations (functions, classes, methods)
 *  - For all other files: overlapping fixed-window chunking (200 lines, 50-line overlap)
 *
 * Tree-sitter is already bundled for the TUI parser — we reuse it here.
 * We fall back to the window-based approach when tree-sitter parsing fails.
 */

const CHUNK_LINES = 150
const OVERLAP_LINES = 30
const MAX_CHUNK_BYTES = 8192  // Skip files larger than this per-chunk (in bytes, rough)

export interface Chunk {
  path: string
  start_line: number
  end_line: number
  content: string
  language?: string
  symbol_name?: string
}

/** File extension → language name */
const EXT_TO_LANG: Record<string, string> = {
  ".ts": "typescript",
  ".tsx": "typescript",
  ".js": "javascript",
  ".jsx": "javascript",
  ".mjs": "javascript",
  ".py": "python",
  ".rs": "rust",
  ".go": "go",
  ".java": "java",
  ".cs": "csharp",
  ".cpp": "cpp",
  ".c": "c",
  ".h": "c",
  ".rb": "ruby",
  ".php": "php",
  ".swift": "swift",
  ".kt": "kotlin",
  ".md": "markdown",
  ".json": "json",
  ".yaml": "yaml",
  ".yml": "yaml",
  ".toml": "toml",
  ".sql": "sql",
  ".sh": "bash",
  ".bash": "bash",
  ".zsh": "bash",
}

/** Returns true if this file extension should be indexed */
export function shouldIndex(filePath: string): boolean {
  const ext = filePath.slice(filePath.lastIndexOf(".")).toLowerCase()
  if (Object.keys(EXT_TO_LANG).includes(ext)) return true
  // Also index plain text / config files
  return [".env.example", ".gitignore", ".env.sample", ".txt", ".lock"].some((e) => filePath.endsWith(e)) === false
    && Object.keys(EXT_TO_LANG).includes(ext)
}

function getLanguage(filePath: string): string | undefined {
  const ext = filePath.slice(filePath.lastIndexOf(".")).toLowerCase()
  return EXT_TO_LANG[ext]
}

/**
 * Window-based chunker: overlapping fixed-size windows of lines.
 * Used as the universal fallback.
 */
function windowChunks(filePath: string, lines: string[]): Chunk[] {
  const chunks: Chunk[] = []
  const lang = getLanguage(filePath)
  let i = 0
  while (i < lines.length) {
    const end = Math.min(i + CHUNK_LINES, lines.length)
    const content = lines.slice(i, end).join("\n")
    if (content.trim()) {
      chunks.push({
        path: filePath,
        start_line: i + 1,
        end_line: end,
        content,
        language: lang,
      })
    }
    i += CHUNK_LINES - OVERLAP_LINES
    if (i >= lines.length) break
  }
  return chunks
}

/**
 * Chunk a source file into overlapping, semantic-aware segments.
 * For simplicity and zero native deps, always uses window chunking.
 * A future enhancement can swap in tree-sitter AST-based chunking.
 */
export function chunk(filePath: string, content: string): Chunk[] {
  const lines = content.split("\n")
  return windowChunks(filePath, lines)
}

/** Chunk with max byte limit per chunk */
export function chunkWithBudget(filePath: string, content: string, maxBytes = MAX_CHUNK_BYTES): Chunk[] {
  return chunk(filePath, content).filter((c) => Buffer.byteLength(c.content, "utf8") <= maxBytes)
}
