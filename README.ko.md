# Minerva Code

**메모리를 중심에 둔 AI 코딩 에이전트. subagent, goal, workflow를 함께 제공합니다.**

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

Minerva Code는 [OpenCode](https://github.com/advaitambeskar/minerva-opencode)에서 fork되었으며 OpenCode 프로젝트와 제휴되어 있지 않습니다.

---

## Minerva Code란?

Minerva Code는 프로젝트를 이해하는 코딩 에이전트입니다. OpenCode의 빠른 터미널 workflow를 유지하면서 durable memory, 명시적인 goal, 재개 가능한 checkpoint, semantic code search, task graph, 전문 subagent, multi-step workflow를 추가합니다.

목표는 단순히 한 번의 prompt에 답하는 것이 아닙니다. Minerva Code는 실제 엔지니어링 프로젝트 안에서 방향을 잃지 않도록 설계되었습니다. 결정을 기억하고, 긴 세션 이후 context를 재구성하고, 일을 task로 나누고, 집중된 agent에게 위임하며, 다음 세션이 이전 중단 지점에서 이어갈 수 있도록 충분한 상태를 보존합니다.

## 설치

Minerva Code는 현재 source에서 개발합니다. rebrand가 진행 중이므로 published package 이름과 일부 내부 binary에는 아직 `opencode`가 포함될 수 있습니다.

```bash
git clone https://github.com/advaitambeskar/minerva-opencode.git
cd minerva-opencode
bun install
bun dev
```

유용한 개발 명령:

```bash
bun dev          # run the CLI/TUI from packages/minerva
bun dev:web      # run the web app
bun dev:desktop  # run the desktop app
bun lint         # run oxlint
```

테스트는 package 단위입니다. repository root가 아니라 관련 package 디렉터리에서 실행하세요.

## 모드

Minerva Code에는 `Tab`으로 전환할 수 있는 세 가지 built-in mode가 있습니다.

| 모드 | 목적 |
| --- | --- |
| `build` | 파일 편집, 명령 실행, 변경 구현을 위한 기본 full-access 개발 모드입니다. |
| `plan` | 코드베이스 탐색, 변경 설계, 편집 전 tradeoff 검토를 위한 read-only 분석 모드입니다. |
| `compose` | 전문 subagent를 통해 multi-step pipeline을 실행하는 workflow orchestration 모드입니다. |

## Subagents

Subagent는 특정 역할에 집중한 agent profile이며, 어떤 메시지에서든 `@name`으로 호출할 수 있습니다. `.agent/subagents/` 아래 YAML 파일로 정의되고 프로젝트별로 확장할 수 있습니다.

| Subagent | 설명 |
| --- | --- |
| `@general` | 더 좁은 역할에 맞지 않는 복잡한 검색과 multi-step task를 처리합니다. |
| `@researcher` | read-only 코드 및 문서 탐색을 수행합니다. |
| `@planner` | 작업을 요구사항, task, 구현 계획으로 분해합니다. |
| `@builder` | main checkout을 깨끗하게 유지하기 위해 격리된 git worktree에서 기능이나 수정 사항을 구현합니다. |
| `@reviewer` | patch의 정확성, regression, 빠진 테스트를 리뷰합니다. |
| `@debugger` | 실패를 재현하고 가능한 원인을 좁힙니다. |
| `@tester` | targeted test를 실행하고 검증 evidence를 보고합니다. |
| `@memory-writer` | durable project learning을 추출해 memory에 기록합니다. |
| `@skill-writer` | 반복 workflow를 재사용 가능한 project skill로 전환합니다. |

`@builder` 같은 write-capable subagent는 격리 worktree에서 작업하도록 설계되었습니다. read-only subagent는 더 빠른 탐색을 위해 병렬로 실행할 수 있습니다.

## Memory

Minerva Code는 durable project knowledge를 `.agent/MEMORY.md`에 보관합니다. 이 파일은 architecture decision, local convention, 중요한 command, integration note, 세션을 넘어 보존해야 할 known pitfall을 기록하기 위한 곳입니다.

Memory는 단순한 문서가 아닙니다. local agent database에 index되고 full-text search가 가능하며, 세션 실행 시 compact memory card로 system context에 다시 주입됩니다.

주요 명령:

| 명령 | 목적 |
| --- | --- |
| `/memory` | project memory item을 나열하거나 검색합니다. |
| `/dream` | 유용한 session learning을 long-term memory로 승격합니다. |
| `/distill` | 반복 pattern을 감지하고 재사용 가능한 skill 또는 workflow를 제안합니다. |

실수로 credential이 durable project knowledge에 남지 않도록 memory write 전에 secret redaction을 수행합니다.

## Virtual Long Context

Minerva Code는 unlimited context를 주장하지 않습니다. 대신 local source에서 project state의 중요한 부분을 재구성해 virtual long context를 유지합니다.

| Source | 역할 |
| --- | --- |
| `.agent/MEMORY.md` | durable fact와 convention. |
| `.agent/checkpoint.md` | 긴 작업이나 중단된 작업을 위한 재개 가능한 session state. |
| Semantic code index | FTS5와 embedding 기반 source chunk retrieval. |
| Task graph | multi-step work를 위한 durable task state. |
| System context registry | provider-turn boundary에서 주입되는 budgeted context cards. |

Context 사용량이 커지면 Minerva Code는 checkpoint를 작성하고, raw conversation에만 의존하지 않고 이러한 source에서 working context를 재구성할 수 있습니다.

## Task Graph

Task graph는 status, parent-child relationship, dependency, evidence를 가진 durable task로 작업을 기록합니다. local agent database에 저장되므로 planning과 execution은 restart 이후에도 유지됩니다.

`/task`로 관리합니다:

```bash
/task create
/task split
/task start
/task done
/task tree
```

일반 checklist보다 더 많은 구조가 필요하지만 agent session 가까이에 남아 있어야 하는 feature 작업에 유용합니다.

## Workflows

Workflow는 `.agent/workflows/`에 저장되는 YAML-defined pipeline입니다. Minerva Code는 이를 통해 전문 agent로 구조화된 step sequence를 실행합니다.

Built-in workflow 명령:

```bash
/compose feature
/compose tdd
/compose debug
/compose review
```

Feature workflow는 spec 분석, task tree 분해, implementation plan 작성, isolated builder 실행, test 실행, patch review, goal 만족 여부 검증까지 수행할 수 있습니다. Workflow run과 step은 persisted되므로 중단된 작업을 검사하거나 재개할 수 있습니다.

## Commands

Minerva Code 안에서 `/`를 입력하면 command를 확인할 수 있습니다. 중요한 command:

| 명령 | 목적 |
| --- | --- |
| `/goal` | active stopping condition을 설정하거나 확인합니다. |
| `/task` | durable task graph를 관리합니다. |
| `/checkpoint` | 재개 가능한 session snapshot을 `.agent/checkpoint.md`에 저장합니다. |
| `/compose` | `feature`, `tdd`, `debug`, `review` 같은 workflow를 실행합니다. |
| `/voice` | `on`, `off`, `push-to-talk` 같은 voice input mode를 전환합니다. |
| `/memory` | project memory를 나열, 검색, 삭제합니다. |
| `/dream` | session learning을 durable memory로 승격합니다. |
| `/distill` | 반복 행동에서 재사용 가능한 skill 또는 workflow를 추출합니다. |

## `.agent/` Project Brain

`.agent/`는 project별 canonical configuration 및 state directory입니다. `.opencode/`는 deprecated fallback으로 여전히 인식될 수 있지만, 새로운 Minerva Code 프로젝트는 `.agent/`를 사용해야 합니다.

중요 경로:

| 경로 | 목적 |
| --- | --- |
| `.agent/MEMORY.md` | durable project memory. |
| `.agent/notes.md` | 임시 scratchpad notes. |
| `.agent/goal.md` | active stopping condition. |
| `.agent/checkpoint.md` | 최신 재개 가능한 session checkpoint. |
| `.agent/subagents/` | project-defined subagent profiles. |
| `.agent/workflows/` | `/compose`를 위한 workflow definitions. |
| `.agent/skills/` | reusable project skills. |
| `.agent/state/` | local state와 index; gitignored 상태로 유지해야 합니다. |

## 기여

기여하려면 pull request를 열기 전에 [CONTRIBUTING.md](./CONTRIBUTING.md)를 읽어주세요. Minerva Code는 fork이므로 변경 사항이 Minerva layer, upstream-compatible OpenCode runtime, 또는 둘 사이의 compatibility boundary 중 어디에 속하는지 명확히 해주세요.
