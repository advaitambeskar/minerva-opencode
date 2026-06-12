# Minerva Code

**Một AI coding agent ưu tiên bộ nhớ, với subagents, goals và workflows.**

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

Minerva Code là một fork của [OpenCode](https://github.com/anomalyco/opencode) và không liên kết với dự án OpenCode.

---

## Minerva Code là gì?

Minerva Code là một coding agent hiểu ngữ cảnh dự án. Nó giữ workflow terminal nhanh của OpenCode, rồi bổ sung bộ nhớ bền vững, goals rõ ràng, checkpoints có thể resume, tìm kiếm mã nguồn theo ngữ nghĩa, task graph, subagents chuyên biệt và workflows nhiều bước.

Mục tiêu không chỉ là trả lời một prompt. Minerva Code được thiết kế để giữ định hướng trong một dự án kỹ thuật thật: nhớ các quyết định, tái dựng context sau các session dài, chia việc thành tasks, ủy quyền cho agents tập trung và lưu đủ state để session sau có thể tiếp tục từ nơi session trước dừng lại.

## Cài đặt

Minerva Code hiện được phát triển từ source. Tên package đã xuất bản và một số binary nội bộ có thể vẫn chứa `opencode` trong khi quá trình rebrand đang diễn ra.

```bash
git clone https://github.com/advaitambeskar/minerva-opencode.git
cd minerva-opencode
bun install
bun dev
```

Các lệnh phát triển hữu ích:

```bash
bun dev          # run the CLI/TUI from packages/opencode
bun dev:web      # run the web app
bun dev:desktop  # run the desktop app
bun lint         # run oxlint
```

Tests được chạy theo package. Hãy chạy từ thư mục package liên quan, không chạy từ root của repository.

## Modes

Minerva Code có ba mode tích hợp có thể chuyển bằng `Tab`.

| Mode | Mục đích |
| --- | --- |
| `build` | Mode phát triển mặc định với toàn quyền để sửa file, chạy lệnh và implement thay đổi. |
| `plan` | Mode phân tích read-only để khám phá codebase, thiết kế thay đổi và xem xét tradeoffs trước khi chỉnh sửa. |
| `compose` | Mode workflow orchestration để chạy pipeline nhiều bước qua các subagents chuyên biệt. |

## Subagents

Subagents là các agent profiles tập trung vào vai trò cụ thể, có thể gọi bằng `@name` trong bất kỳ tin nhắn nào. Chúng được định nghĩa bằng YAML files trong `.agent/subagents/` và có thể mở rộng theo từng project.

| Subagent | Mô tả |
| --- | --- |
| `@general` | Xử lý tìm kiếm phức tạp và tasks nhiều bước không phù hợp với một vai trò hẹp hơn. |
| `@researcher` | Khám phá code và documentation ở chế độ read-only. |
| `@planner` | Chia việc thành requirements, tasks và implementation plans. |
| `@builder` | Implement features hoặc fixes trong một git worktree biệt lập để giữ checkout chính sạch. |
| `@reviewer` | Review patches về correctness, regressions và missing tests. |
| `@debugger` | Tái hiện failures và thu hẹp nguyên nhân có khả năng. |
| `@tester` | Chạy targeted tests và báo cáo verification evidence. |
| `@memory-writer` | Trích xuất project learnings bền vững và ghi vào memory. |
| `@skill-writer` | Biến workflows lặp lại thành reusable project skills. |

Các subagents có quyền ghi như `@builder` được thiết kế để làm việc trong worktrees biệt lập. Subagents read-only có thể chạy song song để khám phá nhanh hơn.

## Memory

Minerva Code giữ project knowledge bền vững trong `.agent/MEMORY.md`. File này dành cho architecture decisions, local conventions, important commands, integration notes và known pitfalls cần tồn tại qua nhiều chat sessions.

Memory không chỉ là một document. Nó được index vào local agent database, có thể tìm kiếm bằng full-text search và được inject lại vào system context như một memory card gọn khi session chạy.

Các lệnh chính:

| Command | Mục đích |
| --- | --- |
| `/memory` | Liệt kê hoặc tìm kiếm project memory items. |
| `/dream` | Đưa những session learnings hữu ích vào long-term memory. |
| `/distill` | Phát hiện repeated patterns và đề xuất reusable skills hoặc workflows. |

Secrets được redact trước khi ghi memory để credentials vô tình không bị lưu trong project knowledge bền vững.

## Virtual Long Context

Minerva Code không tuyên bố có unlimited context. Nó duy trì virtual long context bằng cách tái dựng các phần quan trọng của project state từ nguồn cục bộ:

| Source | Vai trò |
| --- | --- |
| `.agent/MEMORY.md` | Durable facts và conventions. |
| `.agent/checkpoint.md` | Resumable session state cho công việc dài hoặc bị ngắt quãng. |
| Semantic code index | Retrieval trên source chunks bằng FTS5 và embeddings. |
| Task graph | Durable task state cho multi-step work. |
| System context registry | Budgeted context cards được inject tại provider-turn boundaries. |

Khi context usage tăng cao, Minerva Code có thể ghi checkpoint và rebuild working context từ các nguồn này thay vì chỉ dựa vào raw conversation.

## Task Graph

Task graph ghi lại công việc dưới dạng durable tasks với statuses, parent-child relationships, dependencies và evidence. Nó được lưu trong local agent database để planning và execution vẫn tồn tại sau restart.

Quản lý bằng `/task`:

```bash
/task create
/task split
/task start
/task done
/task tree
```

Điều này hữu ích khi một feature cần nhiều cấu trúc hơn flat checklist nhưng vẫn nên ở gần agent session.

## Workflows

Workflows là YAML-defined pipelines được lưu trong `.agent/workflows/`. Chúng cho phép Minerva Code chạy một chuỗi steps có cấu trúc thông qua specialized agents.

Built-in workflow commands:

```bash
/compose feature
/compose tdd
/compose debug
/compose review
```

Một feature workflow có thể phân tích spec, chia nó thành task tree, tạo implementation plan, chạy isolated builder, execute tests, review patch và verify goal đã thỏa mãn chưa. Workflow runs và steps được persisted nên interrupted work có thể được inspect hoặc resume.

## Commands

Gõ `/` trong Minerva Code để khám phá commands. Các command quan trọng:

| Command | Mục đích |
| --- | --- |
| `/goal` | Set hoặc review active stopping condition. |
| `/task` | Manage durable task graph. |
| `/checkpoint` | Save resumable session snapshot vào `.agent/checkpoint.md`. |
| `/compose` | Run workflows như `feature`, `tdd`, `debug` và `review`. |
| `/voice` | Toggle voice input modes như `on`, `off` và `push-to-talk`. |
| `/memory` | List, search hoặc forget project memory. |
| `/dream` | Promote session learnings vào durable memory. |
| `/distill` | Extract reusable skills hoặc workflows từ repeated behavior. |

## Project Brain `.agent/`

`.agent/` là canonical per-project configuration và state directory. `.opencode/` vẫn có thể được nhận diện như deprecated fallback, nhưng các project Minerva Code mới nên dùng `.agent/`.

Các path quan trọng:

| Path | Mục đích |
| --- | --- |
| `.agent/MEMORY.md` | Durable project memory. |
| `.agent/notes.md` | Temporary scratchpad notes. |
| `.agent/goal.md` | Active stopping condition. |
| `.agent/checkpoint.md` | Latest resumable session checkpoint. |
| `.agent/subagents/` | Project-defined subagent profiles. |
| `.agent/workflows/` | Workflow definitions cho `/compose`. |
| `.agent/skills/` | Reusable project skills. |
| `.agent/state/` | Local state và indexes; nên giữ gitignored. |

## Đóng góp

Nếu bạn muốn đóng góp, hãy đọc [CONTRIBUTING.md](./CONTRIBUTING.md) trước khi mở pull request. Vì Minerva Code là một fork, hãy làm rõ thay đổi thuộc về Minerva layer, upstream-compatible OpenCode runtime hay compatibility boundary giữa hai phần đó.
