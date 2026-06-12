# Minerva Code

**一个以记忆为核心、带有子代理、目标和工作流的 AI 编码代理。**

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

Minerva Code 派生自 [OpenCode](https://github.com/anomalyco/opencode)，并且不隶属于 OpenCode 项目。

---

## Minerva Code 是什么？

Minerva Code 是一个理解项目上下文的编码代理。它保留了 OpenCode 快速的终端工作流，并在此基础上加入持久记忆、显式目标、可恢复 checkpoint、语义代码搜索、任务图、专用子代理以及多步骤工作流。

它的目标不只是回答一次提示。Minerva Code 旨在长期围绕真实工程项目保持方向感：记住决策、在长会话后重建上下文、把工作拆成任务、委派给专用代理，并保存足够状态，让未来会话可以从上次停止的地方继续。

## 安装

Minerva Code 目前从源码开发。发布包名称和部分内部二进制在重命名完成前仍可能包含 `opencode`。

```bash
git clone https://github.com/advaitambeskar/minerva-opencode.git
cd minerva-opencode
bun install
bun dev
```

常用开发命令：

```bash
bun dev          # run the CLI/TUI from packages/opencode
bun dev:web      # run the web app
bun dev:desktop  # run the desktop app
bun lint         # run oxlint
```

测试按 package 运行。请从相关 package 目录执行测试，不要在仓库根目录运行。

## 模式

Minerva Code 内置三种模式，可用 `Tab` 切换。

| 模式 | 用途 |
| --- | --- |
| `build` | 默认的完整访问开发模式，用于编辑文件、运行命令和实现变更。 |
| `plan` | 只读分析模式，用于探索代码库、设计变更并在编辑前评估取舍。 |
| `compose` | 工作流编排模式，用专用子代理运行多步骤流水线。 |

## 子代理

子代理是聚焦于特定职责的 agent profile，可在任意消息中用 `@name` 调用。它们由 `.agent/subagents/` 下的 YAML 文件定义，并可按项目扩展。

| 子代理 | 描述 |
| --- | --- |
| `@general` | 处理不适合更窄角色的复杂搜索和多步骤任务。 |
| `@researcher` | 执行只读代码和文档探索。 |
| `@planner` | 将工作拆分为需求、任务和实现计划。 |
| `@builder` | 在隔离的 git worktree 中实现功能或修复，保持主 checkout 干净。 |
| `@reviewer` | 审查补丁的正确性、回归风险和缺失测试。 |
| `@debugger` | 复现失败并缩小可能原因。 |
| `@tester` | 运行有针对性的测试并报告验证证据。 |
| `@memory-writer` | 提取持久项目经验并写入记忆。 |
| `@skill-writer` | 将重复工作流转化为可复用的项目技能。 |

具备写入能力的子代理（例如 `@builder`）设计为在隔离 worktree 中工作。只读子代理可以并行运行，以加快探索。

## 记忆

Minerva Code 将持久项目知识保存在 `.agent/MEMORY.md`。该文件适合记录架构决策、本地约定、重要命令、集成说明和需要跨会话保留的已知陷阱。

记忆不只是一个文档。它会被索引到本地 agent 数据库，可进行全文搜索，并在会话运行时以紧凑的 memory card 重新注入系统上下文。

关键命令：

| 命令 | 用途 |
| --- | --- |
| `/memory` | 列出或搜索项目记忆条目。 |
| `/dream` | 将有用的会话学习提升为长期记忆。 |
| `/distill` | 检测重复模式，并提出可复用的技能或工作流。 |

写入记忆前会进行 secret redaction，避免意外凭据进入持久项目知识。

## 虚拟长上下文

Minerva Code 不声称拥有无限上下文。它通过从本地来源重建项目状态的重要部分来维护虚拟长上下文：

| 来源 | 作用 |
| --- | --- |
| `.agent/MEMORY.md` | 持久事实和约定。 |
| `.agent/checkpoint.md` | 长任务或中断工作可恢复的会话状态。 |
| Semantic code index | 基于 FTS5 和 embedding 的源码 chunk 检索。 |
| Task graph | 多步骤工作的持久任务状态。 |
| System context registry | 在 provider-turn 边界注入的预算受限上下文卡片。 |

当上下文使用量变高时，Minerva Code 可以写入 checkpoint，并从这些来源重建工作上下文，而不是只依赖原始对话。

## 任务图

任务图将工作记录为带状态、父子关系、依赖和证据的持久任务。它存储在本地 agent 数据库中，使计划和执行可以跨重启保留。

使用 `/task` 管理：

```bash
/task create
/task split
/task start
/task done
/task tree
```

当一个功能需要比普通清单更强的结构，同时又应贴近 agent 会话时，这很有用。

## 工作流

工作流是存放在 `.agent/workflows/` 中的 YAML 流水线定义。它们让 Minerva Code 通过专用代理运行结构化步骤序列。

内置工作流命令包括：

```bash
/compose feature
/compose tdd
/compose debug
/compose review
```

一个 feature 工作流可以分析 spec、拆成任务树、创建实现计划、运行隔离 builder、执行测试、审查补丁，并验证目标是否满足。工作流运行和步骤会被持久化，因此中断的工作可以被检查或恢复。

## 命令

在 Minerva Code 中输入 `/` 可发现命令。重要命令包括：

| 命令 | 用途 |
| --- | --- |
| `/goal` | 设置或查看当前停止条件。 |
| `/task` | 管理持久任务图。 |
| `/checkpoint` | 将可恢复会话快照保存到 `.agent/checkpoint.md`。 |
| `/compose` | 运行 `feature`、`tdd`、`debug`、`review` 等工作流。 |
| `/voice` | 切换 `on`、`off`、`push-to-talk` 等语音输入模式。 |
| `/memory` | 列出、搜索或遗忘项目记忆。 |
| `/dream` | 将会话学习提升为持久记忆。 |
| `/distill` | 从重复行为中提取可复用技能或工作流。 |

## `.agent/` 项目大脑

`.agent/` 是每个项目的规范配置和状态目录。`.opencode/` 仍可能作为废弃 fallback 被识别，但新的 Minerva Code 项目应使用 `.agent/`。

重要路径：

| 路径 | 用途 |
| --- | --- |
| `.agent/MEMORY.md` | 持久项目记忆。 |
| `.agent/notes.md` | 临时 scratchpad 笔记。 |
| `.agent/goal.md` | 当前停止条件。 |
| `.agent/checkpoint.md` | 最新可恢复会话 checkpoint。 |
| `.agent/subagents/` | 项目定义的子代理 profile。 |
| `.agent/workflows/` | `/compose` 的工作流定义。 |
| `.agent/skills/` | 可复用项目技能。 |
| `.agent/state/` | 本地状态和索引；应保持 gitignored。 |

## 贡献

如果你想贡献，请在提交 pull request 前阅读 [CONTRIBUTING.md](./CONTRIBUTING.md)。由于 Minerva Code 是一个 fork，请明确变更属于 Minerva 层、上游兼容的 OpenCode runtime，还是两者之间的兼容边界。
