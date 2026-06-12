import { describe, expect, test } from "bun:test"
import { Chunker } from "../../src/code-index/chunker"

describe("Chunker", () => {
  test("shouldIndex accepts known source extensions", () => {
    expect(Chunker.shouldIndex("src/index.ts")).toBe(true)
    expect(Chunker.shouldIndex("lib/util.py")).toBe(true)
  })

  test("shouldIndex rejects unknown extensions", () => {
    expect(Chunker.shouldIndex("image.png")).toBe(false)
    expect(Chunker.shouldIndex("archive.zip")).toBe(false)
  })

  test("chunk produces overlapping windows", () => {
    const lines = Array.from({ length: 200 }, (_, i) => `line ${i + 1}`)
    const content = lines.join("\n")
    const chunks = Chunker.chunk("src/file.ts", content)
    expect(chunks.length).toBeGreaterThan(1)
    expect(chunks[0].start_line).toBe(1)
    expect(chunks[0].path).toBe("src/file.ts")
    expect(chunks[1].start_line).toBeGreaterThan(1)
  })

  test("chunkWithBudget filters oversized chunks", () => {
    const content = "x".repeat(20_000)
    const chunks = Chunker.chunkWithBudget("src/big.ts", content, 100)
    expect(chunks).toEqual([])
  })
})
