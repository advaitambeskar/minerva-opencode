# Minerva Code

**AI coding agent แบบ memory-first พร้อม subagents, goals และ workflows**

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

Minerva Code เป็น fork จาก [OpenCode](https://github.com/anomalyco/opencode) และไม่ได้มีความเกี่ยวข้องกับโครงการ OpenCode

---

## Minerva Code คืออะไร?

Minerva Code คือ coding agent ที่เข้าใจบริบทของโปรเจกต์ มันยังคง terminal workflow ที่รวดเร็วของ OpenCode ไว้ แล้วเพิ่ม durable memory, explicit goals, resumable checkpoints, semantic code search, task graph, specialized subagents และ multi-step workflows

เป้าหมายไม่ใช่แค่ตอบ prompt หนึ่งครั้ง Minerva Code ถูกออกแบบให้รักษาทิศทางในโปรเจกต์วิศวกรรมจริง: จดจำการตัดสินใจ, สร้าง context ใหม่หลัง session ยาว, แบ่งงานเป็น tasks, มอบหมายให้ agents ที่มีหน้าที่เฉพาะ และเก็บ state พอให้ session ในอนาคตทำต่อจากจุดที่ session ก่อนหยุดไว้ได้

## การติดตั้ง

Minerva Code ตอนนี้พัฒนาจาก source โค้ด ชื่อ package ที่เผยแพร่แล้วและ binaries ภายในบางส่วนอาจยังมี `opencode` ระหว่างที่ rebrand ยังดำเนินอยู่

```bash
git clone https://github.com/advaitambeskar/minerva-opencode.git
cd minerva-opencode
bun install
bun dev
```

คำสั่ง development ที่มีประโยชน์:

```bash
bun dev          # run the CLI/TUI from packages/opencode
bun dev:web      # run the web app
bun dev:desktop  # run the desktop app
bun lint         # run oxlint
```

Tests เป็นแบบ package-scoped ให้รันจาก directory ของ package ที่เกี่ยวข้อง ไม่ใช่จาก root ของ repository

## Modes

Minerva Code มี built-in modes สามแบบที่สลับได้ด้วย `Tab`

| Mode | จุดประสงค์ |
| --- | --- |
| `build` | โหมด development แบบ full-access สำหรับแก้ไฟล์ รันคำสั่ง และ implement changes |
| `plan` | โหมดวิเคราะห์แบบ read-only สำหรับสำรวจ codebase, ออกแบบ change และตรวจ tradeoffs ก่อนแก้ไข |
| `compose` | โหมด workflow orchestration สำหรับรัน multi-step pipelines ผ่าน specialized subagents |

## Subagents

Subagents คือ agent profiles ที่โฟกัสบทบาทเฉพาะ เรียกได้ด้วย `@name` ในข้อความใดก็ได้ นิยามด้วยไฟล์ YAML ภายใต้ `.agent/subagents/` และขยายได้ต่อโปรเจกต์

| Subagent | คำอธิบาย |
| --- | --- |
| `@general` | จัดการ complex searches และ multi-step tasks ที่ไม่เข้า role แคบกว่า |
| `@researcher` | สำรวจ code และ documentation แบบ read-only |
| `@planner` | แบ่งงานเป็น requirements, tasks และ implementation plans |
| `@builder` | Implement features หรือ fixes ใน git worktree ที่แยกออกมา เพื่อให้ main checkout สะอาด |
| `@reviewer` | Review patches ด้าน correctness, regressions และ missing tests |
| `@debugger` | Reproduce failures และไล่หาสาเหตุที่เป็นไปได้ |
| `@tester` | รัน targeted tests และรายงาน verification evidence |
| `@memory-writer` | Extract project learnings ที่ควรเก็บถาวรและเขียนลง memory |
| `@skill-writer` | เปลี่ยน repeated workflows เป็น reusable project skills |

Subagents ที่เขียนไฟล์ได้อย่าง `@builder` ควรทำงานใน isolated worktrees ส่วน read-only subagents สามารถรัน parallel เพื่อสำรวจได้เร็วขึ้น

## Memory

Minerva Code เก็บ durable project knowledge ใน `.agent/MEMORY.md` ไฟล์นี้ใช้เก็บ architecture decisions, local conventions, important commands, integration notes และ known pitfalls ที่ควรอยู่ข้าม session

Memory ไม่ใช่แค่เอกสาร มันถูก index ใน local agent database, ค้นหาแบบ full-text search ได้ และถูก inject กลับเข้า system context เป็น compact memory card เมื่อ session ทำงาน

คำสั่งหลัก:

| Command | จุดประสงค์ |
| --- | --- |
| `/memory` | List หรือ search project memory items |
| `/dream` | Promote session learnings ที่มีประโยชน์ไปเป็น long-term memory |
| `/distill` | Detect repeated patterns และเสนอ reusable skills หรือ workflows |

ก่อนเขียน memory จะมี secret redaction เพื่อไม่ให้ credentials ที่หลุดมาโดยบังเอิญถูกเก็บไว้ใน durable project knowledge

## Virtual Long Context

Minerva Code ไม่ได้อ้างว่ามี unlimited context แต่รักษา virtual long context โดย reconstruct ส่วนสำคัญของ project state จาก local sources:

| Source | บทบาท |
| --- | --- |
| `.agent/MEMORY.md` | Durable facts และ conventions |
| `.agent/checkpoint.md` | Resumable session state สำหรับงานยาวหรืองานที่ถูกขัดจังหวะ |
| Semantic code index | Retrieval บน source chunks ด้วย FTS5 และ embeddings |
| Task graph | Durable task state สำหรับ multi-step work |
| System context registry | Budgeted context cards ที่ inject ที่ provider-turn boundaries |

เมื่อ context usage สูงขึ้น Minerva Code สามารถเขียน checkpoint และ rebuild working context จาก sources เหล่านี้ แทนที่จะพึ่ง raw conversation อย่างเดียว

## Task Graph

Task graph บันทึกงานเป็น durable tasks ที่มี statuses, parent-child relationships, dependencies และ evidence เก็บใน local agent database ทำให้ planning และ execution อยู่ข้าม restarts ได้

จัดการด้วย `/task`:

```bash
/task create
/task split
/task start
/task done
/task tree
```

สิ่งนี้มีประโยชน์เมื่อ feature ต้องการ structure มากกว่า flat checklist แต่ยังควรอยู่ใกล้ agent session

## Workflows

Workflows คือ YAML-defined pipelines ที่เก็บใน `.agent/workflows/` ช่วยให้ Minerva Code รัน structured sequence of steps ผ่าน specialized agents

Built-in workflow commands:

```bash
/compose feature
/compose tdd
/compose debug
/compose review
```

Feature workflow สามารถวิเคราะห์ spec, แบ่งเป็น task tree, สร้าง implementation plan, รัน isolated builder, execute tests, review patch และ verify ว่า goal สำเร็จหรือไม่ Workflow runs และ steps ถูก persist จึง inspect หรือ resume งานที่ถูกขัดจังหวะได้

## Commands

พิมพ์ `/` ใน Minerva Code เพื่อดู commands สำคัญ:

| Command | จุดประสงค์ |
| --- | --- |
| `/goal` | Set หรือ review active stopping condition |
| `/task` | Manage durable task graph |
| `/checkpoint` | Save resumable session snapshot ไปที่ `.agent/checkpoint.md` |
| `/compose` | Run workflows เช่น `feature`, `tdd`, `debug` และ `review` |
| `/voice` | Toggle voice input modes เช่น `on`, `off` และ `push-to-talk` |
| `/memory` | List, search หรือ forget project memory |
| `/dream` | Promote session learnings ไปเป็น durable memory |
| `/distill` | Extract reusable skills หรือ workflows จาก repeated behavior |

## `.agent/` Project Brain

`.agent/` คือ canonical per-project configuration และ state directory ส่วน `.opencode/` อาจยังถูก recognize เป็น deprecated fallback แต่โปรเจกต์ Minerva Code ใหม่ควรใช้ `.agent/`

Paths สำคัญ:

| Path | จุดประสงค์ |
| --- | --- |
| `.agent/MEMORY.md` | Durable project memory |
| `.agent/notes.md` | Temporary scratchpad notes |
| `.agent/goal.md` | Active stopping condition |
| `.agent/checkpoint.md` | Latest resumable session checkpoint |
| `.agent/subagents/` | Project-defined subagent profiles |
| `.agent/workflows/` | Workflow definitions สำหรับ `/compose` |
| `.agent/skills/` | Reusable project skills |
| `.agent/state/` | Local state และ indexes; ควรคงเป็น gitignored |

## การมีส่วนร่วม

ถ้าต้องการ contribute โปรดอ่าน [CONTRIBUTING.md](./CONTRIBUTING.md) ก่อนเปิด pull request เนื่องจาก Minerva Code เป็น fork ควรระบุให้ชัดว่า change อยู่ใน Minerva layer, upstream-compatible OpenCode runtime หรือ compatibility boundary ระหว่างสองส่วนนี้
