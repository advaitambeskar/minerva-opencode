# Minerva Code

**一個以記憶為核心、具備子代理、目標與工作流的 AI 編碼代理。**

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

Minerva Code 是從 [OpenCode](https://github.com/advaitambeskar/minerva-opencode) fork 而來，且不隸屬於 OpenCode 專案。

---

## Minerva Code 是什麼？

Minerva Code 是一個理解專案脈絡的編碼代理。它保留 OpenCode 快速的終端工作流，並加入持久記憶、明確目標、可恢復 checkpoint、語義程式碼搜尋、任務圖、專用子代理，以及多步驟工作流。

它的目標不只是回答一次 prompt。Minerva Code 設計用來在真實工程專案中長時間保持方向感：記住決策、在長會話後重建上下文、把工作拆成任務、委派給專注的代理，並保存足夠狀態，讓未來會話能從上次停止處繼續。

## 安裝

Minerva Code 目前以原始碼方式開發。在重新命名完成前，已發布套件名稱與部分內部 binary 仍可能包含 `opencode`。

```bash
git clone https://github.com/advaitambeskar/minerva-opencode.git
cd minerva-opencode
bun install
bun dev
```

常用開發命令：

```bash
bun dev          # run the CLI/TUI from packages/minerva
bun dev:web      # run the web app
bun dev:desktop  # run the desktop app
bun lint         # run oxlint
```

測試以 package 為範圍執行。請從相關 package 目錄執行測試，不要從 repository 根目錄執行。

## 模式

Minerva Code 內建三種模式，可使用 `Tab` 切換。

| 模式 | 用途 |
| --- | --- |
| `build` | 預設的完整存取開發模式，用於編輯檔案、執行命令與實作變更。 |
| `plan` | 唯讀分析模式，用於探索程式碼庫、設計變更，並在編輯前評估取捨。 |
| `compose` | 工作流編排模式，透過專用子代理執行多步驟 pipeline。 |

## 子代理

子代理是聚焦特定職責的 agent profile，可在任何訊息中以 `@name` 呼叫。它們由 `.agent/subagents/` 底下的 YAML 檔案定義，並可依專案擴充。

| 子代理 | 說明 |
| --- | --- |
| `@general` | 處理不適合更窄角色的複雜搜尋與多步驟任務。 |
| `@researcher` | 執行唯讀程式碼與文件探索。 |
| `@planner` | 將工作拆分成需求、任務與實作計畫。 |
| `@builder` | 在隔離的 git worktree 中實作功能或修復，讓主要 checkout 保持乾淨。 |
| `@reviewer` | 審查 patch 的正確性、回歸風險與缺少的測試。 |
| `@debugger` | 重現失敗並縮小可能原因。 |
| `@tester` | 執行目標測試並回報驗證證據。 |
| `@memory-writer` | 擷取持久專案學習並寫入記憶。 |
| `@skill-writer` | 將重複工作流轉成可重用的專案技能。 |

具備寫入能力的子代理（例如 `@builder`）預期在隔離 worktree 中工作。唯讀子代理可以並行執行，以加快探索。

## 記憶

Minerva Code 將持久專案知識保存在 `.agent/MEMORY.md`。這個檔案用於記錄架構決策、本地慣例、重要命令、整合註記，以及需要跨會話保存的已知陷阱。

記憶不只是一份文件。它會被索引到本地 agent 資料庫、支援全文搜尋，並在會話執行時以精簡 memory card 重新注入 system context。

重要命令：

| 命令 | 用途 |
| --- | --- |
| `/memory` | 列出或搜尋專案記憶項目。 |
| `/dream` | 將有用的會話學習提升為長期記憶。 |
| `/distill` | 偵測重複模式，並提出可重用技能或工作流。 |

寫入記憶前會執行 secret redaction，避免意外憑證被保存到持久專案知識中。

## 虛擬長上下文

Minerva Code 不宣稱擁有無限上下文。它透過從本地來源重建專案狀態的重要部分，來維持虛擬長上下文：

| 來源 | 作用 |
| --- | --- |
| `.agent/MEMORY.md` | 持久事實與慣例。 |
| `.agent/checkpoint.md` | 長任務或中斷工作可恢復的會話狀態。 |
| Semantic code index | 以 FTS5 和 embedding 支援的 source chunk 檢索。 |
| Task graph | 多步驟工作的持久任務狀態。 |
| System context registry | 在 provider-turn 邊界注入、受預算限制的 context cards。 |

當上下文使用量升高時，Minerva Code 可以寫入 checkpoint，並從這些來源重建工作上下文，而不是只依賴原始對話。

## 任務圖

任務圖將工作記錄為持久任務，包含狀態、父子關係、依賴與證據。它存放在本地 agent 資料庫中，因此規劃與執行可以跨重啟保留。

使用 `/task` 管理：

```bash
/task create
/task split
/task start
/task done
/task tree
```

當一個功能需要比扁平 checklist 更有結構，但仍應貼近 agent 會話時，這會很有用。

## 工作流

工作流是存放在 `.agent/workflows/` 的 YAML pipeline 定義。它們讓 Minerva Code 透過專用代理執行結構化步驟序列。

內建工作流命令包含：

```bash
/compose feature
/compose tdd
/compose debug
/compose review
```

feature 工作流可以分析 spec、拆成任務樹、建立實作計畫、執行隔離 builder、跑測試、審查 patch，並驗證目標是否已滿足。工作流 run 與 step 會被持久化，因此中斷的工作可以被檢查或恢復。

## 命令

在 Minerva Code 中輸入 `/` 可以探索命令。重要命令包含：

| 命令 | 用途 |
| --- | --- |
| `/goal` | 設定或檢視目前的停止條件。 |
| `/task` | 管理持久任務圖。 |
| `/checkpoint` | 將可恢復的會話快照保存到 `.agent/checkpoint.md`。 |
| `/compose` | 執行 `feature`、`tdd`、`debug`、`review` 等工作流。 |
| `/voice` | 切換 `on`、`off`、`push-to-talk` 等語音輸入模式。 |
| `/memory` | 列出、搜尋或忘記專案記憶。 |
| `/dream` | 將會話學習提升為持久記憶。 |
| `/distill` | 從重複行為中擷取可重用技能或工作流。 |

## `.agent/` 專案大腦

`.agent/` 是每個專案的標準配置與狀態目錄。`.opencode/` 仍可能作為 deprecated fallback 被識別，但新的 Minerva Code 專案應使用 `.agent/`。

重要路徑：

| 路徑 | 用途 |
| --- | --- |
| `.agent/MEMORY.md` | 持久專案記憶。 |
| `.agent/notes.md` | 暫時 scratchpad 筆記。 |
| `.agent/goal.md` | 目前停止條件。 |
| `.agent/checkpoint.md` | 最新可恢復會話 checkpoint。 |
| `.agent/subagents/` | 專案定義的子代理 profile。 |
| `.agent/workflows/` | `/compose` 的工作流定義。 |
| `.agent/skills/` | 可重用專案技能。 |
| `.agent/state/` | 本地狀態與索引；應保持 gitignored。 |

## 貢獻

如果你想貢獻，請在開啟 pull request 前閱讀 [CONTRIBUTING.md](./CONTRIBUTING.md)。由於 Minerva Code 是 fork，請清楚說明變更屬於 Minerva layer、與上游相容的 OpenCode runtime，或兩者之間的相容邊界。
