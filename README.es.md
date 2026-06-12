# Minerva Code

**Un agente de programación con IA centrado en memoria, subagentes, objetivos y workflows.**

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

Minerva Code es un fork de [OpenCode](https://github.com/anomalyco/opencode) y no está afiliado al proyecto OpenCode.

---

## ¿Qué es Minerva Code?

Minerva Code es un agente de programación consciente del proyecto. Mantiene el flujo rápido de terminal de OpenCode y añade memoria duradera, objetivos explícitos, checkpoints reanudables, búsqueda semántica de código, grafos de tareas, subagentes especializados y workflows de varios pasos.

El objetivo no es solo responder a un prompt. Minerva Code está diseñado para mantenerse orientado dentro de un proyecto real de ingeniería: recordar decisiones, reconstruir contexto tras sesiones largas, dividir el trabajo en tareas, delegar en agentes enfocados y conservar suficiente estado para que futuras sesiones continúen donde terminó la anterior.

## Instalación

Minerva Code se desarrolla actualmente desde el código fuente. Los nombres de paquetes publicados y algunos binarios internos todavía pueden contener `opencode` mientras el cambio de marca está en curso.

```bash
git clone https://github.com/advaitambeskar/minerva-opencode.git
cd minerva-opencode
bun install
bun dev
```

Comandos útiles de desarrollo:

```bash
bun dev          # run the CLI/TUI from packages/opencode
bun dev:web      # run the web app
bun dev:desktop  # run the desktop app
bun lint         # run oxlint
```

Las pruebas son por paquete. Ejecútalas desde el directorio del paquete correspondiente, no desde la raíz del repositorio.

## Modos

Minerva Code incluye tres modos integrados que se pueden cambiar con `Tab`.

| Modo | Propósito |
| --- | --- |
| `build` | Modo de desarrollo predeterminado con acceso completo para editar archivos, ejecutar comandos e implementar cambios. |
| `plan` | Modo de análisis de solo lectura para explorar una base de código, diseñar cambios y revisar tradeoffs antes de editar. |
| `compose` | Modo de orquestación de workflows para ejecutar pipelines de varios pasos mediante subagentes especializados. |

## Subagentes

Los subagentes son perfiles de agente enfocados que pueden invocarse con `@name` en cualquier mensaje. Se definen mediante archivos YAML en `.agent/subagents/` y se pueden extender por proyecto.

| Subagente | Descripción |
| --- | --- |
| `@general` | Maneja búsquedas complejas y tareas de varios pasos que no encajan en un rol más específico. |
| `@researcher` | Explora código y documentación en modo de solo lectura. |
| `@planner` | Divide el trabajo en requisitos, tareas y planes de implementación. |
| `@builder` | Implementa funcionalidades o correcciones en un git worktree aislado para mantener limpio el checkout principal. |
| `@reviewer` | Revisa patches por corrección, regresiones y pruebas faltantes. |
| `@debugger` | Reproduce fallos y acota sus causas probables. |
| `@tester` | Ejecuta pruebas dirigidas y reporta evidencia de verificación. |
| `@memory-writer` | Extrae aprendizajes duraderos del proyecto y los escribe en memoria. |
| `@skill-writer` | Convierte workflows repetidos en skills de proyecto reutilizables. |

Los subagentes con capacidad de escritura, como `@builder`, están pensados para trabajar en worktrees aislados. Los subagentes de solo lectura pueden ejecutarse en paralelo para acelerar la exploración.

## Memoria

Minerva Code guarda conocimiento duradero del proyecto en `.agent/MEMORY.md`. Este archivo está pensado para decisiones de arquitectura, convenciones locales, comandos importantes, notas de integración y problemas conocidos que deben sobrevivir más allá de una sesión de chat.

La memoria no es solo un documento. Se indexa en la base de datos local del agente, se puede buscar con full-text search y se reinyecta en el contexto del sistema como una memory card compacta cuando se ejecutan sesiones.

Comandos clave:

| Comando | Propósito |
| --- | --- |
| `/memory` | Listar o buscar elementos de memoria del proyecto. |
| `/dream` | Promover aprendizajes útiles de la sesión a memoria de largo plazo. |
| `/distill` | Detectar patrones repetidos y proponer skills o workflows reutilizables. |

Los secretos se redactan antes de escribir memoria para que credenciales accidentales no queden conservadas en el conocimiento duradero del proyecto.

## Contexto largo virtual

Minerva Code no afirma tener contexto ilimitado. Mantiene contexto largo virtual reconstruyendo las partes importantes del estado del proyecto a partir de fuentes locales:

| Fuente | Rol |
| --- | --- |
| `.agent/MEMORY.md` | Hechos y convenciones duraderas. |
| `.agent/checkpoint.md` | Estado de sesión reanudable para trabajos largos o interrumpidos. |
| Semantic code index | Recuperación sobre chunks de código fuente con FTS5 y embeddings. |
| Task graph | Estado duradero de tareas para trabajo de varios pasos. |
| System context registry | Context cards con presupuesto inyectadas en límites de provider-turn. |

Cuando el uso de contexto crece, Minerva Code puede escribir un checkpoint y reconstruir el contexto de trabajo desde estas fuentes en lugar de depender solo de la conversación bruta.

## Grafo de tareas

El grafo de tareas registra el trabajo como tareas duraderas con estados, relaciones padre-hijo, dependencias y evidencia. Se almacena en la base de datos local del agente para que la planificación y ejecución sobrevivan reinicios.

Usa `/task` para gestionarlo:

```bash
/task create
/task split
/task start
/task done
/task tree
```

Esto es útil cuando una funcionalidad necesita más estructura que una checklist plana, pero debe permanecer cerca de la sesión del agente.

## Workflows

Los workflows son pipelines definidos en YAML y guardados en `.agent/workflows/`. Permiten que Minerva Code ejecute una secuencia estructurada de pasos mediante agentes especializados.

Comandos de workflow integrados:

```bash
/compose feature
/compose tdd
/compose debug
/compose review
```

Un workflow de feature puede analizar una spec, dividirla en un árbol de tareas, crear un plan de implementación, ejecutar un builder aislado, correr pruebas, revisar el patch y verificar si el objetivo quedó satisfecho. Los runs y pasos de workflow se persisten para que el trabajo interrumpido pueda inspeccionarse o reanudarse.

## Comandos

Escribe `/` dentro de Minerva Code para descubrir comandos. Comandos importantes:

| Comando | Propósito |
| --- | --- |
| `/goal` | Definir o revisar la condición activa de finalización. |
| `/task` | Gestionar el grafo de tareas duradero. |
| `/checkpoint` | Guardar un snapshot de sesión reanudable en `.agent/checkpoint.md`. |
| `/compose` | Ejecutar workflows como `feature`, `tdd`, `debug` y `review`. |
| `/voice` | Cambiar modos de entrada de voz como `on`, `off` y `push-to-talk`. |
| `/memory` | Listar, buscar u olvidar memoria del proyecto. |
| `/dream` | Promover aprendizajes de sesión a memoria duradera. |
| `/distill` | Extraer skills o workflows reutilizables de comportamientos repetidos. |

## El cerebro de proyecto `.agent/`

`.agent/` es el directorio canónico de configuración y estado por proyecto. `.opencode/` aún puede reconocerse como fallback obsoleto, pero los nuevos proyectos de Minerva Code deberían usar `.agent/`.

Rutas importantes:

| Ruta | Propósito |
| --- | --- |
| `.agent/MEMORY.md` | Memoria duradera del proyecto. |
| `.agent/notes.md` | Notas temporales tipo scratchpad. |
| `.agent/goal.md` | Condición activa de finalización. |
| `.agent/checkpoint.md` | Último checkpoint de sesión reanudable. |
| `.agent/subagents/` | Perfiles de subagentes definidos por el proyecto. |
| `.agent/workflows/` | Definiciones de workflow para `/compose`. |
| `.agent/skills/` | Skills de proyecto reutilizables. |
| `.agent/state/` | Estado local e índices; debe permanecer gitignored. |

## Contribuir

Si quieres contribuir, lee [CONTRIBUTING.md](./CONTRIBUTING.md) antes de abrir una pull request. Como Minerva Code es un fork, deja claro si los cambios pertenecen a la capa Minerva, al runtime OpenCode compatible con upstream o a la frontera de compatibilidad entre ambos.
