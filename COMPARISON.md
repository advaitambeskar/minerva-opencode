# How Minerva Code Compares

Minerva Code is an [OpenCode](https://github.com/anomalyco/opencode) fork. It keeps OpenCode's terminal workflow, multi-surface apps, model flexibility, LSP, MCP, and provider integrations, then adds a **memory-first project brain** for long-running engineering work.

This page compares Minerva Code to [OpenCode](https://opencode.ai/), [Cursor](https://cursor.com/home), [Claude Code](https://claude.com/product/claude-code), and [OpenAI Codex](https://openai.com/codex/).

Legend: **Yes** / **Partial** / **No** / **Inherited** (from OpenCode)

---

## Positioning

| Product | What it is | Primary bet |
| --- | --- | --- |
| **Minerva Code** | Open-source fork of OpenCode | Durable project memory, goals, checkpoints, task graphs, workflows |
| **OpenCode** | Open-source coding agent | Fast, private, any-model agent across terminal/desktop/IDE |
| **Cursor** | Proprietary AI IDE + agents | Best-in-class IDE UX, Tab model, cloud agents, codebase indexing |
| **Claude Code** | Anthropic's coding agent | Deep Claude integration across terminal, IDE, desktop, and Slack |
| **OpenAI Codex** | OpenAI's coding agent | ChatGPT-powered agents, cloud environments, automations, PR workflows |

---

## Core product

| Feature | Minerva Code | OpenCode | Cursor | Claude Code | OpenAI Codex |
| --- | --- | --- | --- | --- | --- |
| **Open source** | Yes (fork) | Yes (MIT) | No | No | No |
| **Self-hostable / local-first** | Yes | Yes | Partial | Yes (local runtime) | Partial |
| **Official installer / stable release** | No (source dev) | Yes | Yes | Yes | Yes |
| **Terminal / TUI agent** | Yes | Yes | Yes (CLI) | Yes | Yes |
| **Desktop app** | Inherited | Yes (beta) | Yes | Yes | Yes |
| **Web app** | Inherited | Yes | Yes (cloud agents) | Yes | Yes |
| **IDE extension** | Inherited | VS Code | VS Code fork + JetBrains | VS Code + JetBrains | Editor integration |
| **Inline Tab autocomplete** | No | No | Yes (core product) | No | No |
| **Bring your own model** | Yes (75+ providers) | Yes | Yes (many providers) | Mostly Claude; API/Bedrock/Vertex | OpenAI / ChatGPT |
| **Free bundled models** | Inherited (Zen etc.) | Yes | Limited trial tiers | Via Claude plans | Via ChatGPT plans |
| **LSP integration** | Inherited | Yes | Yes | Yes | Partial |
| **MCP tool support** | Inherited | Yes | Yes | Yes | Yes |
| **Multi-session / parallel agents** | Inherited | Yes | Yes (incl. cloud) | Yes | Yes (worktrees/cloud) |
| **Session share links** | Inherited | Yes | Partial | No | Partial |
| **GitHub Copilot login** | Inherited | Yes | N/A | N/A | N/A |
| **ChatGPT / OpenAI login** | Inherited | Yes | N/A | N/A | Yes (native) |

---

## Memory, context, and project awareness

| Feature | Minerva Code | OpenCode | Cursor | Claude Code | OpenAI Codex |
| --- | --- | --- | --- | --- | --- |
| **Durable project memory file** | **Yes** (`.agent/MEMORY.md`) | No | No (rules/indexing instead) | Via `CLAUDE.md` / memory | Via Skills/docs |
| **Indexed, searchable memory DB** | **Yes** (FTS) | No | Semantic index | No | No |
| **Promote session → memory (`/dream`)** | **Yes** | No | No | No | No |
| **Extract reusable skills (`/distill`)** | **Yes** | Skills only | Rules | Skills | Skills |
| **Explicit stopping goals (`/goal`)** | **Yes** | No | Implicit in tasks | Implicit | Implicit |
| **Resumable checkpoints** | **Yes** (`.agent/checkpoint.md`) | No | Session history | Session resume | Cloud/task resume |
| **Virtual long-context reconstruction** | **Yes** (memory + checkpoint + index + tasks) | Compaction only | Codebase index + compaction | Context management | Cloud context |
| **Semantic code search (local index)** | **Yes** (FTS5 + embeddings) | Basic search | Yes (hosted index) | Agentic search | Agentic search |
| **Secret redaction before memory writes** | **Yes** | No | N/A | N/A | N/A |

---

## Planning, orchestration, and agents

| Feature | Minerva Code | OpenCode | Cursor | Claude Code | OpenAI Codex |
| --- | --- | --- | --- | --- | --- |
| **Default modes** | `build`, `plan`, **`compose`** | `build`, `plan` | Agent / Plan / Tab / Edit | Terminal modes + permissions | App + CLI + cloud |
| **Built-in subagents** | **9 specialized** (`@builder`, `@reviewer`, etc.) | `general` + mode agents | Subagents via SDK | Subagents | Multi-agent in app |
| **YAML workflow pipelines** | **Yes** (`/compose feature\|tdd\|debug\|review`) | No | Plans / cloud tasks | Routines | Automations |
| **Durable task graph** | **Yes** (`/task`, DB-backed) | No | Task lists in UI | Issue → PR flow | Issue/PR automation |
| **Isolated git worktree builder** | **Yes** (`@builder`) | Experimental | Cloud sandboxes | Local | Cloud worktrees |
| **Goal-aware stop (`/stop`)** | **Yes** | No | Manual review | Permission gates | Human review |
| **Voice input** | **Yes** (`/voice`) | No | No | No | No |

---

## Distribution, privacy, and ecosystem

| Feature | Minerva Code | OpenCode | Cursor | Claude Code | OpenAI Codex |
| --- | --- | --- | --- | --- | --- |
| **Code/context sent to vendor by default** | Only chosen model provider | Same | Yes (indexing/cloud) | Model API only | Yes (ChatGPT/cloud) |
| **Privacy / no vendor code storage claim** | Inherited from OpenCode | Yes | Enterprise controls | Local-first claim | Cloud-heavy |
| **Slack integration** | Inherited (package exists) | Yes | Yes | Yes | Partial |
| **PR review bot** | Inherited patterns | Community | Bugbot | Via GitHub | Built-in review |
| **Enterprise / SOC2** | No | No | Yes | Yes | Yes |
| **Proprietary coding model** | No | No (Zen is curated routing) | Composer | Claude family | Codex models |

---

## What Minerva adds on top of OpenCode

1. **Project brain in `.agent/`** — memory, goals, checkpoints, subagents, workflows, skills, and local state/indexes.
2. **Memory-first workflow** — `/memory`, `/dream`, `/distill`, with indexing and secret redaction.
3. **Long-horizon orientation** — `/goal`, `/checkpoint`, `/stop`, and virtual long context rebuilt from local sources instead of raw chat alone.
4. **Structured execution** — durable task graph (`/task`) and YAML workflows (`/compose`).
5. **Specialized subagent roster** — planner, builder (worktree-isolated), reviewer, debugger, tester, memory-writer, skill-writer, and more.
6. **Third mode: `compose`** — orchestration mode for multi-step pipelines.

---

## Product-by-product notes

### vs OpenCode

- **Same foundation**: terminal speed, desktop/web/IDE surfaces, model choice, LSP, MCP, and privacy posture.
- **Minerva's bet**: turn a prompt-response agent into a **project companion** with explicit memory, goals, checkpoints, and orchestration.
- **Tradeoff**: Minerva is a fork in active rebrand; install is source-only today, while OpenCode has polished installers and a large community.

### vs Cursor

- **Cursor wins on product polish**: proprietary Tab completions, IDE-native UX, cloud agents with VMs, semantic codebase indexing at scale, and enterprise controls.
- **Minerva wins on openness and control**: fully inspectable, self-hosted, model-agnostic, and no vendor IDE lock-in.
- **Conceptual overlap**: both want agents that understand the repo, but Cursor indexes centrally while Minerva reconstructs context from **local durable artifacts** (memory, checkpoints, task graph, code index).

### vs Claude Code

- **Claude Code wins on distribution and model depth**: native Anthropic integration, desktop/mobile handoff, Slack, routines, and a mature permission model.
- **Minerva wins on model neutrality and explicit project state**: not tied to Claude; goals, checkpoints, task graphs, and workflows are first-class commands, not just chat history plus `CLAUDE.md`.
- **Similarity**: both are terminal-first agents with IDE extensions and local execution.

### vs OpenAI Codex

- **Codex wins on cloud-native agent ops**: built-in cloud environments, worktrees at scale, automations, and ChatGPT-native billing and team workflows.
- **Minerva wins on local sovereignty and multi-provider flexibility**: no ChatGPT lock-in; memory and orchestration live in your repo under `.agent/`.
- **Similarity**: both support multi-step agent workflows and PR-oriented development, but Codex is more "hosted command center" while Minerva is more "local project brain."

---

## When to use which

| If you want… | Best fit |
| --- | --- |
| Open source, any model, fast terminal agent | **OpenCode** |
| Open source + long-running project memory and orchestration | **Minerva Code** |
| Best IDE experience + Tab + cloud agents | **Cursor** |
| Deep Claude integration across terminal, IDE, and Slack | **Claude Code** |
| ChatGPT-native agents, cloud sandboxes, and automations | **OpenAI Codex** |

---

## Practical caveats for Minerva today

- **Fork status**: some `opencode` package and binary names remain while the rebrand is in progress.
- **Install**: source-only (`git clone`, `bun install`, `bun dev`), not a one-line curl installer like OpenCode.
- **Upstream drift**: inherits OpenCode features (desktop, web, Zen, share links) but may lag upstream releases.
- **Not affiliated**: explicitly a fork, not the official OpenCode project.
