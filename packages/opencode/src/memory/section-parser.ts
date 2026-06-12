export * as SectionParser from "./section-parser"

/**
 * Parse a Markdown document into sections keyed by ## headings.
 * Returns an ordered array of {heading, body} objects.
 */

export interface Section {
  heading: string // e.g. "Architecture Decisions"
  level: number   // 1..6
  body: string    // text content under this heading
}

/**
 * Split a Markdown string into sections by headings at level >= minLevel (default 2).
 */
export function parse(markdown: string, minLevel = 2): Section[] {
  const lines = markdown.split("\n")
  const sections: Section[] = []
  let current: Section | undefined

  for (const line of lines) {
    const match = line.match(/^(#{1,6})\s+(.+)$/)
    if (match) {
      const level = match[1].length
      if (level >= minLevel) {
        if (current) sections.push(current)
        current = { heading: match[2].trim(), level, body: "" }
        continue
      }
    }
    if (current) {
      current.body += (current.body ? "\n" : "") + line
    }
  }
  if (current) sections.push(current)

  return sections.map((s) => ({ ...s, body: s.body.trim() }))
}

/** Rebuild a Markdown file from sections */
export function render(sections: Section[]): string {
  return sections.map((s) => `${"#".repeat(s.level)} ${s.heading}\n${s.body}`).join("\n\n")
}

/** Find or create a section by heading name */
export function upsert(sections: Section[], heading: string, body: string, level = 2): Section[] {
  const idx = sections.findIndex((s) => s.heading.toLowerCase() === heading.toLowerCase())
  if (idx >= 0) return sections.map((s, i) => (i === idx ? { ...s, body } : s))
  return [...sections, { heading, level, body }]
}

/** Append a line to a section (or create it) */
export function appendToSection(sections: Section[], heading: string, line: string, level = 2): Section[] {
  const idx = sections.findIndex((s) => s.heading.toLowerCase() === heading.toLowerCase())
  if (idx >= 0) {
    const s = sections[idx]
    return sections.map((sec, i) => (i === idx ? { ...sec, body: s.body ? `${s.body}\n${line}` : line } : sec))
  }
  return [...sections, { heading, level, body: line }]
}

/**
 * Standard sections used in .agent/MEMORY.md.
 */
export const MEMORY_SECTIONS = [
  "Project Overview",
  "Architecture Decisions",
  "Commands",
  "Conventions",
  "Known Pitfalls",
  "Glossary",
  "Superseded / Deprecated",
] as const
