# Minerva Code

**A memory-first AI coding agent with subagents, goals, and workflows.**

<p>
  <a href="README.md">English</a> |
  <a href="README.zh.md">简体中文</a> |
  <a href="README.zht.md">繁體中文</a> |
  <a href="README.ko.md">한국어</a> |
  <a href="README.de.md">Deutsch</a> |
  <a href="README.es.md">Español</a> |
  <a href="README.fr.md">Français</a> |
  <a href="README.it.md">Italiano</a> |
  <a href="README.da.md">Dansk</a> |
  <a href="README.ja.md">日本語</a> |
  <a href="README.pl.md">Polski</a> |
  <a href="README.ru.md">Русский</a> |
  <a href="README.bs.md">Bosanski</a> |
  <a href="README.ar.md">العربية</a> |
  <a href="README.no.md">Norsk</a> |
  <a href="README.br.md">Português (Brasil)</a> |
  <a href="README.th.md">ไทย</a> |
  <a href="README.tr.md">Türkçe</a> |
  <a href="README.uk.md">Українська</a> |
  <a href="README.bn.md">বাংলা</a> |
  <a href="README.gr.md">Ελληνικά</a> |
  <a href="README.vi.md">Tiếng Việt</a>
</p>

Minerva Code is forked from [OpenCode](https://github.com/anomalyco/opencode) and is not affiliated with the OpenCode project.

---

## What Is Minerva Code?

Minerva Code is a project-aware coding agent. It keeps the fast terminal workflow of OpenCode, then adds durable memory, explicit goals, resumable checkpoints, semantic code search, task graphs, specialized subagents, and multi-step workflows.

The goal is not just to answer one prompt. Minerva Code is designed to stay oriented across a real engineering project: remember decisions, reconstruct context after long sessions, split work into tasks, delegate to focused agents, and preserve enough state that future sessions can pick up where the last one stopped.

See [How Minerva Code Compares](./COMPARISON.md) for a feature matrix against OpenCode, Cursor, Claude Code, and OpenAI Codex.

## Installation

Minerva Code is currently developed from source. Published package names and some internal binaries may still contain `opencode` while the rebrand is in progress.

```bash
git clone https://github.com/advaitambeskar/minerva-opencode.git
cd minerva-opencode
bun install
bun dev
```

Useful development commands:

```bash
bun dev          # run the CLI/TUI from packages/opencode
bun dev:web      # run the web app
bun dev:desktop  # run the desktop app
bun lint         # run oxlint
```

Tests are package-scoped. Run them from the relevant package directory, not from the repository root.

## Modes

Minerva Code includes three built-in modes that can be switched with `Tab`.

| Mode | Purpose |
| --- | --- |
| `build` | Default full-access development mode for editing files, running commands, and implementing changes. |
| `plan` | Read-only analysis mode for exploring a codebase, designing a change, and reviewing tradeoffs before editing. |
| `compose` | Workflow orchestration mode for running multi-step pipelines through specialized subagents. |

## Subagents

Subagents are focused agent profiles that can be invoked with `@name` in any message. They are defined by YAML files under `.agent/subagents/` and can be extended per project.

| Subagent | Description |
| --- | --- |
| `@general` | Handles complex searches and multi-step tasks that do not fit a narrower role. |
| `@researcher` | Performs read-only code and documentation exploration. |
| `@planner` | Breaks work into requirements, tasks, and implementation plans. |
| `@builder` | Implements features or fixes in an isolated git worktree so the main checkout stays clean. |
| `@reviewer` | Reviews patches for correctness, regressions, and missing tests. |
| `@debugger` | Reproduces failures and narrows them to likely causes. |
| `@tester` | Runs targeted tests and reports verification evidence. |
| `@memory-writer` | Extracts durable project learnings and writes them into memory. |
| `@skill-writer` | Turns repeated workflows into reusable project skills. |

Write-capable subagents such as `@builder` are intended to work in isolated worktrees. Read-only subagents can run in parallel for faster exploration.

## Memory

Minerva Code keeps durable project knowledge in `.agent/MEMORY.md`. This file is meant for architecture decisions, local conventions, important commands, integration notes, and known pitfalls that should survive beyond a single chat.

Memory is not just a document. It is indexed into the local agent database, searchable with full-text search, and injected back into the system context as a compact memory card when sessions run.

Key commands:

| Command | Purpose |
| --- | --- |
| `/memory` | List or search project memory items. |
| `/dream` | Promote useful session learnings into long-term memory. |
| `/distill` | Detect repeated patterns and propose reusable skills or workflows. |

Secrets are redacted before memory writes so accidental credentials are not preserved in durable project knowledge.

## Virtual Long Context

Minerva Code does not claim unlimited context. It maintains virtual long context by reconstructing the important parts of project state from local sources:

| Source | Role |
| --- | --- |
| `.agent/MEMORY.md` | Durable facts and conventions. |
| `.agent/checkpoint.md` | Resumable session state for long or interrupted work. |
| Semantic code index | FTS5 and embedding-backed retrieval over source chunks. |
| Task graph | Durable task state for multi-step work. |
| System context registry | Budgeted context cards injected at provider-turn boundaries. |

When context usage grows high, Minerva Code can write a checkpoint and rebuild the working context from these sources instead of relying on the raw conversation alone.

## Task Graph

The task graph records work as durable tasks with statuses, parent-child relationships, dependencies, and evidence. It is stored in the local agent database so planning and execution can survive restarts.

Use `/task` to manage it:

```bash
/task create
/task split
/task start
/task done
/task tree
```

This is useful when a feature needs more structure than a flat checklist but should remain close to the agent session.

## Workflows

Workflows are YAML-defined pipelines stored in `.agent/workflows/`. They let Minerva Code run a structured sequence of steps through specialized agents.

Built-in workflow commands include:

```bash
/compose feature
/compose tdd
/compose debug
/compose review
```

A feature workflow can analyze a spec, break it into a task tree, create an implementation plan, run an isolated builder, execute tests, review the patch, and verify whether the goal is satisfied. Workflow runs and steps are persisted so interrupted work can be inspected or resumed.

## Commands

Type `/` inside Minerva Code to discover commands. Important commands include:

| Command | Purpose |
| --- | --- |
| `/goal` | Set or review the active stopping condition. |
| `/task` | Manage the durable task graph. |
| `/checkpoint` | Save a resumable session snapshot to `.agent/checkpoint.md`. |
| `/compose` | Run workflows such as `feature`, `tdd`, `debug`, and `review`. |
| `/voice` | Toggle voice input modes such as `on`, `off`, and `push-to-talk`. |
| `/memory` | List, search, or forget project memory. |
| `/dream` | Promote session learnings into durable memory. |
| `/distill` | Extract reusable skills or workflows from repeated behavior. |

## The `.agent/` Project Brain

`.agent/` is the canonical per-project configuration and state directory. `.opencode/` may still be recognized as a deprecated fallback, but new Minerva Code projects should use `.agent/`.

Important paths:

| Path | Purpose |
| --- | --- |
| `.agent/MEMORY.md` | Durable project memory. |
| `.agent/notes.md` | Temporary scratchpad notes. |
| `.agent/goal.md` | Active stopping condition. |
| `.agent/checkpoint.md` | Latest resumable session checkpoint. |
| `.agent/subagents/` | Project-defined subagent profiles. |
| `.agent/workflows/` | Workflow definitions for `/compose`. |
| `.agent/skills/` | Reusable project skills. |
| `.agent/state/` | Local state and indexes; this should stay gitignored. |

## Contributing

If you want to contribute, read [CONTRIBUTING.md](./CONTRIBUTING.md) before opening a pull request. Because Minerva Code is a fork, keep changes clear about whether they belong to the Minerva layer, the upstream-compatible OpenCode runtime, or the compatibility boundary between them.
