# Minerva Code

**Ein memory-first KI-Coding-Agent mit Subagents, Zielen und Workflows.**

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

Minerva Code ist ein Fork von [OpenCode](https://github.com/anomalyco/opencode) und ist nicht mit dem OpenCode-Projekt verbunden.

---

## Was ist Minerva Code?

Minerva Code ist ein Coding-Agent mit Projektbewusstsein. Es behält den schnellen Terminal-Workflow von OpenCode bei und ergänzt ihn um dauerhafte Memory, explizite Ziele, fortsetzbare Checkpoints, semantische Codesuche, Task Graphs, spezialisierte Subagents und mehrstufige Workflows.

Das Ziel ist nicht nur, einen einzelnen Prompt zu beantworten. Minerva Code soll in echten Engineering-Projekten orientiert bleiben: Entscheidungen merken, Kontext nach langen Sessions rekonstruieren, Arbeit in Tasks aufteilen, fokussierte Agents beauftragen und genug Zustand speichern, damit spätere Sessions dort weitermachen können, wo die letzte aufgehört hat.

## Installation

Minerva Code wird derzeit aus dem Quellcode entwickelt. Veröffentlichte Paketnamen und einige interne Binaries können während des Rebrandings noch `opencode` enthalten.

```bash
git clone https://github.com/advaitambeskar/minerva-opencode.git
cd minerva-opencode
bun install
bun dev
```

Nützliche Entwicklungsbefehle:

```bash
bun dev          # run the CLI/TUI from packages/opencode
bun dev:web      # run the web app
bun dev:desktop  # run the desktop app
bun lint         # run oxlint
```

Tests sind package-scoped. Führe sie im jeweiligen Package-Verzeichnis aus, nicht im Repository-Root.

## Modi

Minerva Code enthält drei eingebaute Modi, die mit `Tab` gewechselt werden können.

| Modus | Zweck |
| --- | --- |
| `build` | Standardmodus mit vollem Zugriff zum Bearbeiten von Dateien, Ausführen von Befehlen und Implementieren von Änderungen. |
| `plan` | Read-only-Analysemodus zum Erkunden einer Codebase, Entwerfen von Änderungen und Abwägen von Tradeoffs vor dem Editieren. |
| `compose` | Workflow-Orchestrierungsmodus zum Ausführen mehrstufiger Pipelines über spezialisierte Subagents. |

## Subagents

Subagents sind fokussierte Agent-Profile, die in jeder Nachricht mit `@name` aufgerufen werden können. Sie werden als YAML-Dateien unter `.agent/subagents/` definiert und können pro Projekt erweitert werden.

| Subagent | Beschreibung |
| --- | --- |
| `@general` | Bearbeitet komplexe Suchen und mehrstufige Aufgaben, die zu keiner engeren Rolle passen. |
| `@researcher` | Führt read-only Code- und Dokumentationsrecherche aus. |
| `@planner` | Zerlegt Arbeit in Anforderungen, Tasks und Implementierungspläne. |
| `@builder` | Implementiert Features oder Fixes in einem isolierten git worktree, damit der Haupt-Checkout sauber bleibt. |
| `@reviewer` | Prüft Patches auf Korrektheit, Regressionen und fehlende Tests. |
| `@debugger` | Reproduziert Fehler und grenzt wahrscheinliche Ursachen ein. |
| `@tester` | Führt gezielte Tests aus und berichtet Verifikationsevidence. |
| `@memory-writer` | Extrahiert dauerhaftes Projektwissen und schreibt es in Memory. |
| `@skill-writer` | Wandelt wiederholte Workflows in wiederverwendbare Projektskills um. |

Schreibfähige Subagents wie `@builder` sollen in isolierten worktrees arbeiten. Read-only-Subagents können parallel laufen, um Exploration zu beschleunigen.

## Memory

Minerva Code speichert dauerhaftes Projektwissen in `.agent/MEMORY.md`. Diese Datei ist für Architekturentscheidungen, lokale Konventionen, wichtige Befehle, Integrationsnotizen und bekannte Fallstricke gedacht, die über eine einzelne Chat-Session hinaus erhalten bleiben sollen.

Memory ist nicht nur ein Dokument. Sie wird in der lokalen Agent-Datenbank indexiert, ist per Volltextsuche durchsuchbar und wird während Sessions als kompakte Memory Card wieder in den Systemkontext injiziert.

Wichtige Befehle:

| Befehl | Zweck |
| --- | --- |
| `/memory` | Projekt-Memory-Einträge auflisten oder durchsuchen. |
| `/dream` | Nützliche Session-Erkenntnisse in Long-Term Memory übernehmen. |
| `/distill` | Wiederholte Muster erkennen und wiederverwendbare Skills oder Workflows vorschlagen. |

Secrets werden vor Memory-Schreibvorgängen redigiert, damit versehentliche Credentials nicht dauerhaft im Projektwissen landen.

## Virtueller Long Context

Minerva Code behauptet keinen unbegrenzten Kontext. Es hält virtuellen Long Context aufrecht, indem es die wichtigen Teile des Projektzustands aus lokalen Quellen rekonstruiert:

| Quelle | Rolle |
| --- | --- |
| `.agent/MEMORY.md` | Dauerhafte Fakten und Konventionen. |
| `.agent/checkpoint.md` | Fortsetzbarer Session-Zustand für lange oder unterbrochene Arbeit. |
| Semantic code index | FTS5- und embedding-gestützte Retrieval-Suche über Source-Chunks. |
| Task graph | Dauerhafter Task-Zustand für mehrstufige Arbeit. |
| System context registry | Budgetierte Context Cards, die an provider-turn boundaries injiziert werden. |

Wenn die Kontextnutzung hoch wird, kann Minerva Code einen Checkpoint schreiben und den Arbeitskontext aus diesen Quellen wiederaufbauen, statt sich nur auf die rohe Unterhaltung zu verlassen.

## Task Graph

Der Task Graph speichert Arbeit als dauerhafte Tasks mit Status, Parent-Child-Beziehungen, Abhängigkeiten und Evidence. Er liegt in der lokalen Agent-Datenbank, sodass Planung und Ausführung Neustarts überleben.

Verwaltung mit `/task`:

```bash
/task create
/task split
/task start
/task done
/task tree
```

Das ist nützlich, wenn ein Feature mehr Struktur als eine flache Checkliste braucht, aber nah an der Agent-Session bleiben soll.

## Workflows

Workflows sind YAML-definierte Pipelines in `.agent/workflows/`. Sie ermöglichen Minerva Code, eine strukturierte Sequenz von Schritten über spezialisierte Agents auszuführen.

Eingebaute Workflow-Befehle:

```bash
/compose feature
/compose tdd
/compose debug
/compose review
```

Ein Feature-Workflow kann eine Spec analysieren, sie in einen Task Tree zerlegen, einen Implementierungsplan erstellen, einen isolierten Builder ausführen, Tests starten, den Patch reviewen und prüfen, ob das Ziel erfüllt ist. Workflow-Runs und Steps werden persistiert, damit unterbrochene Arbeit inspiziert oder fortgesetzt werden kann.

## Befehle

Gib `/` in Minerva Code ein, um Befehle zu entdecken. Wichtige Befehle:

| Befehl | Zweck |
| --- | --- |
| `/goal` | Aktive Stoppbedingung setzen oder prüfen. |
| `/task` | Den dauerhaften Task Graph verwalten. |
| `/checkpoint` | Einen fortsetzbaren Session-Snapshot nach `.agent/checkpoint.md` speichern. |
| `/compose` | Workflows wie `feature`, `tdd`, `debug` und `review` ausführen. |
| `/voice` | Spracheingabemodi wie `on`, `off` und `push-to-talk` umschalten. |
| `/memory` | Projekt-Memory auflisten, durchsuchen oder vergessen. |
| `/dream` | Session-Erkenntnisse in dauerhafte Memory übernehmen. |
| `/distill` | Wiederverwendbare Skills oder Workflows aus wiederholtem Verhalten extrahieren. |

## Das `.agent/` Project Brain

`.agent/` ist das kanonische Konfigurations- und Zustandsverzeichnis pro Projekt. `.opencode/` kann noch als deprecated fallback erkannt werden, neue Minerva-Code-Projekte sollten aber `.agent/` verwenden.

Wichtige Pfade:

| Pfad | Zweck |
| --- | --- |
| `.agent/MEMORY.md` | Dauerhafte Projekt-Memory. |
| `.agent/notes.md` | Temporäre Scratchpad-Notizen. |
| `.agent/goal.md` | Aktive Stoppbedingung. |
| `.agent/checkpoint.md` | Neuester fortsetzbarer Session-Checkpoint. |
| `.agent/subagents/` | Projektdefinierte Subagent-Profile. |
| `.agent/workflows/` | Workflow-Definitionen für `/compose`. |
| `.agent/skills/` | Wiederverwendbare Projektskills. |
| `.agent/state/` | Lokaler Zustand und Indexe; sollte gitignored bleiben. |

## Mitwirken

Wenn du beitragen möchtest, lies bitte [CONTRIBUTING.md](./CONTRIBUTING.md), bevor du einen Pull Request öffnest. Da Minerva Code ein Fork ist, sollten Änderungen klar machen, ob sie zur Minerva-Schicht, zur upstream-kompatiblen OpenCode-Runtime oder zur Kompatibilitätsgrenze dazwischen gehören.
