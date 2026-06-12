import { describe, expect, test } from "bun:test"
import { SecretRedact } from "../../src/memory/secret-redact"

describe("SecretRedact", () => {
  test("redacts sk- API keys", () => {
    const input = "key=sk-abcdefghijklmnopqrstuvwxyz123456"
    const { text, found } = SecretRedact.redact(input)
    expect(text).toContain("[REDACTED]")
    expect(text).not.toContain("sk-abcdefghijklmnopqrstuvwxyz123456")
    expect(found).toContain("sk")
  })

  test("redacts AWS access key IDs", () => {
    const input = "AKIAIOSFODNN7EXAMPLE"
    const { text } = SecretRedact.redact(input)
    expect(text).toContain("[REDACTED]")
  })

  test("redacts GitHub tokens", () => {
    const input = "token ghp_abcdefghijklmnopqrstuvwxyz1234567890"
    const { text, found } = SecretRedact.redact(input)
    expect(text).toContain("[REDACTED]")
    expect(found).toContain("github_token")
  })

  test("redacts password key-value pairs", () => {
    const input = 'password = "supersecretpasswordvalue123"'
    const { text, found } = SecretRedact.redact(input)
    expect(text).toContain("[REDACTED]")
    expect(found).toContain("kv_secret")
  })

  test("hasSecrets detects secrets and ignores benign text", () => {
    expect(SecretRedact.hasSecrets("hello world")).toBe(false)
    expect(SecretRedact.hasSecrets("sk-abcdefghijklmnopqrstuvwxyz123456")).toBe(true)
  })

  test("leaves benign text unchanged", () => {
    const input = "Run bun test from packages/opencode"
    expect(SecretRedact.redact(input).text).toBe(input)
  })
})
