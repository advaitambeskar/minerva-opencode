# Minerva Code

**メモリを中心に、サブエージェント、ゴール、ワークフローを備えた AI コーディングエージェント。**

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

Minerva Code は [OpenCode](https://github.com/advaitambeskar/minerva-opencode) から fork されたものであり、OpenCode プロジェクトとは提携していません。

---

## Minerva Code とは？

Minerva Code は、プロジェクトを理解するコーディングエージェントです。OpenCode の高速なターミナルワークフローを保ちながら、永続メモリ、明示的なゴール、再開可能な checkpoint、セマンティックコード検索、タスクグラフ、専門サブエージェント、複数ステップのワークフローを追加しています。

目的は、単に 1 回のプロンプトに答えることではありません。Minerva Code は実際のエンジニアリングプロジェクトで方向感覚を保つために設計されています。判断を記憶し、長いセッション後にコンテキストを再構築し、作業をタスクへ分割し、専門エージェントへ委任し、次のセッションが前回の続きから始められるだけの状態を保存します。

## インストール

Minerva Code は現在、ソースから開発されています。リブランドが進行中のため、公開パッケージ名や一部の内部バイナリにはまだ `opencode` が含まれる場合があります。

```bash
git clone https://github.com/advaitambeskar/minerva-opencode.git
cd minerva-opencode
bun install
bun dev
```

便利な開発コマンド:

```bash
bun dev          # run the CLI/TUI from packages/minerva
bun dev:web      # run the web app
bun dev:desktop  # run the desktop app
bun lint         # run oxlint
```

テストは package 単位です。リポジトリルートではなく、対象 package のディレクトリから実行してください。

## モード

Minerva Code には `Tab` で切り替えられる 3 つの組み込みモードがあります。

| モード | 目的 |
| --- | --- |
| `build` | ファイル編集、コマンド実行、変更実装のためのデフォルトのフルアクセス開発モード。 |
| `plan` | コードベース探索、変更設計、編集前のトレードオフ検討のための読み取り専用分析モード。 |
| `compose` | 専門サブエージェントを通じて複数ステップのパイプラインを実行するワークフロー編成モード。 |

## サブエージェント

サブエージェントは特定の役割に集中した agent profile で、任意のメッセージ内で `@name` として呼び出せます。これらは `.agent/subagents/` 配下の YAML ファイルで定義され、プロジェクトごとに拡張できます。

| サブエージェント | 説明 |
| --- | --- |
| `@general` | より狭い役割に当てはまらない複雑な検索や複数ステップのタスクを処理します。 |
| `@researcher` | 読み取り専用のコードおよびドキュメント探索を行います。 |
| `@planner` | 作業を要件、タスク、実装計画へ分解します。 |
| `@builder` | メイン checkout を clean に保つため、隔離された git worktree で機能や修正を実装します。 |
| `@reviewer` | patch の正しさ、リグレッション、足りないテストをレビューします。 |
| `@debugger` | 失敗を再現し、原因候補を絞り込みます。 |
| `@tester` | 対象テストを実行し、検証 evidence を報告します。 |
| `@memory-writer` | 永続化すべきプロジェクト学習を抽出してメモリへ書き込みます。 |
| `@skill-writer` | 繰り返し発生するワークフローを再利用可能なプロジェクト skill に変換します。 |

`@builder` のような書き込み可能なサブエージェントは、隔離 worktree で作業することを想定しています。読み取り専用サブエージェントは、探索を速くするために並列実行できます。

## メモリ

Minerva Code は永続的なプロジェクト知識を `.agent/MEMORY.md` に保存します。このファイルは、アーキテクチャ上の判断、ローカル規約、重要なコマンド、統合メモ、セッションを越えて残すべき既知の落とし穴を記録するためのものです。

メモリは単なるドキュメントではありません。ローカル agent database に index され、全文検索でき、セッション実行時にはコンパクトな memory card として system context に再注入されます。

主要コマンド:

| コマンド | 目的 |
| --- | --- |
| `/memory` | プロジェクトメモリ項目を一覧または検索します。 |
| `/dream` | 有用なセッション学習を長期メモリへ昇格します。 |
| `/distill` | 繰り返しパターンを検出し、再利用可能な skill や workflow を提案します。 |

誤って認証情報が永続的なプロジェクト知識に残らないよう、メモリ書き込み前に secret redaction が行われます。

## 仮想ロングコンテキスト

Minerva Code は無限コンテキストを主張しません。ローカルソースからプロジェクト状態の重要部分を再構築することで、仮想ロングコンテキストを維持します。

| ソース | 役割 |
| --- | --- |
| `.agent/MEMORY.md` | 永続的な事実と規約。 |
| `.agent/checkpoint.md` | 長い作業や中断された作業のための再開可能なセッション状態。 |
| Semantic code index | FTS5 と embedding による source chunk retrieval。 |
| Task graph | 複数ステップ作業の永続タスク状態。 |
| System context registry | provider-turn 境界で注入される予算制限付き context cards。 |

コンテキスト使用量が高くなると、Minerva Code は checkpoint を書き込み、元の会話だけに頼らずこれらのソースから作業コンテキストを再構築できます。

## タスクグラフ

タスクグラフは、状態、親子関係、依存関係、evidence を持つ永続タスクとして作業を記録します。ローカル agent database に保存されるため、計画と実行は再起動後も保持されます。

`/task` で管理します:

```bash
/task create
/task split
/task start
/task done
/task tree
```

フラットな checklist よりも構造が必要だが、agent セッションの近くに保ちたい機能開発に役立ちます。

## ワークフロー

ワークフローは `.agent/workflows/` に保存される YAML 定義の pipeline です。Minerva Code はこれを使って、専門エージェントによる構造化されたステップ列を実行できます。

組み込みワークフローコマンド:

```bash
/compose feature
/compose tdd
/compose debug
/compose review
```

feature ワークフローは spec の分析、タスクツリーへの分解、実装計画の作成、隔離 builder の実行、テスト実行、patch レビュー、ゴール達成の検証まで行えます。workflow run と step は永続化されるため、中断された作業を確認または再開できます。

## コマンド

Minerva Code 内で `/` を入力するとコマンドを確認できます。重要なコマンド:

| コマンド | 目的 |
| --- | --- |
| `/goal` | 現在の停止条件を設定または確認します。 |
| `/task` | 永続タスクグラフを管理します。 |
| `/checkpoint` | 再開可能なセッション snapshot を `.agent/checkpoint.md` に保存します。 |
| `/compose` | `feature`、`tdd`、`debug`、`review` などの workflow を実行します。 |
| `/voice` | `on`、`off`、`push-to-talk` などの音声入力モードを切り替えます。 |
| `/memory` | プロジェクトメモリを一覧、検索、または忘却します。 |
| `/dream` | セッション学習を永続メモリへ昇格します。 |
| `/distill` | 繰り返し行動から再利用可能な skill や workflow を抽出します。 |

## `.agent/` プロジェクトブレイン

`.agent/` はプロジェクトごとの標準設定および状態ディレクトリです。`.opencode/` は deprecated fallback として認識される場合がありますが、新しい Minerva Code プロジェクトでは `.agent/` を使うべきです。

重要なパス:

| パス | 目的 |
| --- | --- |
| `.agent/MEMORY.md` | 永続プロジェクトメモリ。 |
| `.agent/notes.md` | 一時的な scratchpad notes。 |
| `.agent/goal.md` | 現在の停止条件。 |
| `.agent/checkpoint.md` | 最新の再開可能なセッション checkpoint。 |
| `.agent/subagents/` | プロジェクト定義の subagent profiles。 |
| `.agent/workflows/` | `/compose` 用の workflow definitions。 |
| `.agent/skills/` | 再利用可能な project skills。 |
| `.agent/state/` | ローカル状態と indexes。gitignored のままにしてください。 |

## コントリビューション

貢献したい場合は、pull request を開く前に [CONTRIBUTING.md](./CONTRIBUTING.md) を読んでください。Minerva Code は fork であるため、変更が Minerva レイヤー、上流互換の OpenCode runtime、またはその間の互換境界のどれに属するかを明確にしてください。
