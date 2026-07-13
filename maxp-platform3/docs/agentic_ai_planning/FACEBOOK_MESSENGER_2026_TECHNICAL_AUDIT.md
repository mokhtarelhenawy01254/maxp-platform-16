# Facebook Messenger Agent Technical Audit - 2026-05-25

## Question

هل مسار Facebook/Messenger sales/support agent في MaxP متبع معايير Agentic AI الحديثة في 2026، وهل حلول المشاكل المقترحة نفسها مبنية على تقنيات مناسبة لعام 2026؟

## Current MaxP Context

- يوجد وكيل مخصص: `backend/agents/facebook-sales-support-agent`.
- يوجد tool registry وnative tool calling داخل `backend/services/aiAgent/agentToolRegistry.js`.
- توجد guardrails مهمة: أدوات محدودة، human approval للكتابة، audit trail، budget، ومحو صياغات الأدوات الداخلية من رد العميل.
- سيناريوهات Messenger موجودة في `docs/agentic_ai_planning/FACEBOOK_MESSENGER_CUSTOMER_SCENARIOS.md`.
- فجوة مؤكدة قبل إصلاح اليوم: `inventory.check` كان يقرأ مخزون المنتج العام فقط، ولا يثبت مقاس/لون محدد.

## Fresh Sources Checked

- OpenAI Agents SDK docs: https://developers.openai.com/api/docs/guides/agents
- Model Context Protocol docs: https://modelcontextprotocol.io/docs
- MCP 2026 roadmap: https://blog.modelcontextprotocol.io/posts/2026-mcp-roadmap/
- Microsoft Agent Framework orchestration docs: https://learn.microsoft.com/en-us/agent-framework/workflows/orchestrations/
- Meta Graph API changelog: https://developers.facebook.com/docs/graph-api/changelog/
- Meta Messenger Platform docs checked via official developer URLs:
  - https://developers.facebook.com/docs/messenger-platform/send-messages
  - https://developers.facebook.com/docs/messenger-platform/webhooks

## Comparison

| 2026 pattern | MaxP status | Decision |
|---|---|---|
| Code-owned agents with tools, state, approvals, and observability | موجود جزئياً بقوة عبر CEOAgent, profile files, tool registry, telemetry, approvals | adopt-now |
| Standardized tool schema with exact handler contract | كان فيه mismatch في `inventory.check`; تم إصلاحه اليوم | adopt-now |
| Tool-grounded customer replies | موجود للمنتجات والطلبات؛ كان ناقص للمقاس/اللون وتم تحسينه | adopt-now |
| Human-in-the-loop for write actions | موجود في `order.create_draft` كمسودة موافقة | adopt-now |
| Agent communication/task lifecycle with retry/expiry | موجود جزئياً في inbox/manager، لكن Messenger live delivery ما زال يحتاج outbox أوضح | adapt-later |
| MCP-style external tool standardization | الفكرة مناسبة لاحقاً، لكن لا يلزم إدخال MCP في مسار Messenger قبل تثبيت الأدوات الداخلية | watch |
| Behavioral evals from scenario matrix | موجودة كاختبارات متفرقة؛ تحتاج runner يترجم FB/LIVE scenarios لاختبارات آلية | adapt-later |

## Recommendation

Decision: **adopt-now for scoped tool hardening**, **adapt-later for durable Messenger outbox and full scenario eval runner**.

السبب: المشكلة الحية الأقرب من سيناريوهات العملاء ليست نقص Framework جديد، بل عدم تطابق schema/tool behavior مع المطلوب. الحل الصحيح لعام 2026 هو تقوية العقد المنظم للأداة، إضافة اختبار وظيفي، ثم توسيع behavioral evals.

## Implementation Done

- `inventory.check` أصبح يدعم `productSize` و`productColor`.
- الأداة ترجع نتيجة القيد صراحة بدلاً من الاكتفاء بمخزون المنتج العام.
- تم تحديث tool registry المشترك حتى يطابق التنفيذ.
- تم إضافة regression test وظيفي.

## Remaining Gaps

- بناء runner آلي يقرأ `FB-001..FB-050` و`LIVE-001..LIVE-007` ويختبر webhook -> agent -> delivery.
- تحويل Messenger delivery إلى outbox durable واضح إذا كان مسار الإنتاج الحالي لا يضمن retry/idempotency عند فشل Facebook API.
- دعم إرسال صور المنتج عبر أداة صريحة مثل `product.media_send` أو `messenger.send_attachment` بعد مراجعة صلاحيات Meta ونافذة 24 ساعة.
- تخزين سياسات الشركة التجارية مثل الشحن، الدفع عند الاستلام، الاستبدال، وساعات العمل في قاعدة البيانات بدلاً من prompts عامة.

## Verification

- `node --check services/aiAgent/agentToolRegistry.js`
- `npx jest tests/services/agentInventoryTool.test.js --runInBand --testTimeout=30000`
- `npx jest tests/services/agentNativeTooling.test.js tests/services/facebookAiAutoReply.test.js tests/services/agentReplyNormalizer.test.js --runInBand --testTimeout=30000`
