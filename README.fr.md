# Minerva Code

**Un agent de codage IA centré sur la mémoire, avec subagents, objectifs et workflows.**

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

Minerva Code est un fork de [OpenCode](https://github.com/anomalyco/opencode) et n'est pas affilié au projet OpenCode.

---

## Qu'est-ce que Minerva Code ?

Minerva Code est un agent de codage conscient du projet. Il conserve le workflow terminal rapide d'OpenCode, puis y ajoute une mémoire durable, des objectifs explicites, des checkpoints reprenables, une recherche sémantique dans le code, des graphes de tâches, des subagents spécialisés et des workflows en plusieurs étapes.

Le but n'est pas seulement de répondre à un prompt. Minerva Code est conçu pour rester orienté dans un vrai projet d'ingénierie : mémoriser les décisions, reconstruire le contexte après de longues sessions, découper le travail en tâches, déléguer à des agents ciblés et conserver assez d'état pour que les sessions futures reprennent là où la précédente s'est arrêtée.

## Installation

Minerva Code est actuellement développé depuis les sources. Les noms de packages publiés et certains binaires internes peuvent encore contenir `opencode` pendant la transition de marque.

```bash
git clone https://github.com/advaitambeskar/minerva-opencode.git
cd minerva-opencode
bun install
bun dev
```

Commandes de développement utiles :

```bash
bun dev          # run the CLI/TUI from packages/opencode
bun dev:web      # run the web app
bun dev:desktop  # run the desktop app
bun lint         # run oxlint
```

Les tests sont limités aux packages. Lance-les depuis le dossier du package concerné, pas depuis la racine du dépôt.

## Modes

Minerva Code inclut trois modes intégrés qui peuvent être changés avec `Tab`.

| Mode | Objectif |
| --- | --- |
| `build` | Mode de développement par défaut avec accès complet pour modifier les fichiers, exécuter des commandes et implémenter des changements. |
| `plan` | Mode d'analyse en lecture seule pour explorer une base de code, concevoir un changement et évaluer les compromis avant édition. |
| `compose` | Mode d'orchestration de workflows pour exécuter des pipelines en plusieurs étapes via des subagents spécialisés. |

## Subagents

Les subagents sont des profils d'agent ciblés qui peuvent être appelés avec `@name` dans n'importe quel message. Ils sont définis par des fichiers YAML dans `.agent/subagents/` et peuvent être étendus par projet.

| Subagent | Description |
| --- | --- |
| `@general` | Gère les recherches complexes et les tâches en plusieurs étapes qui ne correspondent pas à un rôle plus étroit. |
| `@researcher` | Effectue une exploration du code et de la documentation en lecture seule. |
| `@planner` | Découpe le travail en exigences, tâches et plans d'implémentation. |
| `@builder` | Implémente des fonctionnalités ou des correctifs dans un git worktree isolé afin de garder le checkout principal propre. |
| `@reviewer` | Relit les patches pour vérifier la correction, les régressions et les tests manquants. |
| `@debugger` | Reproduit les échecs et réduit les causes probables. |
| `@tester` | Exécute des tests ciblés et rapporte les preuves de vérification. |
| `@memory-writer` | Extrait les apprentissages durables du projet et les écrit en mémoire. |
| `@skill-writer` | Transforme les workflows répétés en skills de projet réutilisables. |

Les subagents capables d'écrire, comme `@builder`, sont destinés à travailler dans des worktrees isolés. Les subagents en lecture seule peuvent être lancés en parallèle pour accélérer l'exploration.

## Mémoire

Minerva Code conserve les connaissances durables du projet dans `.agent/MEMORY.md`. Ce fichier sert à stocker les décisions d'architecture, conventions locales, commandes importantes, notes d'intégration et pièges connus qui doivent survivre au-delà d'une seule session de chat.

La mémoire n'est pas seulement un document. Elle est indexée dans la base de données locale de l'agent, peut être recherchée en plein texte, puis réinjectée dans le contexte système sous forme de memory card compacte lors de l'exécution des sessions.

Commandes clés :

| Commande | Objectif |
| --- | --- |
| `/memory` | Lister ou rechercher les éléments de mémoire du projet. |
| `/dream` | Promouvoir les apprentissages utiles de la session vers la mémoire longue durée. |
| `/distill` | Détecter les motifs répétés et proposer des skills ou workflows réutilisables. |

Les secrets sont masqués avant les écritures en mémoire afin que des identifiants accidentels ne soient pas conservés dans les connaissances durables du projet.

## Contexte long virtuel

Minerva Code ne revendique pas un contexte illimité. Il maintient un contexte long virtuel en reconstruisant les parties importantes de l'état du projet depuis des sources locales :

| Source | Rôle |
| --- | --- |
| `.agent/MEMORY.md` | Faits et conventions durables. |
| `.agent/checkpoint.md` | État de session reprenable pour les travaux longs ou interrompus. |
| Semantic code index | Recherche sur des chunks de source via FTS5 et embeddings. |
| Task graph | État durable des tâches pour le travail en plusieurs étapes. |
| System context registry | Context cards budgétées injectées aux frontières des provider turns. |

Quand l'utilisation du contexte devient élevée, Minerva Code peut écrire un checkpoint et reconstruire le contexte de travail depuis ces sources au lieu de dépendre seulement de la conversation brute.

## Graphe de tâches

Le graphe de tâches enregistre le travail sous forme de tâches durables avec statuts, relations parent-enfant, dépendances et preuves. Il est stocké dans la base de données locale de l'agent afin que planification et exécution survivent aux redémarrages.

Utilise `/task` pour le gérer :

```bash
/task create
/task split
/task start
/task done
/task tree
```

C'est utile lorsqu'une fonctionnalité a besoin de plus de structure qu'une simple checklist tout en restant proche de la session agent.

## Workflows

Les workflows sont des pipelines YAML stockés dans `.agent/workflows/`. Ils permettent à Minerva Code d'exécuter une séquence structurée d'étapes via des agents spécialisés.

Commandes de workflow intégrées :

```bash
/compose feature
/compose tdd
/compose debug
/compose review
```

Un workflow feature peut analyser une spec, la découper en arbre de tâches, créer un plan d'implémentation, lancer un builder isolé, exécuter les tests, relire le patch et vérifier si l'objectif est satisfait. Les runs et étapes de workflow sont persistés afin que le travail interrompu puisse être inspecté ou repris.

## Commandes

Tape `/` dans Minerva Code pour découvrir les commandes. Commandes importantes :

| Commande | Objectif |
| --- | --- |
| `/goal` | Définir ou consulter la condition d'arrêt active. |
| `/task` | Gérer le graphe de tâches durable. |
| `/checkpoint` | Enregistrer un snapshot de session reprenable dans `.agent/checkpoint.md`. |
| `/compose` | Exécuter des workflows comme `feature`, `tdd`, `debug` et `review`. |
| `/voice` | Basculer les modes d'entrée vocale comme `on`, `off` et `push-to-talk`. |
| `/memory` | Lister, rechercher ou oublier la mémoire du projet. |
| `/dream` | Promouvoir les apprentissages de session vers la mémoire durable. |
| `/distill` | Extraire des skills ou workflows réutilisables à partir de comportements répétés. |

## Le cerveau de projet `.agent/`

`.agent/` est le répertoire canonique de configuration et d'état par projet. `.opencode/` peut encore être reconnu comme fallback déprécié, mais les nouveaux projets Minerva Code devraient utiliser `.agent/`.

Chemins importants :

| Chemin | Objectif |
| --- | --- |
| `.agent/MEMORY.md` | Mémoire durable du projet. |
| `.agent/notes.md` | Notes temporaires de scratchpad. |
| `.agent/goal.md` | Condition d'arrêt active. |
| `.agent/checkpoint.md` | Dernier checkpoint de session reprenable. |
| `.agent/subagents/` | Profils de subagents définis par le projet. |
| `.agent/workflows/` | Définitions de workflow pour `/compose`. |
| `.agent/skills/` | Skills de projet réutilisables. |
| `.agent/state/` | État local et index ; doit rester gitignored. |

## Contribuer

Si tu veux contribuer, lis [CONTRIBUTING.md](./CONTRIBUTING.md) avant d'ouvrir une pull request. Comme Minerva Code est un fork, les changements doivent indiquer clairement s'ils appartiennent à la couche Minerva, au runtime OpenCode compatible upstream, ou à la frontière de compatibilité entre les deux.
