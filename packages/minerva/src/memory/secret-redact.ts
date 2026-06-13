export * as SecretRedact from "./secret-redact"

/**
 * Strips obvious secrets from text before writing to memory/checkpoint/notes.
 *
 * Patterns covered:
 *  - API keys (sk-, AKIA, Bearer tokens, etc.)
 *  - Passwords in common key=value / JSON formats
 *  - Private keys (PEM blocks)
 *  - JWT tokens (header.payload.signature)
 *  - GitHub tokens (ghp_, ghs_, github_pat_)
 *  - Generic hex/base64 values assigned to secret-looking keys
 */

const REDACTED = "[REDACTED]"

const patterns: Array<{ label: string; re: RegExp }> = [
  // PEM blocks
  { label: "pem", re: /-----BEGIN [A-Z ]+-----[\s\S]*?-----END [A-Z ]+-----/gi },
  // JWT tokens (3 base64url segments)
  { label: "jwt", re: /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g },
  // OpenAI / Anthropic / generic sk- keys
  { label: "sk", re: /sk-[A-Za-z0-9_-]{20,}/g },
  // AWS access key IDs
  { label: "aws_id", re: /AKIA[A-Z0-9]{16}/g },
  // AWS secret / generic long hex/base64 assigned to password/secret/key/token
  {
    label: "kv_secret",
    re: /(?:password|passwd|secret|token|api[_-]?key|access[_-]?key|private[_-]?key|auth[_-]?token)\s*[:=]\s*['"]?([A-Za-z0-9+/=_-]{20,})['"]?/gi,
  },
  // GitHub tokens
  { label: "github_token", re: /(?:ghp|ghs|gho|ghu|ghr|github_pat)_[A-Za-z0-9_]{20,}/g },
  // Slack tokens
  { label: "slack_token", re: /xox[baprs]-[A-Za-z0-9-]{10,}/g },
  // Bearer tokens in Authorization: headers
  { label: "bearer", re: /(?:Authorization:\s*Bearer\s+)([A-Za-z0-9._~+/-]+=*)/gi },
  // Base64-encoded secrets after common prefixes
  { label: "base64", re: /(?:secret|token|key)\s*=\s*([A-Za-z0-9+/]{40,}={0,2})/gi },
]

export function redact(text: string): { text: string; found: string[] } {
  const found: string[] = []
  let out = text

  for (const { label, re } of patterns) {
    re.lastIndex = 0
    out = out.replace(re, (match) => {
      found.push(label)
      return match.replace(/['"]?[A-Za-z0-9+/=_.-]{10,}['"]?/g, REDACTED)
    })
    re.lastIndex = 0
  }

  return { text: out, found: [...new Set(found)] }
}

/** Returns true when the text appears to contain secrets */
export function hasSecrets(text: string): boolean {
  return patterns.some((p) => {
    p.re.lastIndex = 0
    const has = p.re.test(text)
    p.re.lastIndex = 0
    return has
  })
}
