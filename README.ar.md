# Minerva Code

**وكيل برمجة يعمل بالذكاء الاصطناعي ويركز على الذاكرة، مع subagents وأهداف وworkflows.**

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

Minerva Code هو fork من [OpenCode](https://github.com/advaitambeskar/minerva-opencode)، وليس تابعًا لمشروع OpenCode.

---

## ما هو Minerva Code؟

Minerva Code هو وكيل برمجة يفهم سياق المشروع. يحتفظ بتجربة الطرفية السريعة من OpenCode، ثم يضيف ذاكرة دائمة، وأهدافًا صريحة، وcheckpoints قابلة للاستئناف، وبحثًا دلاليًا في الكود، وtask graph، وsubagents متخصصة، وworkflows متعددة الخطوات.

الهدف ليس مجرد الرد على prompt واحد. صُمم Minerva Code ليبقى موجهًا داخل مشروع هندسي حقيقي: يتذكر القرارات، يعيد بناء السياق بعد الجلسات الطويلة، يقسم العمل إلى tasks، يفوض العمل إلى agents مركزة، ويحفظ حالة كافية كي تتمكن الجلسات المستقبلية من المتابعة من حيث توقفت السابقة.

## التثبيت

يتم تطوير Minerva Code حاليًا من المصدر. قد تظل أسماء الحزم المنشورة وبعض الملفات التنفيذية الداخلية تحتوي على `opencode` أثناء استمرار إعادة التسمية.

```bash
git clone https://github.com/advaitambeskar/minerva-opencode.git
cd minerva-opencode
bun install
bun dev
```

أوامر تطوير مفيدة:

```bash
bun dev          # run the CLI/TUI from packages/minerva
bun dev:web      # run the web app
bun dev:desktop  # run the desktop app
bun lint         # run oxlint
```

الاختبارات scoped حسب package. شغّلها من دليل package المناسب، وليس من جذر المستودع.

## الأوضاع

يتضمن Minerva Code ثلاثة أوضاع مدمجة يمكن تبديلها باستخدام `Tab`.

| الوضع | الغرض |
| --- | --- |
| `build` | وضع التطوير الافتراضي بصلاحيات كاملة لتحرير الملفات وتشغيل الأوامر وتنفيذ التغييرات. |
| `plan` | وضع تحليل للقراءة فقط لاستكشاف codebase وتصميم التغيير ومراجعة tradeoffs قبل التحرير. |
| `compose` | وضع orchestration للـ workflows لتشغيل pipelines متعددة الخطوات عبر subagents متخصصة. |

## Subagents

الـ subagents هي ملفات تعريف agents مركزة يمكن استدعاؤها باستخدام `@name` في أي رسالة. تُعرّف عبر ملفات YAML داخل `.agent/subagents/` ويمكن توسيعها لكل مشروع.

| Subagent | الوصف |
| --- | --- |
| `@general` | يتعامل مع عمليات البحث المعقدة والمهام متعددة الخطوات التي لا تناسب دورًا أضيق. |
| `@researcher` | يستكشف الكود والوثائق في وضع القراءة فقط. |
| `@planner` | يقسم العمل إلى متطلبات وtasks وخطط تنفيذ. |
| `@builder` | ينفذ الميزات أو الإصلاحات داخل git worktree معزول كي يبقى checkout الرئيسي نظيفًا. |
| `@reviewer` | يراجع patches للتحقق من الصحة والانحدارات والاختبارات الناقصة. |
| `@debugger` | يعيد إنتاج الأعطال ويضيق نطاق الأسباب المحتملة. |
| `@tester` | يشغل اختبارات موجهة ويبلغ عن أدلة التحقق. |
| `@memory-writer` | يستخرج تعلم المشروع الدائم ويكتبه في الذاكرة. |
| `@skill-writer` | يحول workflows المتكررة إلى project skills قابلة لإعادة الاستخدام. |

الـ subagents القادرة على الكتابة مثل `@builder` مصممة للعمل في worktrees معزولة. ويمكن تشغيل subagents للقراءة فقط بالتوازي لتسريع الاستكشاف.

## الذاكرة

يحفظ Minerva Code معرفة المشروع الدائمة في `.agent/MEMORY.md`. هذا الملف مخصص لقرارات المعمارية، والاتفاقيات المحلية، والأوامر المهمة، وملاحظات التكامل، والمشكلات المعروفة التي يجب أن تبقى بعد جلسة دردشة واحدة.

الذاكرة ليست مجرد مستند. تتم فهرستها في قاعدة بيانات agent المحلية، ويمكن البحث فيها بنص كامل، وتُحقن مرة أخرى في system context كبطاقة memory card مضغوطة عند تشغيل الجلسات.

أوامر رئيسية:

| الأمر | الغرض |
| --- | --- |
| `/memory` | عرض أو البحث في عناصر ذاكرة المشروع. |
| `/dream` | ترقية التعلم المفيد من الجلسة إلى ذاكرة طويلة الأمد. |
| `/distill` | اكتشاف الأنماط المتكررة واقتراح skills أو workflows قابلة لإعادة الاستخدام. |

يتم تنقيح secrets قبل الكتابة إلى الذاكرة كي لا تُحفظ credentials غير مقصودة ضمن معرفة المشروع الدائمة.

## سياق طويل افتراضي

لا يدّعي Minerva Code وجود سياق غير محدود. بل يحافظ على سياق طويل افتراضي عبر إعادة بناء الأجزاء المهمة من حالة المشروع من مصادر محلية:

| المصدر | الدور |
| --- | --- |
| `.agent/MEMORY.md` | حقائق واتفاقيات دائمة. |
| `.agent/checkpoint.md` | حالة جلسة قابلة للاستئناف للعمل الطويل أو المتوقف. |
| Semantic code index | استرجاع source chunks باستخدام FTS5 وembeddings. |
| Task graph | حالة tasks دائمة للعمل متعدد الخطوات. |
| System context registry | context cards محدودة الميزانية تُحقن عند حدود provider-turn. |

عندما يرتفع استخدام السياق، يستطيع Minerva Code كتابة checkpoint وإعادة بناء سياق العمل من هذه المصادر بدل الاعتماد على المحادثة الخام وحدها.

## Task Graph

يسجل task graph العمل كـ tasks دائمة لها حالات وعلاقات parent-child واعتماديات وأدلة. يُخزن في قاعدة بيانات agent المحلية حتى تبقى الخطة والتنفيذ بعد إعادة التشغيل.

استخدم `/task` لإدارته:

```bash
/task create
/task split
/task start
/task done
/task tree
```

هذا مفيد عندما تحتاج feature إلى بنية أكثر من checklist مسطحة، لكنها يجب أن تبقى قريبة من جلسة agent.

## Workflows

الـ workflows هي pipelines معرفة بـ YAML ومخزنة في `.agent/workflows/`. تسمح لـ Minerva Code بتشغيل سلسلة منظمة من الخطوات عبر agents متخصصة.

أوامر workflow المدمجة:

```bash
/compose feature
/compose tdd
/compose debug
/compose review
```

يمكن لـ feature workflow تحليل spec، وتقسيمه إلى task tree، وإنشاء خطة تنفيذ، وتشغيل builder معزول، وتنفيذ الاختبارات، ومراجعة patch، والتحقق من تحقيق الهدف. يتم حفظ workflow runs وsteps بحيث يمكن فحص العمل المتوقف أو استئنافه.

## الأوامر

اكتب `/` داخل Minerva Code لاكتشاف الأوامر. أوامر مهمة:

| الأمر | الغرض |
| --- | --- |
| `/goal` | تعيين أو مراجعة شرط التوقف النشط. |
| `/task` | إدارة task graph الدائم. |
| `/checkpoint` | حفظ snapshot جلسة قابل للاستئناف إلى `.agent/checkpoint.md`. |
| `/compose` | تشغيل workflows مثل `feature` و`tdd` و`debug` و`review`. |
| `/voice` | تبديل أوضاع voice input مثل `on` و`off` و`push-to-talk`. |
| `/memory` | عرض أو البحث أو نسيان ذاكرة المشروع. |
| `/dream` | ترقية تعلم الجلسة إلى ذاكرة دائمة. |
| `/distill` | استخراج skills أو workflows قابلة لإعادة الاستخدام من السلوك المتكرر. |

## عقل المشروع `.agent/`

`.agent/` هو دليل التكوين والحالة القياسي لكل مشروع. قد يظل `.opencode/` معروفًا كـ deprecated fallback، لكن مشاريع Minerva Code الجديدة يجب أن تستخدم `.agent/`.

مسارات مهمة:

| المسار | الغرض |
| --- | --- |
| `.agent/MEMORY.md` | ذاكرة المشروع الدائمة. |
| `.agent/notes.md` | ملاحظات scratchpad مؤقتة. |
| `.agent/goal.md` | شرط التوقف النشط. |
| `.agent/checkpoint.md` | أحدث checkpoint جلسة قابل للاستئناف. |
| `.agent/subagents/` | ملفات تعريف subagent المعرفة في المشروع. |
| `.agent/workflows/` | تعريفات workflow لـ `/compose`. |
| `.agent/skills/` | project skills قابلة لإعادة الاستخدام. |
| `.agent/state/` | حالة وفهارس محلية؛ يجب أن تبقى gitignored. |

## المساهمة

إذا أردت المساهمة، اقرأ [CONTRIBUTING.md](./CONTRIBUTING.md) قبل فتح pull request. لأن Minerva Code هو fork، اجعل التغييرات واضحة بشأن ما إذا كانت تخص طبقة Minerva أو runtime OpenCode المتوافق مع upstream أو حد التوافق بينهما.
