---
name: cross-agent-coordination
description: "تنسيق الوكلاء المتعددين على نفس المستودع: قفل مهمة، سجل موحد، وبوابة رفع آمنة (guard) قبل أي push — تمنع التضارب والتكرار بين Antigravity وHermes وغيرهم."
---

# Cross-Agent Coordination (تنسيق الوكلاء المتعددين)

> المستودع مشترك: أكثر من إيجينت (Antigravity + Hermes + غيرهم) يشتغل على نفس الـ working tree، وأكثر من جهاز يرفع إلى `origin` (shroukmagdi74-source/https-github.com-shroukmagdi74-source-maxperformance15-actions). هذه المهارة تُبقي الجميع منسقين.

## القواعد الإلزامية

1. **قبل أي تاسك**: `python scripts/agent-coord/coord.py status`
2. **قبل أول تعديل ملفات**: خُد القفل —
   `python scripts/agent-coord/coord.py claim --agent <name> --task "<task>" [--scope "..."] [--ttl 90]`
   - لو مرفوض (قفل نشط لإيجينت آخر): **لا تبدأ بالتوازي** — انتظر أو بلّغ المستخدم.
3. **الرفع فقط عبر البوابة** (تشمل الرفع التلقائي بعد التاسك):
   `python scripts/agent-coord/coord.py guard --agent <name> --push`
   - `guard` = fetch + pull --rebase + push مع retries. بديل آمن عن `git push` المباشر.
   - مرفوض؟ تُرفض فقط عند وجود قفل نشط لإيجينت آخر أو تعارض — **ممنوع force push نهائيًا**.
4. **بعد إنهاء التاسك**: `python scripts/agent-coord/coord.py release --agent <name> --commit <hash> --note "<summary>"`
5. **للتاسكات الطويلة**: `heartbeat` دوري أو `--ttl` أكبر (افتراضي 90 دقيقة؛ بعدها القفل يُعتبر stale وقابل للاسترداد بـ `--reclaim`).

## الأسماء الثابتة
- `hermes-agent` → Hermes
- `antigravity` → Antigravity IDE Agent

## الحالة والمرجع الكامل
- الحالة: `~/.agent-coordination/` (أقفال + `log.jsonl`) — محلية للجهاز، خارج الريبو.
- proof/لوج: `python scripts/agent-coord/coord.py log -n 20`
- البروتوكول الكامل + سيناريوهات التعارض: `docs/agent-coordination.md`
- pre-push hook محلي: `python scripts/agent-coord/coord.py install-hooks` (مرة واحدة لكل clone)
