# Minerva Code

**Un agente di coding AI memory-first con subagent, obiettivi e workflow.**

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

Minerva Code è un fork di [OpenCode](https://github.com/advaitambeskar/minerva-opencode) e non è affiliato al progetto OpenCode.

---

## Che cos'è Minerva Code?

Minerva Code è un agente di coding consapevole del progetto. Mantiene il workflow veloce da terminale di OpenCode e aggiunge memoria duratura, obiettivi espliciti, checkpoint ripristinabili, ricerca semantica del codice, grafi di task, subagent specializzati e workflow multi-step.

L'obiettivo non è solo rispondere a un prompt. Minerva Code è progettato per restare orientato dentro un vero progetto di ingegneria: ricordare decisioni, ricostruire il contesto dopo sessioni lunghe, dividere il lavoro in task, delegare ad agenti focalizzati e conservare abbastanza stato perché le sessioni future possano riprendere da dove si era interrotto.

## Installazione

Minerva Code è attualmente sviluppato dai sorgenti. I nomi dei package pubblicati e alcuni binari interni possono ancora contenere `opencode` mentre il rebrand è in corso.

```bash
git clone https://github.com/advaitambeskar/minerva-opencode.git
cd minerva-opencode
bun install
bun dev
```

Comandi di sviluppo utili:

```bash
bun dev          # run the CLI/TUI from packages/minerva
bun dev:web      # run the web app
bun dev:desktop  # run the desktop app
bun lint         # run oxlint
```

I test sono scoped per package. Eseguili dalla directory del package pertinente, non dalla root del repository.

## Modalità

Minerva Code include tre modalità integrate che possono essere cambiate con `Tab`.

| Modalità | Scopo |
| --- | --- |
| `build` | Modalità di sviluppo predefinita con accesso completo per modificare file, eseguire comandi e implementare cambiamenti. |
| `plan` | Modalità di analisi read-only per esplorare una codebase, progettare una modifica e valutare i tradeoff prima di editare. |
| `compose` | Modalità di orchestrazione workflow per eseguire pipeline multi-step tramite subagent specializzati. |

## Subagent

I subagent sono profili agent focalizzati che possono essere invocati con `@name` in qualsiasi messaggio. Sono definiti da file YAML in `.agent/subagents/` e possono essere estesi per progetto.

| Subagent | Descrizione |
| --- | --- |
| `@general` | Gestisce ricerche complesse e task multi-step che non rientrano in un ruolo più specifico. |
| `@researcher` | Esegue esplorazione read-only di codice e documentazione. |
| `@planner` | Scompone il lavoro in requisiti, task e piani di implementazione. |
| `@builder` | Implementa feature o fix in un git worktree isolato, mantenendo pulito il checkout principale. |
| `@reviewer` | Rivede patch per correttezza, regressioni e test mancanti. |
| `@debugger` | Riproduce failure e restringe le cause probabili. |
| `@tester` | Esegue test mirati e riporta evidence di verifica. |
| `@memory-writer` | Estrae apprendimenti duraturi del progetto e li scrive in memoria. |
| `@skill-writer` | Trasforma workflow ripetuti in skill di progetto riutilizzabili. |

I subagent con capacità di scrittura, come `@builder`, sono pensati per lavorare in worktree isolati. I subagent read-only possono girare in parallelo per accelerare l'esplorazione.

## Memoria

Minerva Code mantiene conoscenza duratura del progetto in `.agent/MEMORY.md`. Questo file è pensato per decisioni architetturali, convenzioni locali, comandi importanti, note di integrazione e insidie note che devono sopravvivere oltre una singola sessione di chat.

La memoria non è solo un documento. Viene indicizzata nel database locale dell'agente, è ricercabile con full-text search e viene reiniettata nel system context come memory card compatta durante l'esecuzione delle sessioni.

Comandi chiave:

| Comando | Scopo |
| --- | --- |
| `/memory` | Elencare o cercare elementi della memoria di progetto. |
| `/dream` | Promuovere apprendimenti utili della sessione in memoria a lungo termine. |
| `/distill` | Rilevare pattern ripetuti e proporre skill o workflow riutilizzabili. |

I secret vengono redatti prima delle scritture in memoria, così credenziali accidentali non vengono preservate nella conoscenza duratura del progetto.

## Contesto lungo virtuale

Minerva Code non dichiara contesto illimitato. Mantiene un contesto lungo virtuale ricostruendo le parti importanti dello stato del progetto da fonti locali:

| Fonte | Ruolo |
| --- | --- |
| `.agent/MEMORY.md` | Fatti e convenzioni durature. |
| `.agent/checkpoint.md` | Stato di sessione ripristinabile per lavori lunghi o interrotti. |
| Semantic code index | Retrieval su source chunk con FTS5 ed embedding. |
| Task graph | Stato duraturo dei task per lavori multi-step. |
| System context registry | Context cards con budget iniettate ai confini dei provider-turn. |

Quando l'uso del contesto cresce, Minerva Code può scrivere un checkpoint e ricostruire il contesto di lavoro da queste fonti invece di dipendere solo dalla conversazione grezza.

## Task Graph

Il task graph registra il lavoro come task duraturi con stati, relazioni padre-figlio, dipendenze ed evidence. È salvato nel database locale dell'agente, quindi pianificazione ed esecuzione sopravvivono ai riavvii.

Usa `/task` per gestirlo:

```bash
/task create
/task split
/task start
/task done
/task tree
```

È utile quando una feature richiede più struttura di una checklist piatta ma deve restare vicina alla sessione dell'agente.

## Workflow

I workflow sono pipeline definite in YAML e salvate in `.agent/workflows/`. Permettono a Minerva Code di eseguire una sequenza strutturata di step tramite agenti specializzati.

Comandi workflow integrati:

```bash
/compose feature
/compose tdd
/compose debug
/compose review
```

Un workflow feature può analizzare una spec, dividerla in un task tree, creare un piano di implementazione, avviare un builder isolato, eseguire test, rivedere la patch e verificare se l'obiettivo è soddisfatto. Run e step dei workflow sono persistiti, così il lavoro interrotto può essere ispezionato o ripreso.

## Comandi

Digita `/` in Minerva Code per scoprire i comandi. Comandi importanti:

| Comando | Scopo |
| --- | --- |
| `/goal` | Impostare o rivedere la condizione di stop attiva. |
| `/task` | Gestire il task graph duraturo. |
| `/checkpoint` | Salvare uno snapshot di sessione ripristinabile in `.agent/checkpoint.md`. |
| `/compose` | Eseguire workflow come `feature`, `tdd`, `debug` e `review`. |
| `/voice` | Cambiare modalità di input vocale come `on`, `off` e `push-to-talk`. |
| `/memory` | Elencare, cercare o dimenticare memoria di progetto. |
| `/dream` | Promuovere apprendimenti di sessione in memoria duratura. |
| `/distill` | Estrarre skill o workflow riutilizzabili da comportamenti ripetuti. |

## Il project brain `.agent/`

`.agent/` è la directory canonica per configurazione e stato per progetto. `.opencode/` può ancora essere riconosciuta come fallback deprecato, ma i nuovi progetti Minerva Code dovrebbero usare `.agent/`.

Percorsi importanti:

| Percorso | Scopo |
| --- | --- |
| `.agent/MEMORY.md` | Memoria duratura del progetto. |
| `.agent/notes.md` | Note temporanee scratchpad. |
| `.agent/goal.md` | Condizione di stop attiva. |
| `.agent/checkpoint.md` | Ultimo checkpoint di sessione ripristinabile. |
| `.agent/subagents/` | Profili subagent definiti dal progetto. |
| `.agent/workflows/` | Definizioni workflow per `/compose`. |
| `.agent/skills/` | Skill di progetto riutilizzabili. |
| `.agent/state/` | Stato locale e indici; deve rimanere gitignored. |

## Contribuire

Se vuoi contribuire, leggi [CONTRIBUTING.md](./CONTRIBUTING.md) prima di aprire una pull request. Poiché Minerva Code è un fork, rendi chiaro se una modifica appartiene al layer Minerva, al runtime OpenCode compatibile con upstream o al confine di compatibilità tra i due.
