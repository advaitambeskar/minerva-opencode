# Minerva Code

**En memory-first AI-kodeagent med subagents, mål og workflows.**

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

Minerva Code er et fork af [OpenCode](https://github.com/advaitambeskar/minerva-opencode) og er ikke tilknyttet OpenCode-projektet.

---

## Hvad er Minerva Code?

Minerva Code er en kodeagent med projektforståelse. Den bevarer OpenCodes hurtige terminal-workflow og tilføjer varig hukommelse, eksplicitte mål, genoptagelige checkpoints, semantisk kodesøgning, task graph, specialiserede subagents og flertrins workflows.

Målet er ikke kun at svare på én prompt. Minerva Code er designet til at holde retningen i et rigtigt engineering-projekt: huske beslutninger, rekonstruere kontekst efter lange sessioner, dele arbejde op i tasks, delegere til fokuserede agents og gemme nok tilstand til, at fremtidige sessioner kan fortsætte, hvor den forrige stoppede.

## Installation

Minerva Code udvikles i øjeblikket fra kildekode. Publicerede pakkenavne og nogle interne binaries kan stadig indeholde `opencode`, mens rebrandingen er i gang.

```bash
git clone https://github.com/advaitambeskar/minerva-opencode.git
cd minerva-opencode
bun install
bun dev
```

Nyttige udviklingskommandoer:

```bash
bun dev          # run the CLI/TUI from packages/minerva
bun dev:web      # run the web app
bun dev:desktop  # run the desktop app
bun lint         # run oxlint
```

Tests er package-scoped. Kør dem fra den relevante package-mappe, ikke fra repository-roden.

## Modes

Minerva Code indeholder tre indbyggede modes, som kan skiftes med `Tab`.

| Mode | Formål |
| --- | --- |
| `build` | Standard udviklingsmode med fuld adgang til at redigere filer, køre kommandoer og implementere ændringer. |
| `plan` | Read-only analysemode til at udforske en codebase, designe en ændring og vurdere tradeoffs før redigering. |
| `compose` | Workflow-orchestration mode til at køre flertrins pipelines gennem specialiserede subagents. |

## Subagents

Subagents er fokuserede agentprofiler, der kan kaldes med `@name` i enhver besked. De defineres af YAML-filer under `.agent/subagents/` og kan udvides pr. projekt.

| Subagent | Beskrivelse |
| --- | --- |
| `@general` | Håndterer komplekse søgninger og flertrinsopgaver, der ikke passer til en smallere rolle. |
| `@researcher` | Udfører read-only udforskning af kode og dokumentation. |
| `@planner` | Opdeler arbejde i krav, tasks og implementeringsplaner. |
| `@builder` | Implementerer features eller fixes i en isoleret git worktree, så hoved-checkoutet forbliver rent. |
| `@reviewer` | Reviewer patches for korrekthed, regressioner og manglende tests. |
| `@debugger` | Reproducerer fejl og indsnævrer sandsynlige årsager. |
| `@tester` | Kører målrettede tests og rapporterer verifikationsevidence. |
| `@memory-writer` | Udtrækker varig projektlæring og skriver den til memory. |
| `@skill-writer` | Omdanner gentagne workflows til genbrugelige projektskills. |

Skriveaktive subagents som `@builder` er beregnet til at arbejde i isolerede worktrees. Read-only subagents kan køre parallelt for hurtigere udforskning.

## Memory

Minerva Code gemmer varig projektviden i `.agent/MEMORY.md`. Denne fil er til arkitekturbeslutninger, lokale konventioner, vigtige kommandoer, integrationsnoter og kendte faldgruber, der skal overleve mere end én chat-session.

Memory er ikke kun et dokument. Den indekseres i den lokale agentdatabase, kan søges med full-text search og injiceres tilbage i system context som et kompakt memory card, når sessioner kører.

Vigtige kommandoer:

| Kommando | Formål |
| --- | --- |
| `/memory` | Liste eller søge i projektets memory items. |
| `/dream` | Promovere nyttig session-læring til long-term memory. |
| `/distill` | Detektere gentagne mønstre og foreslå genbrugelige skills eller workflows. |

Secrets redigeres før memory-skrivninger, så utilsigtede credentials ikke bevares i varig projektviden.

## Virtuel lang kontekst

Minerva Code hævder ikke ubegrænset context. Den vedligeholder virtuel lang context ved at rekonstruere de vigtige dele af projektets tilstand fra lokale kilder:

| Kilde | Rolle |
| --- | --- |
| `.agent/MEMORY.md` | Varige fakta og konventioner. |
| `.agent/checkpoint.md` | Genoptagelig session state for langt eller afbrudt arbejde. |
| Semantic code index | FTS5- og embedding-baseret retrieval over source chunks. |
| Task graph | Varig task state til flertrinsarbejde. |
| System context registry | Budgeterede context cards injiceret ved provider-turn boundaries. |

Når context usage bliver høj, kan Minerva Code skrive et checkpoint og genopbygge arbejdskonteksten fra disse kilder i stedet for kun at stole på den rå samtale.

## Task Graph

Task graph registrerer arbejde som varige tasks med statusser, parent-child relationships, dependencies og evidence. Den gemmes i den lokale agentdatabase, så planlægning og udførelse overlever genstarter.

Brug `/task` til at styre den:

```bash
/task create
/task split
/task start
/task done
/task tree
```

Det er nyttigt, når en feature kræver mere struktur end en flad checklist, men stadig skal være tæt på agent-sessionen.

## Workflows

Workflows er YAML-definerede pipelines gemt i `.agent/workflows/`. De lader Minerva Code køre en struktureret sekvens af steps gennem specialiserede agents.

Indbyggede workflow-kommandoer:

```bash
/compose feature
/compose tdd
/compose debug
/compose review
```

Et feature-workflow kan analysere en spec, dele den op i et task tree, lave en implementeringsplan, køre en isoleret builder, afvikle tests, reviewe patchen og verificere, om målet er opfyldt. Workflow runs og steps persisteres, så afbrudt arbejde kan inspiceres eller genoptages.

## Kommandoer

Skriv `/` i Minerva Code for at finde kommandoer. Vigtige kommandoer:

| Kommando | Formål |
| --- | --- |
| `/goal` | Sæt eller gennemgå den aktive stopbetingelse. |
| `/task` | Administrer den varige task graph. |
| `/checkpoint` | Gem et genoptageligt session snapshot i `.agent/checkpoint.md`. |
| `/compose` | Kør workflows som `feature`, `tdd`, `debug` og `review`. |
| `/voice` | Skift voice input modes som `on`, `off` og `push-to-talk`. |
| `/memory` | Liste, søge eller glemme projekt-memory. |
| `/dream` | Promovere session-læring til varig memory. |
| `/distill` | Udtrække genbrugelige skills eller workflows fra gentagen adfærd. |

## Projekt-hjernen `.agent/`

`.agent/` er den kanoniske konfigurations- og tilstandsmappe pr. projekt. `.opencode/` kan stadig genkendes som deprecated fallback, men nye Minerva Code-projekter bør bruge `.agent/`.

Vigtige stier:

| Sti | Formål |
| --- | --- |
| `.agent/MEMORY.md` | Varig projekt-memory. |
| `.agent/notes.md` | Midlertidige scratchpad notes. |
| `.agent/goal.md` | Aktiv stopbetingelse. |
| `.agent/checkpoint.md` | Seneste genoptagelige session checkpoint. |
| `.agent/subagents/` | Projektdefinerede subagent-profiler. |
| `.agent/workflows/` | Workflow definitions for `/compose`. |
| `.agent/skills/` | Genbrugelige project skills. |
| `.agent/state/` | Lokal state og indexer; bør forblive gitignored. |

## Bidrag

Hvis du vil bidrage, så læs [CONTRIBUTING.md](./CONTRIBUTING.md), før du åbner en pull request. Fordi Minerva Code er et fork, bør ændringer tydeligt vise, om de hører til Minerva-laget, den upstream-kompatible OpenCode-runtime eller kompatibilitetsgrænsen mellem dem.
