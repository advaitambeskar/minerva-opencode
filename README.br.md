# Minerva Code

**Um agente de programação com IA centrado em memória, com subagentes, objetivos e workflows.**

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

Minerva Code é um fork do [OpenCode](https://github.com/anomalyco/opencode) e não é afiliado ao projeto OpenCode.

---

## O que é Minerva Code?

Minerva Code é um agente de programação consciente do projeto. Ele mantém o workflow rápido de terminal do OpenCode e adiciona memória durável, objetivos explícitos, checkpoints retomáveis, busca semântica de código, grafo de tarefas, subagentes especializados e workflows de várias etapas.

O objetivo não é apenas responder a um prompt. Minerva Code foi feito para se manter orientado em um projeto real de engenharia: lembrar decisões, reconstruir contexto depois de sessões longas, dividir trabalho em tarefas, delegar para agentes focados e preservar estado suficiente para que sessões futuras continuem de onde a anterior parou.

## Instalação

Minerva Code atualmente é desenvolvido a partir do código-fonte. Nomes de pacotes publicados e alguns binários internos ainda podem conter `opencode` enquanto o rebranding está em andamento.

```bash
git clone https://github.com/advaitambeskar/minerva-opencode.git
cd minerva-opencode
bun install
bun dev
```

Comandos úteis de desenvolvimento:

```bash
bun dev          # run the CLI/TUI from packages/opencode
bun dev:web      # run the web app
bun dev:desktop  # run the desktop app
bun lint         # run oxlint
```

Os testes são por package. Execute-os no diretório do package relevante, não na raiz do repositório.

## Modos

Minerva Code inclui três modos integrados que podem ser alternados com `Tab`.

| Modo | Finalidade |
| --- | --- |
| `build` | Modo de desenvolvimento padrão com acesso total para editar arquivos, executar comandos e implementar mudanças. |
| `plan` | Modo de análise somente leitura para explorar uma codebase, desenhar uma mudança e avaliar tradeoffs antes de editar. |
| `compose` | Modo de orquestração de workflows para executar pipelines de várias etapas por meio de subagentes especializados. |

## Subagentes

Subagentes são perfis de agente focados que podem ser invocados com `@name` em qualquer mensagem. Eles são definidos por arquivos YAML em `.agent/subagents/` e podem ser estendidos por projeto.

| Subagente | Descrição |
| --- | --- |
| `@general` | Lida com buscas complexas e tarefas de várias etapas que não cabem em um papel mais específico. |
| `@researcher` | Faz exploração somente leitura de código e documentação. |
| `@planner` | Divide trabalho em requisitos, tarefas e planos de implementação. |
| `@builder` | Implementa features ou correções em um git worktree isolado para manter o checkout principal limpo. |
| `@reviewer` | Revisa patches quanto a correção, regressões e testes ausentes. |
| `@debugger` | Reproduz falhas e reduz as causas prováveis. |
| `@tester` | Executa testes direcionados e relata evidências de verificação. |
| `@memory-writer` | Extrai aprendizados duráveis do projeto e os grava na memória. |
| `@skill-writer` | Transforma workflows repetidos em skills de projeto reutilizáveis. |

Subagentes com capacidade de escrita, como `@builder`, são destinados a trabalhar em worktrees isolados. Subagentes somente leitura podem rodar em paralelo para acelerar a exploração.

## Memória

Minerva Code mantém conhecimento durável do projeto em `.agent/MEMORY.md`. Esse arquivo é para decisões de arquitetura, convenções locais, comandos importantes, notas de integração e armadilhas conhecidas que devem sobreviver além de uma única sessão de chat.

A memória não é apenas um documento. Ela é indexada no banco de dados local do agente, pode ser pesquisada com full-text search e é reinjetada no system context como um memory card compacto quando as sessões rodam.

Comandos principais:

| Comando | Finalidade |
| --- | --- |
| `/memory` | Listar ou pesquisar itens de memória do projeto. |
| `/dream` | Promover aprendizados úteis da sessão para memória de longo prazo. |
| `/distill` | Detectar padrões repetidos e propor skills ou workflows reutilizáveis. |

Secrets são redigidos antes de gravações na memória para que credenciais acidentais não sejam preservadas no conhecimento durável do projeto.

## Contexto longo virtual

Minerva Code não afirma ter contexto ilimitado. Ele mantém contexto longo virtual reconstruindo as partes importantes do estado do projeto a partir de fontes locais:

| Fonte | Papel |
| --- | --- |
| `.agent/MEMORY.md` | Fatos e convenções duráveis. |
| `.agent/checkpoint.md` | Estado de sessão retomável para trabalho longo ou interrompido. |
| Semantic code index | Retrieval em chunks de código-fonte com FTS5 e embeddings. |
| Task graph | Estado durável de tarefas para trabalho de várias etapas. |
| System context registry | Context cards com orçamento injetados em fronteiras de provider-turn. |

Quando o uso de contexto cresce, Minerva Code pode gravar um checkpoint e reconstruir o contexto de trabalho a partir dessas fontes em vez de depender apenas da conversa bruta.

## Grafo de tarefas

O grafo de tarefas registra o trabalho como tarefas duráveis com status, relações pai-filho, dependências e evidências. Ele fica no banco de dados local do agente, então planejamento e execução sobrevivem a reinícios.

Use `/task` para gerenciá-lo:

```bash
/task create
/task split
/task start
/task done
/task tree
```

Isso é útil quando uma feature precisa de mais estrutura do que uma checklist plana, mas deve permanecer perto da sessão do agente.

## Workflows

Workflows são pipelines definidos em YAML e armazenados em `.agent/workflows/`. Eles permitem que Minerva Code execute uma sequência estruturada de etapas por agentes especializados.

Comandos de workflow integrados:

```bash
/compose feature
/compose tdd
/compose debug
/compose review
```

Um workflow de feature pode analisar uma spec, dividi-la em uma task tree, criar um plano de implementação, rodar um builder isolado, executar testes, revisar o patch e verificar se o objetivo foi satisfeito. Runs e steps de workflow são persistidos para que trabalho interrompido possa ser inspecionado ou retomado.

## Comandos

Digite `/` no Minerva Code para descobrir comandos. Comandos importantes:

| Comando | Finalidade |
| --- | --- |
| `/goal` | Definir ou revisar a condição ativa de parada. |
| `/task` | Gerenciar o grafo de tarefas durável. |
| `/checkpoint` | Salvar um snapshot de sessão retomável em `.agent/checkpoint.md`. |
| `/compose` | Executar workflows como `feature`, `tdd`, `debug` e `review`. |
| `/voice` | Alternar modos de entrada por voz como `on`, `off` e `push-to-talk`. |
| `/memory` | Listar, pesquisar ou esquecer memória do projeto. |
| `/dream` | Promover aprendizados da sessão para memória durável. |
| `/distill` | Extrair skills ou workflows reutilizáveis a partir de comportamento repetido. |

## O cérebro do projeto `.agent/`

`.agent/` é o diretório canônico de configuração e estado por projeto. `.opencode/` ainda pode ser reconhecido como fallback obsoleto, mas novos projetos Minerva Code devem usar `.agent/`.

Caminhos importantes:

| Caminho | Finalidade |
| --- | --- |
| `.agent/MEMORY.md` | Memória durável do projeto. |
| `.agent/notes.md` | Notas temporárias de scratchpad. |
| `.agent/goal.md` | Condição ativa de parada. |
| `.agent/checkpoint.md` | Último checkpoint de sessão retomável. |
| `.agent/subagents/` | Perfis de subagentes definidos pelo projeto. |
| `.agent/workflows/` | Definições de workflow para `/compose`. |
| `.agent/skills/` | Skills de projeto reutilizáveis. |
| `.agent/state/` | Estado local e índices; deve permanecer gitignored. |

## Contribuindo

Se quiser contribuir, leia [CONTRIBUTING.md](./CONTRIBUTING.md) antes de abrir uma pull request. Como Minerva Code é um fork, deixe claro se a mudança pertence à camada Minerva, ao runtime OpenCode compatível com upstream ou à fronteira de compatibilidade entre os dois.
