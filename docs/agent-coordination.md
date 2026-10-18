# تنسيق الوكلاء المتعددين على نفس المستودع (Cross-Agent Coordination)

> هذا المستودع يعمل عليه **أكثر من إيجينت في نفس الوقت** (Antigravity IDE Agent + Hermes Agent + أي أداة أخرى مثل Codex/OpenCode)، وعلى أكثر من جهاز/نسخة (clone) تدفع إلى `origin` = `shroukmagdi74-source/https-github.com-shroukmagdi74-source-maxperformance15-actions`.
> الأدلة على التعارضات السابقة موجودة في الريبو نفسه: stashes مسمّاة `wip-before-pull...`، فروع `recovery/*` (منها `recovery/pre-forcepush-...`)، وسباقات push متكررة مع طرف آخر يرفع أثناء النهار.
> الهدف من هذه المنظومة: **منع التكرار والتضارب** بين الوكلاء — قفل كتابة واحد، سجل موحد، وبوابة رفع آمنة.

## الأعمدة الثلاثة

1. **قفل كتابة واحد (Task Lock):** أي إيجينت يبدأ تاسكًا حقيقيًا على الـ working tree يأخذ القفل أولًا — إيجينت واحد يعدّل في نفس الشجرة في أي لحظة.
2. **سجل موحد (Audit Log):** كل claim / release / push يُسجَّل في لوج واحد مقروء.
3. **بوابة رفع واحدة (Guarded Push):** كل `git push` يمر عبر `guard` — تعمل `fetch` + `pull --rebase` + `push` مع إعادة محاولة تلقائية عند سباق الريموت. **force push ممنوع نهائيًا.**

## الأوامر (من جذر الريبو)

```bash
python scripts/agent-coord/coord.py status                     # القفل الحالي + الانحراف عن origin/main + آخر الأحداث
python scripts/agent-coord/coord.py claim --agent <name> --task "<مهمة>" [--scope "<ملفات>"] [--ttl 90]
python scripts/agent-coord/coord.py heartbeat --agent <name>   # للتاسكات الطويلة
python scripts/agent-coord/coord.py guard --agent <name> --push
python scripts/agent-coord/coord.py release --agent <name> --commit <hash> --note "<ملخص>"
python scripts/agent-coord/coord.py log -n 20                  # عرض السجل
python scripts/agent-coord/coord.py install-hooks              # مرة واحدة لكل clone: يثبّت pre-push hook
```

- اسم الإيجينت: ثابت وواضح — `hermes-agent` لـ Hermes، `antigravity` لـ Antigravity (أو متغير البيئة `COORD_AGENT`).
- لو `python` غير موجود استخدم `py` (ويندوز).
- للدفع المباشر من إيجينت (استثناءً وبدون `guard`): صدّر `COORD_AGENT=<name>` في الجلسة حتى يتعرّف الـ pre-push hook على هويتك ويسمح بالدفع أثناء قفلك أنت — والأفضل دائمًا الدفع عبر `guard`.

## السيناريوهات (Playbook)

| الحالة | التصرف |
|---|---|
| تاسك جديد | `status` → مفيش قفل → `claim` → نفّذ → `guard --push` عند الرفع → `release` |
| القفل محجوز بإيجينت آخر نشط | **ممنوع البدء بالتوازي.** انتظر، أو أبلغ المستخدم للتنسيق. لا تستخدم `--reclaim` إلا لو متأكد أن صاحبه مات/اتقفل من غير release |
| سباق ريموت أثناء الرفع | `guard` تعمل rebase وتعيد المحاولة تلقائيًا (3 محاولات) — مع autostash تلقائي لتغييرات الشجرة غير الملتزمة (تُحفظ ولا تُفقد عند التعارض) |
| قفل قديم (stale) | بعد انتهاء الـ TTL (افتراضي 90 دقيقة بلا heartbeat) أي إيجينت يقدر ياخده بـ `claim --reclaim` — يُسجَّل في اللوج باسم صاحبه القديم |
| تعارض rebase | قف، حل التعارض يدويًا، commit أو stash، ثم أعد المحاولة. **ممنوع force بأي شكل** |
| إيجينت آخر شغال وعايز ترفع ضروري | `guard --override "<سبب موثّق>"` — يُسجَّل بشكل بارز في اللوج. بدون سبب حقيقي = ممنوع |
| staging في شجرة مشتركة | مسارات صريحة بالاسم فقط — ممنوع `git add -A` / `git checkout .` / `git reset --hard` / `git stash` من غير قفل (خطوة واحدة عشوائية = احتمال تدمير شغل غير ملتزم لإيجينت آخر) |
| تاسك حرج (QA متعدد) | التنفيذ عند إيجينت، والتفتيش على الـ diff عند إيجينت/جلسة أخرى قبل اعتباره منتهيًا (قاعدة `Multi-Agent Parallel Task Execution` في AGENTS.md) |

## مواقع الحالة والملفات

| المكوّن | المسار | النطاق |
|---|---|---|
| الأقفال + اللوج | `~/.agent-coordination/` (`locks/*.json` + `log.jsonl`) | محلي لكل جهاز (خارج الريبو، غير مُتتبَّع) |
| السكريبت | `scripts/agent-coord/coord.py` | متتبَّع ومُصدَّر مع الريبو |
| الـ hook | `.git/hooks/pre-push` (عبر `install-hooks`) | محلي لكل clone |
| القاعدة | قسم «🔗 Cross-Agent Coordination» في `AGENTS.md` | متتبَّع — يقرأه كل الوكلاء |

## الصيانة

- أي تعديل على آليات التنسيق نفسها: عدّل `scripts/agent-coord/coord.py` + هذا الملف + قسم القاعدة في `AGENTS.md` (وملحقها المحلي `.agents/skills/cross-agent-coordination/SKILL.md`) واذكر ذلك في الـ commit message.
- الحالة (`~/.agent-coordination`) لا تُلتزم ولا تُدفع أبدًا — هي سرير محلي للتنسيق على الجهاز.
