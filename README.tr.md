# Minerva Code

**Bellek öncelikli, subagent'lar, hedefler ve workflow'lar içeren bir AI kodlama ajanı.**

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

Minerva Code, [OpenCode](https://github.com/advaitambeskar/minerva-opencode) projesinden fork edilmiştir ve OpenCode projesiyle bağlantılı değildir.

---

## Minerva Code nedir?

Minerva Code, proje farkındalığı olan bir kodlama ajanıdır. OpenCode'un hızlı terminal workflow'unu korur; üzerine kalıcı bellek, açık hedefler, sürdürülebilir checkpoint'ler, semantik kod araması, task graph, özel subagent'lar ve çok adımlı workflow'lar ekler.

Amaç yalnızca tek bir prompt'a cevap vermek değildir. Minerva Code gerçek bir mühendislik projesinde yönünü kaybetmemek için tasarlanmıştır: kararları hatırlar, uzun oturumlardan sonra context'i yeniden kurar, işi task'lara böler, odaklanmış agent'lara delege eder ve sonraki oturumların kaldığı yerden devam edebilmesi için yeterli state saklar.

## Kurulum

Minerva Code şu anda kaynak koddan geliştirilmektedir. Rebrand süreci devam ederken yayımlanmış paket adları ve bazı dahili binary'ler hâlâ `opencode` içerebilir.

```bash
git clone https://github.com/advaitambeskar/minerva-opencode.git
cd minerva-opencode
bun install
bun dev
```

Yararlı geliştirme komutları:

```bash
bun dev          # run the CLI/TUI from packages/minerva
bun dev:web      # run the web app
bun dev:desktop  # run the desktop app
bun lint         # run oxlint
```

Testler package kapsamındadır. Repository root'tan değil, ilgili package dizininden çalıştırın.

## Modlar

Minerva Code, `Tab` ile geçiş yapılabilen üç yerleşik mod içerir.

| Mod | Amaç |
| --- | --- |
| `build` | Dosya düzenleme, komut çalıştırma ve değişiklik implement etme için varsayılan tam erişimli geliştirme modu. |
| `plan` | Codebase keşfi, değişiklik tasarımı ve düzenleme öncesi tradeoff değerlendirmesi için read-only analiz modu. |
| `compose` | Özel subagent'lar üzerinden çok adımlı pipeline'lar çalıştıran workflow orchestration modu. |

## Subagent'lar

Subagent'lar, herhangi bir mesajda `@name` ile çağrılabilen odaklı agent profilleridir. `.agent/subagents/` altındaki YAML dosyalarıyla tanımlanır ve proje bazında genişletilebilir.

| Subagent | Açıklama |
| --- | --- |
| `@general` | Daha dar bir role uymayan karmaşık aramalar ve çok adımlı görevleri yürütür. |
| `@researcher` | Kod ve dokümantasyon üzerinde read-only keşif yapar. |
| `@planner` | İşi gereksinimlere, task'lara ve implementasyon planlarına böler. |
| `@builder` | Ana checkout temiz kalsın diye özellikleri veya fix'leri izole bir git worktree içinde implement eder. |
| `@reviewer` | Patch'leri doğruluk, regresyonlar ve eksik testler açısından review eder. |
| `@debugger` | Hataları yeniden üretir ve olası nedenleri daraltır. |
| `@tester` | Hedefli testleri çalıştırır ve doğrulama evidence'ı raporlar. |
| `@memory-writer` | Kalıcı proje öğrenimlerini çıkarır ve belleğe yazar. |
| `@skill-writer` | Tekrarlanan workflow'ları yeniden kullanılabilir project skill'lere dönüştürür. |

`@builder` gibi yazma yetkili subagent'lar izole worktree'lerde çalışacak şekilde tasarlanmıştır. Read-only subagent'lar daha hızlı keşif için paralel çalıştırılabilir.

## Bellek

Minerva Code kalıcı proje bilgisini `.agent/MEMORY.md` içinde tutar. Bu dosya mimari kararlar, yerel konvansiyonlar, önemli komutlar, entegrasyon notları ve tek bir chat oturumundan sonra da kalması gereken bilinen tuzaklar içindir.

Bellek yalnızca bir belge değildir. Yerel agent database'e indexlenir, full-text search ile aranabilir ve oturumlar çalışırken kompakt bir memory card olarak system context'e yeniden enjekte edilir.

Temel komutlar:

| Komut | Amaç |
| --- | --- |
| `/memory` | Proje belleği öğelerini listelemek veya aramak. |
| `/dream` | Faydalı session öğrenimlerini long-term memory'ye taşımak. |
| `/distill` | Tekrarlanan pattern'leri tespit edip reusable skills veya workflows önermek. |

Secrets, bellek yazımlarından önce redact edilir; böylece yanlışlıkla gelen credentials kalıcı proje bilgisine kaydedilmez.

## Sanal uzun context

Minerva Code sınırsız context iddiasında bulunmaz. Önemli proje state parçalarını yerel kaynaklardan yeniden kurarak sanal uzun context sağlar:

| Kaynak | Rol |
| --- | --- |
| `.agent/MEMORY.md` | Kalıcı bilgiler ve konvansiyonlar. |
| `.agent/checkpoint.md` | Uzun veya kesintiye uğramış işler için sürdürülebilir session state. |
| Semantic code index | FTS5 ve embeddings ile source chunk retrieval. |
| Task graph | Çok adımlı çalışma için kalıcı task state. |
| System context registry | Provider-turn sınırlarında enjekte edilen bütçeli context cards. |

Context kullanımı yükseldiğinde Minerva Code checkpoint yazabilir ve çalışma context'ini yalnızca ham konuşmaya dayanmak yerine bu kaynaklardan yeniden oluşturabilir.

## Task Graph

Task graph işi statü, parent-child relationships, dependencies ve evidence içeren kalıcı task'lar olarak kaydeder. Yerel agent database'de saklanır; böylece planlama ve yürütme restart'lardan sonra da korunur.

`/task` ile yönetin:

```bash
/task create
/task split
/task start
/task done
/task tree
```

Bir feature düz bir checklist'ten daha fazla yapı gerektiriyor ama agent oturumuna yakın kalmalıysa faydalıdır.

## Workflow'lar

Workflow'lar `.agent/workflows/` içinde saklanan YAML-defined pipeline'lardır. Minerva Code'un özel agent'lar aracılığıyla yapılandırılmış bir step dizisi çalıştırmasını sağlar.

Yerleşik workflow komutları:

```bash
/compose feature
/compose tdd
/compose debug
/compose review
```

Bir feature workflow'u spec analiz edebilir, task tree'ye bölebilir, implementasyon planı oluşturabilir, isolated builder çalıştırabilir, testleri koşturabilir, patch'i review edebilir ve goal'un karşılanıp karşılanmadığını doğrulayabilir. Workflow run'ları ve step'leri persist edilir; böylece kesilen işler incelenebilir veya sürdürülebilir.

## Komutlar

Komutları görmek için Minerva Code içinde `/` yazın. Önemli komutlar:

| Komut | Amaç |
| --- | --- |
| `/goal` | Aktif durma koşulunu ayarlamak veya gözden geçirmek. |
| `/task` | Kalıcı task graph'ı yönetmek. |
| `/checkpoint` | Sürdürülebilir session snapshot'ını `.agent/checkpoint.md` içine kaydetmek. |
| `/compose` | `feature`, `tdd`, `debug` ve `review` gibi workflow'ları çalıştırmak. |
| `/voice` | `on`, `off` ve `push-to-talk` gibi voice input modlarını değiştirmek. |
| `/memory` | Proje belleğini listelemek, aramak veya unutmak. |
| `/dream` | Session öğrenimlerini kalıcı belleğe taşımak. |
| `/distill` | Tekrarlanan davranışlardan reusable skills veya workflows çıkarmak. |

## `.agent/` Project Brain

`.agent/`, proje başına kanonik konfigürasyon ve state dizinidir. `.opencode/` hâlâ deprecated fallback olarak tanınabilir, ancak yeni Minerva Code projeleri `.agent/` kullanmalıdır.

Önemli yollar:

| Yol | Amaç |
| --- | --- |
| `.agent/MEMORY.md` | Kalıcı proje belleği. |
| `.agent/notes.md` | Geçici scratchpad notları. |
| `.agent/goal.md` | Aktif durma koşulu. |
| `.agent/checkpoint.md` | En son sürdürülebilir session checkpoint. |
| `.agent/subagents/` | Proje tanımlı subagent profilleri. |
| `.agent/workflows/` | `/compose` için workflow tanımları. |
| `.agent/skills/` | Yeniden kullanılabilir project skills. |
| `.agent/state/` | Yerel state ve index'ler; gitignored kalmalıdır. |

## Katkı

Katkı yapmak istiyorsanız pull request açmadan önce [CONTRIBUTING.md](./CONTRIBUTING.md) dosyasını okuyun. Minerva Code bir fork olduğu için değişikliklerin Minerva layer'a mı, upstream-compatible OpenCode runtime'a mı yoksa ikisi arasındaki compatibility boundary'ye mi ait olduğunu açıkça belirtin.
