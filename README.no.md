# Minerva Code

**En minne-først AI-kodeagent med subagenter, mål og arbeidsflyter.**

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

Minerva Code er en fork av [OpenCode](https://github.com/anomalyco/opencode) og er ikke tilknyttet OpenCode-prosjektet.

---

## Hva er Minerva Code?

Minerva Code er en kodeagent som forstår prosjektkontekst. Den beholder den raske terminalarbeidsflyten fra OpenCode og legger til varig minne, eksplisitte mål, gjenopptakbare checkpoints, semantisk kodesøk, oppgavegraf, spesialiserte subagenter og flertrinns arbeidsflyter.

Målet er ikke bare å svare på én prompt. Minerva Code er laget for å holde retningen i et virkelig utviklingsprosjekt: huske beslutninger, rekonstruere kontekst etter lange økter, dele arbeid i oppgaver, delegere til fokuserte agenter og lagre nok tilstand til at senere økter kan fortsette der forrige stoppet.

## Installasjon

Minerva Code utvikles foreløpig fra kildekode. Publiserte pakkenavn og noen interne binærfiler kan fortsatt inneholde `opencode` mens rebrandingen pågår.

```bash
git clone https://github.com/advaitambeskar/minerva-opencode.git
cd minerva-opencode
bun install
bun dev
```

Nyttige utviklingskommandoer:

```bash
bun dev          # run the CLI/TUI from packages/opencode
bun dev:web      # run the web app
bun dev:desktop  # run the desktop app
bun lint         # run oxlint
```

Tester kjøres per package. Kjør dem fra den relevante package-mappen, ikke fra repo-roten.

## Moduser

Minerva Code har tre innebygde moduser som kan byttes med `Tab`.

| Modus | Formål |
| --- | --- |
| `build` | Standard fulltilgangs utviklingsmodus for å redigere filer, kjøre kommandoer og implementere endringer. |
| `plan` | Skrivebeskyttet analysemodus for å utforske kodebasen, planlegge endringer og vurdere avveininger før redigering. |
| `compose` | Arbeidsflyt-orkestrering for flertrinns pipelines gjennom spesialiserte subagenter. |

## Subagenter

Subagenter er fokuserte agentprofiler som kan kalles med `@name` i en melding. De defineres som YAML-filer under `.agent/subagents/` og kan utvides per prosjekt.

| Subagent | Beskrivelse |
| --- | --- |
| `@general` | Håndterer komplekse søk og flertrinnsoppgaver som ikke passer en smalere rolle. |
| `@researcher` | Utfører skrivebeskyttet kode- og dokumentasjonsutforskning. |
| `@planner` | Deler arbeid i krav, oppgaver og implementeringsplaner. |
| `@builder` | Implementerer funksjoner eller feilrettinger i en isolert git worktree slik at hovedcheckouten holdes ren. |
| `@reviewer` | Gjennomgår patches for korrekthet, regresjoner og manglende tester. |
| `@debugger` | Reproduserer feil og snevrer inn sannsynlige årsaker. |
| `@tester` | Kjører målrettede tester og rapporterer verifikasjonsbevis. |
| `@memory-writer` | Trekker ut varig prosjektlæring og skriver den til minnet. |
| `@skill-writer` | Gjør gjentatte arbeidsflyter om til gjenbrukbare prosjektferdigheter. |

Skrivende subagenter som `@builder` skal arbeide i isolerte worktrees. Skrivebeskyttede subagenter kan kjøres parallelt for raskere utforskning.

## Minne

Minerva Code lagrer varig prosjektkunnskap i `.agent/MEMORY.md`. Filen er for arkitekturbeslutninger, lokale konvensjoner, viktige kommandoer, integrasjonsnotater og kjente fallgruver som bør overleve mer enn én chatøkt.

Minnet er ikke bare et dokument. Det indekseres i den lokale agentdatabasen, kan søkes med fulltekstsøk og injiseres tilbake i systemkonteksten som et kompakt memory card når økter kjører.

Viktige kommandoer:

| Kommando | Formål |
| --- | --- |
| `/memory` | Liste eller søke i prosjektminne. |
| `/dream` | Flytte nyttig læring fra økten til langtidsminne. |
| `/distill` | Finne gjentatte mønstre og foreslå gjenbrukbare skills eller workflows. |

Secrets redigeres bort før minneskriving, slik at utilsiktede credentials ikke bevares i varig prosjektkunnskap.

## Virtuell lang kontekst

Minerva Code påstår ikke å ha ubegrenset kontekst. Den opprettholder virtuell lang kontekst ved å rekonstruere viktige deler av prosjektets tilstand fra lokale kilder:

| Kilde | Rolle |
| --- | --- |
| `.agent/MEMORY.md` | Varige fakta og konvensjoner. |
| `.agent/checkpoint.md` | Gjenopptakbar økttilstand for langt eller avbrutt arbeid. |
| Semantic code index | FTS5- og embedding-basert retrieval over kildekode-chunks. |
| Task graph | Varig oppgavetilstand for flertrinnsarbeid. |
| System context registry | Budsjettstyrte context cards injisert ved provider-turn-grenser. |

Når kontekstbruken blir høy, kan Minerva Code skrive et checkpoint og bygge arbeidskonteksten opp igjen fra disse kildene i stedet for bare å stole på rå samtalehistorikk.

## Oppgavegraf

Oppgavegrafen lagrer arbeid som varige oppgaver med status, forelder-barn-relasjoner, avhengigheter og bevis. Den lagres i den lokale agentdatabasen slik at planlegging og utføring overlever omstarter.

Bruk `/task` for å styre den:

```bash
/task create
/task split
/task start
/task done
/task tree
```

Dette er nyttig når en funksjon trenger mer struktur enn en flat sjekkliste, men fortsatt bør ligge nær agentøkten.

## Arbeidsflyter

Arbeidsflyter er YAML-definerte pipelines i `.agent/workflows/`. De lar Minerva Code kjøre en strukturert sekvens av trinn gjennom spesialiserte agenter.

Innebygde workflow-kommandoer:

```bash
/compose feature
/compose tdd
/compose debug
/compose review
```

En feature-workflow kan analysere en spec, dele den i et task tree, lage en implementeringsplan, kjøre en isolert builder, utføre tester, reviewe patchen og verifisere om målet er oppfylt. Workflow-runs og steps lagres slik at avbrutt arbeid kan inspiseres eller gjenopptas.

## Kommandoer

Skriv `/` i Minerva Code for å finne kommandoer. Viktige kommandoer:

| Kommando | Formål |
| --- | --- |
| `/goal` | Sett eller se aktiv stoppbetingelse. |
| `/task` | Administrer den varige oppgavegrafen. |
| `/checkpoint` | Lagre et gjenopptakbart øyeblikksbilde til `.agent/checkpoint.md`. |
| `/compose` | Kjør workflows som `feature`, `tdd`, `debug` og `review`. |
| `/voice` | Bytt taleinputmoduser som `on`, `off` og `push-to-talk`. |
| `/memory` | Liste, søke eller glemme prosjektminne. |
| `/dream` | Flytt øktlæring til varig minne. |
| `/distill` | Hent ut gjenbrukbare skills eller workflows fra gjentatt oppførsel. |

## Prosjekthjernen `.agent/`

`.agent/` er den kanoniske konfigurasjons- og tilstandsmappen per prosjekt. `.opencode/` kan fortsatt gjenkjennes som en deprecated fallback, men nye Minerva Code-prosjekter bør bruke `.agent/`.

Viktige stier:

| Sti | Formål |
| --- | --- |
| `.agent/MEMORY.md` | Varig prosjektminne. |
| `.agent/notes.md` | Midlertidige scratchpad-notater. |
| `.agent/goal.md` | Aktiv stoppbetingelse. |
| `.agent/checkpoint.md` | Siste gjenopptakbare session checkpoint. |
| `.agent/subagents/` | Prosjektdefinerte subagent-profiler. |
| `.agent/workflows/` | Workflow-definisjoner for `/compose`. |
| `.agent/skills/` | Gjenbrukbare project skills. |
| `.agent/state/` | Lokal tilstand og indekser; bør forbli gitignored. |

## Bidra

Hvis du vil bidra, les [CONTRIBUTING.md](./CONTRIBUTING.md) før du åpner en pull request. Fordi Minerva Code er en fork, bør endringer gjøre det tydelig om de hører til Minerva-laget, den upstream-kompatible OpenCode-runtime, eller kompatibilitetsgrensen mellom dem.
