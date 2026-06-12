# Minerva Code

**AI agent za kodiranje sa memorijom, subagentima, ciljevima i workflowima.**

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

Minerva Code je fork projekta [OpenCode](https://github.com/anomalyco/opencode) i nije povezana s OpenCode projektom.

---

## Šta je Minerva Code?

Minerva Code je agent za kodiranje koji razumije kontekst projekta. Zadržava brzi terminal workflow iz OpenCode-a i dodaje trajnu memoriju, eksplicitne ciljeve, nastavive checkpointe, semantičku pretragu koda, task graph, specijalizirane subagente i višekoračne workflowe.

Cilj nije samo odgovoriti na jedan prompt. Minerva Code je dizajniran da ostane orijentisan u stvarnom inženjerskom projektu: pamti odluke, rekonstruiše kontekst nakon dugih sesija, dijeli posao na taskove, delegira fokusiranim agentima i čuva dovoljno stanja da buduće sesije mogu nastaviti gdje je prethodna stala.

## Instalacija

Minerva Code se trenutno razvija iz izvornog koda. Objavljena imena paketa i neki interni binariji mogu još sadržavati `opencode` dok rebranding traje.

```bash
git clone https://github.com/advaitambeskar/minerva-opencode.git
cd minerva-opencode
bun install
bun dev
```

Korisne razvojne komande:

```bash
bun dev          # run the CLI/TUI from packages/opencode
bun dev:web      # run the web app
bun dev:desktop  # run the desktop app
bun lint         # run oxlint
```

Testovi su vezani za package. Pokreći ih iz relevantnog package direktorija, ne iz root direktorija repozitorija.

## Modovi

Minerva Code ima tri ugrađena moda koja se mogu mijenjati tipkom `Tab`.

| Mod | Svrha |
| --- | --- |
| `build` | Zadani razvojni mod s punim pristupom za uređivanje fajlova, pokretanje komandi i implementaciju promjena. |
| `plan` | Read-only analitički mod za istraživanje codebase-a, planiranje promjena i procjenu kompromisa prije uređivanja. |
| `compose` | Mod za workflow orkestraciju koji pokreće višekoračne pipeline kroz specijalizirane subagente. |

## Subagenti

Subagenti su fokusirani profili agenata koji se mogu pozvati sa `@name` u bilo kojoj poruci. Definisani su YAML fajlovima u `.agent/subagents/` i mogu se proširivati po projektu.

| Subagent | Opis |
| --- | --- |
| `@general` | Rješava kompleksne pretrage i višekoračne zadatke koji ne pripadaju užoj ulozi. |
| `@researcher` | Izvodi read-only istraživanje koda i dokumentacije. |
| `@planner` | Dijeli posao na zahtjeve, taskove i implementacijske planove. |
| `@builder` | Implementira feature ili fix u izolovanom git worktree-u kako bi glavni checkout ostao čist. |
| `@reviewer` | Pregleda patcheve zbog ispravnosti, regresija i nedostajućih testova. |
| `@debugger` | Reproducira greške i sužava vjerovatne uzroke. |
| `@tester` | Pokreće ciljane testove i prijavljuje verifikacijske dokaze. |
| `@memory-writer` | Izvlači trajna projektna saznanja i zapisuje ih u memoriju. |
| `@skill-writer` | Pretvara ponavljajuće workflowe u ponovno upotrebljive projektne skillove. |

Subagenti koji mogu pisati, kao `@builder`, predviđeni su za rad u izolovanim worktree-ovima. Read-only subagenti se mogu pokretati paralelno radi bržeg istraživanja.

## Memorija

Minerva Code čuva trajno projektno znanje u `.agent/MEMORY.md`. Ovaj fajl je namijenjen arhitektonskim odlukama, lokalnim konvencijama, važnim komandama, integracijskim bilješkama i poznatim zamkama koje trebaju preživjeti više od jedne chat sesije.

Memorija nije samo dokument. Indeksira se u lokalnoj bazi agenata, može se pretraživati full-text pretragom i ponovo se ubacuje u system context kao kompaktna memory card kada sesije rade.

Ključne komande:

| Komanda | Svrha |
| --- | --- |
| `/memory` | Listanje ili pretraga stavki projektne memorije. |
| `/dream` | Promovisanje korisnih saznanja iz sesije u dugoročnu memoriju. |
| `/distill` | Otkrivanje ponavljajućih obrazaca i predlaganje reusable skills ili workflows. |

Secrets se rediguju prije upisa u memoriju kako slučajni credentials ne bi ostali u trajnom projektnom znanju.

## Virtuelni dugi kontekst

Minerva Code ne tvrdi da ima neograničen kontekst. Održava virtuelni dugi kontekst rekonstruisanjem važnih dijelova stanja projekta iz lokalnih izvora:

| Izvor | Uloga |
| --- | --- |
| `.agent/MEMORY.md` | Trajne činjenice i konvencije. |
| `.agent/checkpoint.md` | Nastavljivo stanje sesije za dug ili prekinut rad. |
| Semantic code index | Retrieval nad source chunkovima uz FTS5 i embeddinge. |
| Task graph | Trajno stanje taskova za višekoračni rad. |
| System context registry | Budžetirane context cards ubačene na provider-turn granicama. |

Kada upotreba konteksta poraste, Minerva Code može zapisati checkpoint i rekonstruisati radni kontekst iz ovih izvora umjesto da se oslanja samo na sirovi razgovor.

## Task Graph

Task graph bilježi posao kao trajne taskove sa statusima, parent-child odnosima, zavisnostima i dokazima. Spremljen je u lokalnoj agent bazi, tako da planiranje i izvršavanje preživljavaju restarte.

Upravljaj njim preko `/task`:

```bash
/task create
/task split
/task start
/task done
/task tree
```

Korisno je kada feature treba više strukture od ravne checklist, ali treba ostati blizu agent sesije.

## Workflowi

Workflowi su YAML-definisani pipelinei u `.agent/workflows/`. Omogućavaju Minerva Code-u da pokrene strukturiran niz koraka kroz specijalizirane agente.

Ugrađene workflow komande:

```bash
/compose feature
/compose tdd
/compose debug
/compose review
```

Feature workflow može analizirati spec, podijeliti ga u task tree, napraviti implementacijski plan, pokrenuti izolovanog buildera, izvršiti testove, pregledati patch i provjeriti da li je cilj zadovoljen. Workflow runs i steps se čuvaju, tako da se prekinut rad može pregledati ili nastaviti.

## Komande

Upiši `/` u Minerva Code da otkriješ komande. Važne komande:

| Komanda | Svrha |
| --- | --- |
| `/goal` | Postavljanje ili pregled aktivnog uslova završetka. |
| `/task` | Upravljanje trajnim task graphom. |
| `/checkpoint` | Snimanje nastavivog snapshot-a sesije u `.agent/checkpoint.md`. |
| `/compose` | Pokretanje workflowa kao `feature`, `tdd`, `debug` i `review`. |
| `/voice` | Prebacivanje voice input modova kao `on`, `off` i `push-to-talk`. |
| `/memory` | Listanje, pretraga ili zaboravljanje projektne memorije. |
| `/dream` | Promovisanje session learninga u trajnu memoriju. |
| `/distill` | Izvlačenje reusable skills ili workflows iz ponavljajućeg ponašanja. |

## Projektni mozak `.agent/`

`.agent/` je kanonski direktorij za konfiguraciju i stanje po projektu. `.opencode/` se još može prepoznati kao deprecated fallback, ali novi Minerva Code projekti trebaju koristiti `.agent/`.

Važne putanje:

| Putanja | Svrha |
| --- | --- |
| `.agent/MEMORY.md` | Trajna projektna memorija. |
| `.agent/notes.md` | Privremene scratchpad bilješke. |
| `.agent/goal.md` | Aktivni uslov završetka. |
| `.agent/checkpoint.md` | Najnoviji nastavivi checkpoint sesije. |
| `.agent/subagents/` | Projektno definisani subagent profili. |
| `.agent/workflows/` | Workflow definicije za `/compose`. |
| `.agent/skills/` | Ponovno upotrebljivi project skills. |
| `.agent/state/` | Lokalno stanje i indeksi; treba ostati gitignored. |

## Doprinos

Ako želiš doprinijeti, pročitaj [CONTRIBUTING.md](./CONTRIBUTING.md) prije otvaranja pull requesta. Pošto je Minerva Code fork, jasno naznači da li promjena pripada Minerva sloju, upstream-kompatibilnom OpenCode runtime-u ili granici kompatibilnosti između njih.
