# Minerva Code

**Agent kodujący AI oparty na pamięci, z subagentami, celami i workflow.**

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

Minerva Code jest forkiem [OpenCode](https://github.com/advaitambeskar/minerva-opencode) i nie jest powiązana z projektem OpenCode.

---

## Czym jest Minerva Code?

Minerva Code to agent kodujący świadomy projektu. Zachowuje szybki terminalowy workflow OpenCode, a następnie dodaje trwałą pamięć, jawne cele, wznawialne checkpointy, semantyczne wyszukiwanie kodu, graf zadań, wyspecjalizowane subagenty i wieloetapowe workflow.

Nie chodzi tylko o odpowiedź na jeden prompt. Minerva Code ma utrzymywać orientację w prawdziwym projekcie inżynierskim: pamiętać decyzje, rekonstruować kontekst po długich sesjach, dzielić pracę na zadania, delegować ją do wyspecjalizowanych agentów i zachowywać tyle stanu, aby przyszłe sesje mogły kontynuować od miejsca zatrzymania.

## Instalacja

Minerva Code jest obecnie rozwijana ze źródeł. Nazwy opublikowanych pakietów i część wewnętrznych binariów mogą nadal zawierać `opencode`, dopóki rebranding trwa.

```bash
git clone https://github.com/advaitambeskar/minerva-opencode.git
cd minerva-opencode
bun install
bun dev
```

Przydatne komendy developerskie:

```bash
bun dev          # run the CLI/TUI from packages/minerva
bun dev:web      # run the web app
bun dev:desktop  # run the desktop app
bun lint         # run oxlint
```

Testy są uruchamiane w zakresie pakietów. Uruchamiaj je z katalogu właściwego pakietu, nie z głównego katalogu repozytorium.

## Tryby

Minerva Code zawiera trzy wbudowane tryby przełączane klawiszem `Tab`.

| Tryb | Cel |
| --- | --- |
| `build` | Domyślny tryb developerski z pełnym dostępem do edycji plików, uruchamiania komend i implementacji zmian. |
| `plan` | Tryb analizy read-only do poznawania codebase, projektowania zmian i oceny kompromisów przed edycją. |
| `compose` | Tryb orkiestracji workflow do uruchamiania wieloetapowych pipeline przez wyspecjalizowane subagenty. |

## Subagenty

Subagenty to wyspecjalizowane profile agentów, które można wywołać w dowolnej wiadomości przez `@name`. Są definiowane w plikach YAML w `.agent/subagents/` i można je rozszerzać per projekt.

| Subagent | Opis |
| --- | --- |
| `@general` | Obsługuje złożone wyszukiwania i wieloetapowe zadania, które nie pasują do węższej roli. |
| `@researcher` | Prowadzi eksplorację kodu i dokumentacji w trybie read-only. |
| `@planner` | Rozbija pracę na wymagania, zadania i plany implementacji. |
| `@builder` | Implementuje funkcje lub poprawki w izolowanym git worktree, aby główny checkout pozostał czysty. |
| `@reviewer` | Sprawdza patche pod kątem poprawności, regresji i brakujących testów. |
| `@debugger` | Odtwarza awarie i zawęża prawdopodobne przyczyny. |
| `@tester` | Uruchamia celowane testy i raportuje dowody weryfikacji. |
| `@memory-writer` | Wyodrębnia trwałe wnioski projektowe i zapisuje je w pamięci. |
| `@skill-writer` | Zamienia powtarzalne workflow w wielokrotnego użytku skille projektowe. |

Subagenty z możliwością zapisu, takie jak `@builder`, powinny pracować w izolowanych worktree. Subagenty read-only można uruchamiać równolegle, aby przyspieszyć eksplorację.

## Pamięć

Minerva Code przechowuje trwałą wiedzę projektową w `.agent/MEMORY.md`. Ten plik służy do decyzji architektonicznych, lokalnych konwencji, ważnych komend, notatek integracyjnych i znanych pułapek, które powinny przetrwać więcej niż jedną sesję.

Pamięć nie jest tylko dokumentem. Jest indeksowana w lokalnej bazie danych agenta, przeszukiwalna pełnotekstowo i wstrzykiwana z powrotem do system context jako kompaktowa memory card podczas uruchamiania sesji.

Kluczowe komendy:

| Komenda | Cel |
| --- | --- |
| `/memory` | Lista lub wyszukiwanie elementów pamięci projektu. |
| `/dream` | Promowanie przydatnych wniosków z sesji do pamięci długoterminowej. |
| `/distill` | Wykrywanie powtarzalnych wzorców i proponowanie reusable skills lub workflow. |

Sekrety są redagowane przed zapisami do pamięci, aby przypadkowe credentials nie trafiły do trwałej wiedzy projektu.

## Wirtualny długi kontekst

Minerva Code nie twierdzi, że ma nieograniczony kontekst. Utrzymuje wirtualny długi kontekst przez rekonstrukcję ważnych części stanu projektu z lokalnych źródeł:

| Źródło | Rola |
| --- | --- |
| `.agent/MEMORY.md` | Trwałe fakty i konwencje. |
| `.agent/checkpoint.md` | Wznawialny stan sesji dla długiej lub przerwanej pracy. |
| Semantic code index | Retrieval chunków źródłowych oparty na FTS5 i embeddings. |
| Task graph | Trwały stan zadań dla pracy wieloetapowej. |
| System context registry | Budżetowane context cards wstrzykiwane na granicach provider-turn. |

Gdy użycie kontekstu rośnie, Minerva Code może zapisać checkpoint i odbudować kontekst pracy z tych źródeł zamiast polegać tylko na surowej rozmowie.

## Graf zadań

Graf zadań zapisuje pracę jako trwałe taski ze statusami, relacjami rodzic-dziecko, zależnościami i evidence. Jest przechowywany w lokalnej bazie danych agenta, więc planowanie i wykonanie przetrwają restart.

Zarządzaj nim przez `/task`:

```bash
/task create
/task split
/task start
/task done
/task tree
```

To przydatne, gdy feature potrzebuje więcej struktury niż płaska checklist, ale nadal ma pozostać blisko sesji agenta.

## Workflow

Workflow to pipeline zdefiniowane w YAML i przechowywane w `.agent/workflows/`. Pozwalają Minerva Code wykonać uporządkowaną sekwencję kroków przez wyspecjalizowanych agentów.

Wbudowane komendy workflow:

```bash
/compose feature
/compose tdd
/compose debug
/compose review
```

Workflow feature może analizować spec, rozbić go na task tree, stworzyć plan implementacji, uruchomić izolowanego buildera, wykonać testy, zreviewować patch i sprawdzić, czy cel został spełniony. Runy i kroki workflow są persistowane, więc przerwaną pracę można sprawdzić lub wznowić.

## Komendy

Wpisz `/` w Minerva Code, aby odkryć komendy. Ważne komendy:

| Komenda | Cel |
| --- | --- |
| `/goal` | Ustawienie lub sprawdzenie aktywnego warunku zakończenia. |
| `/task` | Zarządzanie trwałym grafem zadań. |
| `/checkpoint` | Zapis wznawialnego snapshotu sesji do `.agent/checkpoint.md`. |
| `/compose` | Uruchamianie workflow takich jak `feature`, `tdd`, `debug` i `review`. |
| `/voice` | Przełączanie trybów głosowych, takich jak `on`, `off` i `push-to-talk`. |
| `/memory` | Lista, wyszukiwanie lub usuwanie pamięci projektu. |
| `/dream` | Promowanie wniosków z sesji do trwałej pamięci. |
| `/distill` | Wyodrębnianie reusable skills lub workflow z powtarzalnych zachowań. |

## Project brain `.agent/`

`.agent/` to kanoniczny katalog konfiguracji i stanu per projekt. `.opencode/` może być nadal rozpoznawany jako deprecated fallback, ale nowe projekty Minerva Code powinny używać `.agent/`.

Ważne ścieżki:

| Ścieżka | Cel |
| --- | --- |
| `.agent/MEMORY.md` | Trwała pamięć projektu. |
| `.agent/notes.md` | Tymczasowe notatki scratchpad. |
| `.agent/goal.md` | Aktywny warunek zakończenia. |
| `.agent/checkpoint.md` | Najnowszy wznawialny checkpoint sesji. |
| `.agent/subagents/` | Profile subagentów definiowane przez projekt. |
| `.agent/workflows/` | Definicje workflow dla `/compose`. |
| `.agent/skills/` | Reusable project skills. |
| `.agent/state/` | Lokalny stan i indeksy; powinno pozostać gitignored. |

## Wkład

Jeśli chcesz pomóc, przeczytaj [CONTRIBUTING.md](./CONTRIBUTING.md) przed otwarciem pull requesta. Ponieważ Minerva Code jest forkiem, jasno zaznaczaj, czy zmiana należy do warstwy Minerva, upstream-compatible runtime OpenCode, czy granicy kompatybilności między nimi.
