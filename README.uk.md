# Minerva Code

**AI-агент для кодування з пам'яттю, subagents, цілями та workflows.**

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

Minerva Code є форком [OpenCode](https://github.com/advaitambeskar/minerva-opencode) і не пов'язана з проєктом OpenCode.

---

## Що таке Minerva Code?

Minerva Code — це агент для кодування, який розуміє контекст проєкту. Він зберігає швидкий terminal workflow OpenCode і додає довготривалу пам'ять, явні цілі, відновлювані checkpoints, семантичний пошук коду, task graph, спеціалізованих subagents і багатокрокові workflows.

Мета не лише відповісти на один prompt. Minerva Code створена для реальних інженерних проєктів: пам'ятати рішення, відновлювати context після довгих сесій, розбивати роботу на tasks, делегувати її сфокусованим agents і зберігати достатньо стану, щоб майбутні сесії продовжували з місця зупинки.

## Встановлення

Minerva Code наразі розробляється з source. Назви опублікованих packages і частина внутрішніх binaries можуть ще містити `opencode`, поки триває rebrand.

```bash
git clone https://github.com/advaitambeskar/minerva-opencode.git
cd minerva-opencode
bun install
bun dev
```

Корисні команди розробки:

```bash
bun dev          # run the CLI/TUI from packages/minerva
bun dev:web      # run the web app
bun dev:desktop  # run the desktop app
bun lint         # run oxlint
```

Тести мають package scope. Запускайте їх із директорії відповідного package, а не з кореня repository.

## Режими

Minerva Code має три built-in режими, які можна перемикати через `Tab`.

| Режим | Призначення |
| --- | --- |
| `build` | Стандартний режим розробки з повним доступом для редагування файлів, запуску команд і реалізації змін. |
| `plan` | Read-only режим аналізу для дослідження codebase, проєктування змін і оцінки tradeoffs перед редагуванням. |
| `compose` | Режим orchestration для workflows, що запускає multi-step pipelines через спеціалізованих subagents. |

## Subagents

Subagents — це сфокусовані agent profiles, які можна викликати через `@name` у будь-якому повідомленні. Вони визначаються YAML-файлами в `.agent/subagents/` і можуть розширюватися для кожного проєкту.

| Subagent | Опис |
| --- | --- |
| `@general` | Обробляє складний пошук і multi-step tasks, які не підходять вужчій ролі. |
| `@researcher` | Виконує read-only дослідження коду й документації. |
| `@planner` | Розбиває роботу на requirements, tasks і implementation plans. |
| `@builder` | Реалізує features або fixes в ізольованому git worktree, щоб main checkout залишався чистим. |
| `@reviewer` | Перевіряє patches на correctness, regressions і відсутні tests. |
| `@debugger` | Відтворює failures і звужує ймовірні causes. |
| `@tester` | Запускає targeted tests і повідомляє verification evidence. |
| `@memory-writer` | Витягує довготривалі project learnings і записує їх у memory. |
| `@skill-writer` | Перетворює repeated workflows на reusable project skills. |

Write-capable subagents, як-от `@builder`, мають працювати в ізольованих worktrees. Read-only subagents можна запускати паралельно для швидшого дослідження.

## Пам'ять

Minerva Code зберігає довготривалі project knowledge у `.agent/MEMORY.md`. Цей файл призначений для architecture decisions, local conventions, важливих commands, integration notes і known pitfalls, які мають пережити одну chat session.

Memory — це не просто документ. Вона індексується в local agent database, підтримує full-text search і під час сесій знову inject-иться в system context як compact memory card.

Ключові команди:

| Команда | Призначення |
| --- | --- |
| `/memory` | Показати або шукати project memory items. |
| `/dream` | Перенести корисні session learnings у long-term memory. |
| `/distill` | Виявити repeated patterns і запропонувати reusable skills або workflows. |

Secrets редагуються перед записом у memory, щоб випадкові credentials не збереглися в довготривалих знаннях проєкту.

## Віртуальний довгий контекст

Minerva Code не заявляє про unlimited context. Вона підтримує virtual long context, реконструюючи важливі частини project state з локальних джерел:

| Джерело | Роль |
| --- | --- |
| `.agent/MEMORY.md` | Довготривалі факти й conventions. |
| `.agent/checkpoint.md` | Відновлюваний session state для довгої або перерваної роботи. |
| Semantic code index | Retrieval по source chunks на базі FTS5 і embeddings. |
| Task graph | Довготривалий task state для multi-step work. |
| System context registry | Budgeted context cards, що inject-яться на provider-turn boundaries. |

Коли context usage стає високим, Minerva Code може записати checkpoint і відновити working context із цих джерел, а не покладатися тільки на raw conversation.

## Task Graph

Task graph записує роботу як durable tasks зі statuses, parent-child relationships, dependencies і evidence. Він зберігається в local agent database, тому planning і execution переживають restarts.

Керуйте ним через `/task`:

```bash
/task create
/task split
/task start
/task done
/task tree
```

Це корисно, коли feature потребує більшої структури, ніж flat checklist, але має залишатися близько до agent session.

## Workflows

Workflows — це YAML-defined pipelines, що зберігаються в `.agent/workflows/`. Вони дозволяють Minerva Code запускати structured sequence of steps через specialized agents.

Built-in workflow commands:

```bash
/compose feature
/compose tdd
/compose debug
/compose review
```

Feature workflow може проаналізувати spec, розбити його на task tree, створити implementation plan, запустити isolated builder, виконати tests, review patch і перевірити, чи goal виконано. Workflow runs і steps persisted, тому interrupted work можна inspect або resume.

## Команди

Введіть `/` у Minerva Code, щоб побачити commands. Важливі commands:

| Команда | Призначення |
| --- | --- |
| `/goal` | Встановити або переглянути active stopping condition. |
| `/task` | Керувати durable task graph. |
| `/checkpoint` | Зберегти resumable session snapshot у `.agent/checkpoint.md`. |
| `/compose` | Запускати workflows, як-от `feature`, `tdd`, `debug` і `review`. |
| `/voice` | Перемикати voice input modes, як-от `on`, `off` і `push-to-talk`. |
| `/memory` | Показати, шукати або забути project memory. |
| `/dream` | Перенести session learnings у durable memory. |
| `/distill` | Витягти reusable skills або workflows із repeated behavior. |

## Project brain `.agent/`

`.agent/` — це canonical per-project configuration and state directory. `.opencode/` ще може розпізнаватися як deprecated fallback, але нові Minerva Code проєкти мають використовувати `.agent/`.

Важливі шляхи:

| Шлях | Призначення |
| --- | --- |
| `.agent/MEMORY.md` | Durable project memory. |
| `.agent/notes.md` | Temporary scratchpad notes. |
| `.agent/goal.md` | Active stopping condition. |
| `.agent/checkpoint.md` | Latest resumable session checkpoint. |
| `.agent/subagents/` | Project-defined subagent profiles. |
| `.agent/workflows/` | Workflow definitions for `/compose`. |
| `.agent/skills/` | Reusable project skills. |
| `.agent/state/` | Local state and indexes; має залишатися gitignored. |

## Внесок

Якщо хочете зробити внесок, прочитайте [CONTRIBUTING.md](./CONTRIBUTING.md) перед відкриттям pull request. Оскільки Minerva Code є fork, чітко зазначайте, чи зміна належить до Minerva layer, upstream-compatible OpenCode runtime або compatibility boundary між ними.
