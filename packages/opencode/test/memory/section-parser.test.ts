import { describe, expect, test } from "bun:test"
import { SectionParser } from "../../src/memory/section-parser"

describe("SectionParser", () => {
  test("parse splits markdown by ## headings", () => {
    const md = `# Title

## Project Overview
Overview body

## Commands
- bun test
`
    const sections = SectionParser.parse(md)
    expect(sections).toEqual([
      { heading: "Project Overview", level: 2, body: "Overview body" },
      { heading: "Commands", level: 2, body: "- bun test" },
    ])
  })

  test("render round-trips parsed sections", () => {
    const sections = [
      { heading: "Architecture Decisions", level: 2, body: "Use SQLite" },
      { heading: "Commands", level: 2, body: "bun test" },
    ]
    const rendered = SectionParser.render(sections)
    expect(SectionParser.parse(rendered)).toEqual(sections)
  })

  test("upsert is case-insensitive", () => {
    const sections = SectionParser.parse("## Commands\nold")
    const updated = SectionParser.upsert(sections, "commands", "new")
    expect(updated).toHaveLength(1)
    expect(updated[0].body).toBe("new")
  })

  test("appendToSection appends or creates", () => {
    const sections = SectionParser.parse("## Conventions\nline one")
    const appended = SectionParser.appendToSection(sections, "Conventions", "line two")
    expect(appended[0].body).toBe("line one\nline two")

    const created = SectionParser.appendToSection([], "Glossary", "term")
    expect(created).toEqual([{ heading: "Glossary", level: 2, body: "term" }])
  })

  test("parse returns empty for doc without level-2 headings", () => {
    expect(SectionParser.parse("# Only H1\nno sections")).toEqual([])
  })
})
