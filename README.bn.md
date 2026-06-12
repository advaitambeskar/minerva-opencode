# Minerva Code

**মেমরি-প্রথম AI কোডিং এজেন্ট, subagents, goals এবং workflows সহ।**

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

Minerva Code হলো [OpenCode](https://github.com/anomalyco/opencode)-এর একটি fork এবং OpenCode প্রকল্পের সঙ্গে affiliated নয়।

---

## Minerva Code কী?

Minerva Code হলো project-aware coding agent। এটি OpenCode-এর দ্রুত terminal workflow রাখে, তারপর durable memory, explicit goals, resumable checkpoints, semantic code search, task graph, specialized subagents এবং multi-step workflows যোগ করে।

লক্ষ্য শুধু একটি prompt-এর উত্তর দেওয়া নয়। Minerva Code বাস্তব engineering project-এ দিক ধরে রাখার জন্য তৈরি: সিদ্ধান্ত মনে রাখা, দীর্ঘ session-এর পরে context পুনর্গঠন করা, কাজকে tasks-এ ভাগ করা, focused agents-কে delegate করা, এবং যথেষ্ট state সংরক্ষণ করা যাতে ভবিষ্যৎ sessions আগের থেমে যাওয়া জায়গা থেকে চালিয়ে যেতে পারে।

## ইনস্টলেশন

Minerva Code বর্তমানে source থেকে develop করা হয়। Rebrand চলাকালীন published package names এবং কিছু internal binaries-এ এখনো `opencode` থাকতে পারে।

```bash
git clone https://github.com/advaitambeskar/minerva-opencode.git
cd minerva-opencode
bun install
bun dev
```

উপকারী development commands:

```bash
bun dev          # run the CLI/TUI from packages/opencode
bun dev:web      # run the web app
bun dev:desktop  # run the desktop app
bun lint         # run oxlint
```

Tests package-scoped। Repository root থেকে নয়, সংশ্লিষ্ট package directory থেকে চালান।

## Modes

Minerva Code-এ তিনটি built-in modes আছে, যা `Tab` দিয়ে বদলানো যায়।

| Mode | উদ্দেশ্য |
| --- | --- |
| `build` | ফাইল edit, command run এবং change implement করার জন্য default full-access development mode। |
| `plan` | Codebase explore, change design এবং edit করার আগে tradeoffs review করার জন্য read-only analysis mode। |
| `compose` | Specialized subagents দিয়ে multi-step pipelines চালানোর workflow orchestration mode। |

## Subagents

Subagents হলো focused agent profiles, যেগুলো যেকোনো message-এ `@name` দিয়ে invoke করা যায়। এগুলো `.agent/subagents/`-এর YAML files দিয়ে define করা হয় এবং project অনুযায়ী extend করা যায়।

| Subagent | বিবরণ |
| --- | --- |
| `@general` | Narrower role-এ না পড়া complex searches এবং multi-step tasks handle করে। |
| `@researcher` | Read-only code এবং documentation exploration করে। |
| `@planner` | Work-কে requirements, tasks এবং implementation plans-এ ভাগ করে। |
| `@builder` | Main checkout clean রাখার জন্য isolated git worktree-তে features বা fixes implement করে। |
| `@reviewer` | Correctness, regressions এবং missing tests-এর জন্য patches review করে। |
| `@debugger` | Failures reproduce করে এবং likely causes narrow করে। |
| `@tester` | Targeted tests চালায় এবং verification evidence report করে। |
| `@memory-writer` | Durable project learnings extract করে memory-তে লেখে। |
| `@skill-writer` | Repeated workflows-কে reusable project skills-এ রূপান্তর করে। |

`@builder`-এর মতো write-capable subagents isolated worktrees-এ কাজ করার জন্য intended। Read-only subagents দ্রুত exploration-এর জন্য parallel run করা যায়।

## Memory

Minerva Code durable project knowledge `.agent/MEMORY.md`-এ রাখে। এই file architecture decisions, local conventions, important commands, integration notes এবং known pitfalls রাখার জন্য, যেগুলো এক chat session-এর বাইরে টিকে থাকা দরকার।

Memory শুধু document নয়। এটি local agent database-এ indexed হয়, full-text search করা যায়, এবং session চলাকালীন compact memory card হিসেবে system context-এ injected হয়।

মূল commands:

| Command | উদ্দেশ্য |
| --- | --- |
| `/memory` | Project memory items list বা search করা। |
| `/dream` | Useful session learnings long-term memory-তে promote করা। |
| `/distill` | Repeated patterns detect করে reusable skills বা workflows propose করা। |

Memory write করার আগে secrets redact করা হয় যাতে accidental credentials durable project knowledge-এ থেকে না যায়।

## Virtual Long Context

Minerva Code unlimited context দাবি করে না। এটি local sources থেকে project state-এর গুরুত্বপূর্ণ অংশ reconstruct করে virtual long context বজায় রাখে:

| Source | ভূমিকা |
| --- | --- |
| `.agent/MEMORY.md` | Durable facts এবং conventions। |
| `.agent/checkpoint.md` | Long বা interrupted work-এর জন্য resumable session state। |
| Semantic code index | FTS5 এবং embeddings দিয়ে source chunks retrieval। |
| Task graph | Multi-step work-এর durable task state। |
| System context registry | Provider-turn boundaries-এ injected budgeted context cards। |

Context usage বেশি হলে Minerva Code checkpoint লিখতে পারে এবং raw conversation-এর উপর নির্ভর না করে এসব source থেকে working context rebuild করতে পারে।

## Task Graph

Task graph কাজকে durable tasks হিসেবে record করে, যার statuses, parent-child relationships, dependencies এবং evidence থাকে। এটি local agent database-এ সংরক্ষিত, তাই planning এবং execution restarts-এর পরেও থাকে।

`/task` দিয়ে manage করুন:

```bash
/task create
/task split
/task start
/task done
/task tree
```

কোনো feature flat checklist-এর চেয়ে বেশি structure চাইলে, কিন্তু agent session-এর কাছেই থাকা দরকার হলে এটি useful।

## Workflows

Workflows হলো `.agent/workflows/`-এ stored YAML-defined pipelines। এগুলো Minerva Code-কে specialized agents দিয়ে structured sequence of steps চালাতে দেয়।

Built-in workflow commands:

```bash
/compose feature
/compose tdd
/compose debug
/compose review
```

Feature workflow spec analyze করতে পারে, task tree-তে break down করতে পারে, implementation plan বানাতে পারে, isolated builder run করতে পারে, tests চালাতে পারে, patch review করতে পারে এবং goal satisfied কিনা verify করতে পারে। Workflow runs এবং steps persisted হয়, তাই interrupted work inspect বা resume করা যায়।

## Commands

Minerva Code-এ commands দেখতে `/` লিখুন। Important commands:

| Command | উদ্দেশ্য |
| --- | --- |
| `/goal` | Active stopping condition set বা review করা। |
| `/task` | Durable task graph manage করা। |
| `/checkpoint` | Resumable session snapshot `.agent/checkpoint.md`-এ save করা। |
| `/compose` | `feature`, `tdd`, `debug`, `review` workflow চালানো। |
| `/voice` | `on`, `off`, `push-to-talk` voice input modes toggle করা। |
| `/memory` | Project memory list, search বা forget করা। |
| `/dream` | Session learnings durable memory-তে promote করা। |
| `/distill` | Repeated behavior থেকে reusable skills বা workflows extract করা। |

## `.agent/` Project Brain

`.agent/` হলো canonical per-project configuration এবং state directory। `.opencode/` এখনো deprecated fallback হিসেবে recognized হতে পারে, কিন্তু নতুন Minerva Code projects-এ `.agent/` ব্যবহার করা উচিত।

গুরুত্বপূর্ণ paths:

| Path | উদ্দেশ্য |
| --- | --- |
| `.agent/MEMORY.md` | Durable project memory। |
| `.agent/notes.md` | Temporary scratchpad notes। |
| `.agent/goal.md` | Active stopping condition। |
| `.agent/checkpoint.md` | Latest resumable session checkpoint। |
| `.agent/subagents/` | Project-defined subagent profiles। |
| `.agent/workflows/` | `/compose`-এর workflow definitions। |
| `.agent/skills/` | Reusable project skills। |
| `.agent/state/` | Local state এবং indexes; gitignored থাকা উচিত। |

## Contributing

আপনি contribute করতে চাইলে pull request খোলার আগে [CONTRIBUTING.md](./CONTRIBUTING.md) পড়ুন। Minerva Code একটি fork হওয়ায়, change Minerva layer, upstream-compatible OpenCode runtime, নাকি দুটির compatibility boundary-র অংশ তা পরিষ্কার রাখুন।
