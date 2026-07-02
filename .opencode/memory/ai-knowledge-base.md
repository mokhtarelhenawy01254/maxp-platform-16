# AI Knowledge Base — آخر التحديثات

> يتم تحديث هذا الملف دوريًا عن طريق البحث المباشر. لو المعلومات قديمة، قول "حدث قاعدة المعرفة".
> آخر تحديث: 2026-07-02

## OpenAI — 2026

### النماذج (Models)
| النموذج | API ID | Context | Output | Input/MTok | Output/MTok | Reasoning | Cutoff |
|---------|--------|---------|--------|-----------|------------|-----------|--------|
| **GPT-5.6** | (preview) | — | — | — | — | Yes | — |
| **GPT-5.5** | `gpt-5.5` | 1M | 128K | $5 | $30 | none→xhigh | Dec 2025 |
| **GPT-5.4** | `gpt-5.4` | 1M | 128K | $2.50 | $15 | none→xhigh | Aug 2025 |
| GPT-5.4 mini | `gpt-5.4-mini` | 400K | 128K | $0.75 | $4.50 | none→xhigh | Aug 2025 |
| GPT-5.4 nano | (smallest) | — | — | أرخص | أرخص | — | — |

**ملاحظات:**
- GPT-5.6 متاح لشركاء مختارين only في preview
- GPT-5.5 هو flagship الافتراضي
- كل النماذج تدعم: Functions, Web search, File search, Computer use
- Reasoning levels: `none` `low` `medium` `high` `xhigh`

### GPT-OSS
- OpenAI released open models: `gpt-oss-120b` و `gpt-oss-20b`
- متاحة على Google Cloud Vertex AI

### Agents SDK (updated Apr-Jun 2026)
- **النسخ**: Python (`>=0.14.0`) + TypeScript (`openai-agents-js`) على GitHub
- **Sandbox execution**: Native sandbox مع Manifest abstraction (LocalDir, S3, GCS, Azure, Cloudflare R2)
- **Harness**: MCP tools, skills, AGENTS.md instructions, shell tool, apply-patch tool, code mode
- **Durable execution**: snapshotting + rehydration — لو الساندبوكس وقع، الحالة بتترجع من آخر checkpoint
- **Sandbox providers**: Blaxel, Cloudflare, Daytona, E2B, Modal, Runloop, Vercel — أو custom
- **Guardrails**: Human review, approvals before risky actions
- **Orchestration**: Handoffs بين agents، subagents
- **Voice agents**: Realtime voice pipeline support
- **Secure MCP Tunnels**: ربط MCP servers خاصة من غير ما تخليها public
- **Memory**: Configurable memory في الـ harness
- **Tracing + Observability**: مدمج

### Codex Platform (OpenAI)
- **App** (desktop IDE), **CLI**, **Web**, **IDE Extension** (VS Code)
- **Sandboxing** مع auto-review
- **Subagents**, **Workflows**, **Skills** (record & replay)
- **MCP** integration, **AGENTS.md** protocol
- **Memories**: persistent (Chronicle)
- **Non-interactive mode** للأتمتة
- **Security plugin**: scans, deep scans, code review triage

## Model Context Protocol (MCP) — 2026 Roadmap (Mar 2026)

### أولويات 2026
1. **Transport Evolution** — Streamable HTTP تحسينات: horizontal scaling, stateful sessions, `.well-known` metadata
2. **Agent Communication** — Tasks primitive (SEP-1686) experimental: retry semantics, expiry policies
3. **Governance Maturation** — Working Groups, contributor ladder, SEP delegation
4. **Enterprise Readiness** — audit trails, SSO auth, gateway behavior, configuration portability

### هيكل التطوير
- Working Groups بدل release milestones
- SEPs (Spec Enhancement Proposals) للاقتراحات
- Extensions للتجارب خارج core spec
- Community discord للمناقشات

### الملاحظات
- مش هيزيدوا transports رسمية جديدة في الدورة دي
- Extensions ecosystem قيد النضج
- SEP-1932 (DPoP) و SEP-1933 (Workload Identity Federation) active proposals

## Anthropic — 2026

### النماذج (Models)
| النموذج | API ID | Context | Output | Input/MTok | Output/MTok | التاريخ |
|---------|--------|---------|--------|-----------|------------|---------|
| **Claude Fable 5** | `claude-fable-5` | 1M tokens | 128K tokens | $10 | $50 | Jun 2026 |
| Claude Mythos 5 | `claude-mythos-5` | 1M tokens | 128K tokens | $10 | $50 | Jun 2026 (invite-only) |
| **Claude Opus 4.8** | `claude-opus-4-8` | 1M tokens | 128K tokens | $5 | $25 | ~May 2026 |
| **Claude Sonnet 5** | `claude-sonnet-5` | 1M tokens | 128K tokens | $3 ($2 intro) | $15 ($10 intro) | ~2026 (intro pricing until Aug 31) |
| Claude Haiku 4.5 | `claude-haiku-4-5` | 200K tokens | 64K tokens | $1 | $5 | 2025-2026 |

### Legacy Models
| النموذج | ملاحظات |
|---------|---------|
| Opus 4.7, 4.6, 4.5 | Still available, migrate to 4.8 |
| Sonnet 4.6, 4.5 | Still available |
| Opus 4.1 | Deprecated — retiring Aug 5, 2026 |

### Claude Key Features (2026)
- **Adaptive Thinking**: Opus 4.8 and Sonnet 5 — `effort` parameter (default high) for automatic compute allocation
- **Extended Thinking**: Haiku 4.5 supports it; Fable 5 has adaptive always on (no extended thinking)
- **1M context window**: Fable 5, Opus 4.8, Sonnet 5 all support 1M tokens + 128K output
- **Batch API**: Extended output up to 300K tokens with beta header `output-300k-2026-03-24`
- **Fable 5 tokenizer**: ~30% more tokens than pre-Opus 4.7 models for same text
- **Claude Code**: agentic coding tool with shell/file/MCP tools
- **Deployment**: API, AWS Bedrock, Google Cloud Vertex AI, Microsoft Foundry

### Claude Mythos 5 / Project Glasswing
- Invitation-only defensive cybersecurity model
- Claude Mythos Preview existed before Mythos 5 GA

## Google / Gemini — 2026

### النماذج (Models)
| النموذج | النوع | ملاحظات |
|---------|-------|---------|
| **Gemini 3.1 Pro** | Pro (أقوى) | أحدث إصدار pro |
| **Gemini 3.5 Flash** | Flash (سريع) | أحدث إصدار flash |
| Gemini 3.1 Flash Image | Flash + Image | توليد وتحرير صور |
| Gemini 3.1 Flash-Lite | أخف إصدار | أرخص وأسرع |
| Gemini 3 Pro Image | Pro + Image | |
| Gemini 3 Flash | Flash | |
| Gemini 2.5 Pro | Pro | الجيل السابق |
| Gemini 2.5 Flash | Flash | |
| Gemini 2.5 Flash-Lite | Lite | |
| Gemini Omni Flash | Omni (preview) | نموذج متعدد الوسائط |
| Gemini Embedding 2 | Embedding | تضمين النصوص |

### المميزات
- **Computer Use** — تحكم في المتصفح (مشابه لـ Claude Computer Use)
- **Live API** — WebRTC/WebSocket للصوت والفيديو المباشر
- **Thinking** — reasoning مع thought signatures
- **Grounding** — Google Search, Google Maps, Vertex AI Search, RAG, Elasticsearch, Exa
- **Context Caching** — تقليل التكلفة (Context Cache)
- **Prompt Caching**: `GoogleAICacheManager` من `@google/generative-ai/server` — تقليل التكلفة 75-90%

### نماذج مفتوحة على Vertex AI
- **Gemma 4** (Google's open model)
- **DeepSeek-V3.2**, DeepSeek-R1
- **Llama 4** (Maverick, Scout)
- **Qwen 3** (Next Instruct, Next Thinking, Coder, 235B)
- **Mistral** (Medium 3, Small 3.1, Codestral 2)
- **Grok** (4.1 Fast, 4.20, 4.3)
- **Kimi K2** (Thinking)
- **GLM 5**, GLM 4.7
- GPT-OSS (120B, 20B)

### Veo — Video Generation
- **Veo 3.1** — أحدث إصدار
- Text-to-video, image-to-video, extend, insert/remove objects

### Lyria — Music Generation
- **Lyria 3** — أحدث إصدار

## Frameworks للمقارنة

| الإطار | التركيز | Notes |
|--------|---------|-------|
| OpenAI Agents SDK | Sandbox, MCP, harness, durable exec | Python أولًا |
| Microsoft Agent Framework | Orchestrations, group chat, manager-agent | .NET + Python |
| LangGraph | Checkpointing, persistence, human-in-loop | State graph |
| OpenClaw | Active memory, eligibility gates | = |
| Hermes Agent | Self-improving skills, scheduled automations | = |
| Paperclip | Control plane, org charts, budgets, approvals | = |

## مصادر GitHub — متابعة حية

| المصدر | الاستخدام | التردد |
|--------|-----------|--------|
| [GitHub AI Trending](https://github.com/trending?since=weekly) | اكتشاف frameworks وأدوات AI جديدة | أسبوعيًا |
| [GitHub Search: ai+agent](https://github.com/search?q=ai+agent&s=stars&type=Repositories) | مقارنة شعبية المشاريع مفتوحة المصدر | شهريًا |
| GitHub Releases API | متابعة إصدارات المشاريع المعروفة (OpenAI SDK, LangGraph, MCP, Hermes, Paperclip) | أسبوعيًا |
| GitHub Issues (bugs/features) | معرفة المشاكل والـ workarounds قبل ما تنشر docs | عند الحاجة |

**مزايا المتابعة:**
- تعرف بـ bugs جديدة بتأثر على الـ frameworks اللي بنستخدمها
- تشوف features جديدة قبل ما تنزل رسميًا في الـ docs
- frameworks ناشئة (زي OpenClaw, Hermes, Paperclip) أول ما تظهر على GitHub قبل أي مصدر تاني
- Issues بتظهر challenges حقيقية من الـ community وازاي اتحلت

## MaxP Internal — SDK Layer

MaxP's SDK ليس منتجًا منفصلًا، بل **طبقة تجريد داخلية** فوق Microsoft Agent Framework:

| المكون | الملف | الوظيفة |
|--------|-------|---------|
| **ToolGateway** | `apps/ai-service/src/tools/sdk_gateway.py` | يلف كل الأدوات بـ authorization, approval routing, company scoping |
| **MaxPContextProvider** | `apps/ai-service/src/context/sdk_provider.py` | Context Provider لحقن الـ profile, memory, RAG في جلسات SDK Agent |
| **PipelineWorkflowSnapshot** | `apps/ai-service/src/pipeline/sdk_workflow.py` | تشغيل مراحل الـ pipeline عبر `WorkflowBuilder` بتاع الـ framework |

**الاستخدام**: `BaseAgent._run_with_sdk_agent()` يستخدم SDK Agent للمهام الداخلية (non-customer)، ويستخدم pipeline للقنوات المباشرة (Facebook/WhatsApp).

## MaxP Internal — Agent Creation System (Premium Human-like Agents)

### هيكلية قوالب الوكلاء (Multi-File Contract)

كل agent template يتكون من 4 ملفات في `apps/backend/agents/<slug>/`:

| الملف | الوظيفة |
|-------|---------|
| `agent.json` | ميتا داتا: slug, role, allowedTools, budget, channels, guardrails, modelPolicy |
| `SOUL.md` | الشخصية البشرية: identity, voice (عامية مصرية/خليجية), 5-step sales workflow, anti-detection |
| `TOOLS.md` | تعليمات استخدام الأدوات لكل دور (red/yellow/green) |
| `AGENTS.md` | قواعد الـ handoff بين الوكلاء |

### الـ 14 Template الحاليين
`blank`, `competitor-analysis`, `customer-ceo`, `facebook-sales-support-agent`, `inventory-pricing-agent`, `manager-ceo`, `marketing-agent`, `medical-center-agent`, `order-agent`, `sales-agent`, `sales-rep-agent`, `sales-rep-v2-agent`, `sas-sales-agent`, `smart-seller-agent`, `support-agent`

### إنشاء وكيل (3 طرق)
1. **Admin API**: `POST /admin/agents/spawn` — من template + overrides
2. **Agent Spawn Tool**: `agent.spawn` tool — الـ CEO agent يقدر يخلق وكلاء جدد (يحتاج موافقة)
3. **Background Workers**: `agent_worker.py` — auto-creates agents لما يجي رسالة من Facebook/WhatsApp/Telegram

### القواعد الذهبية لمنع كشف الهوية
- ممنوع: bot, AI, system, database, algorithm, automated, إلخ
- رد "هل أنت بوت؟" — لازم يكون عفوي بشري
- أسلوب كتابة بشري (مش قوائم طويلة)
- عامية مهنية (مصرية/خليجية حسب التاجر)
- Lock Policy: Persona/Rules مغلق 🔒، Name/Icon مفتوح 🔓

### ملفات الإدارة (Management Tools)
| الملف | الوظيفة |
|-------|---------|
| `src/tools/manager_tools.py` | agent.spawn, handoff, assign_task, list, search, update_profile, run_task, read_state |
| `src/api/admin/agents.py` | REST API: spawn, list, get, update, patch status, archive, reconcile, team-map |
| `src/db/repo/agent_repo.py` | DB persistence لـ ai.agents table |
| `scripts/seed-agentic-dev.js` | Dev seed — test company + agents |
| `scripts/verify-agent-configs.js` | CI verification لملفات agent.json |

### AGENTS.md Protocol — معيار 2026 الصناعي

AGENTS.md أصبح **المعيار الفعلي** لتوجيه AI coding agents، ومستضاف تحت **Agentic AI Foundation (Linux Foundation)**.

### الإحصائيات
- **60k+ مشروع مفتوح المصدر** يستخدمه حاليًا
- مدعوم من كل الأدوات: OpenAI Codex, Claude Code, Google Jules, Cursor, VS Code, GitHub Copilot, opencode, Aider, Factory, Zed, Windsurf, Ampl, Devin, Junie, إلخ.

### البنية
- ملف `AGENTS.md` في جذر المشروع
- Nested AGENTS.md في كل package للمونوريبو — الأقرب للـ file هو اللي ياخد precedence
- OpenAI repo نفسه عنده 88 AGENTS.md file

### القياس على نظام MaxP
| معيار 2026 | MaxP | الحالة |
|-----------|-------|--------|
| AGENTS.md في الجذر | ✅ موجود في `/AGENTS.md` | مطابق |
| Nested AGENTS.md | ⬜ ممكن إضافة في `apps/ai-service/` و `apps/backend/` | فرصة تحسين |
| Auto Memory (Claude Code) | ✅ `.opencode/memory/` مع Session Init Protocol | مطابق |
| Build commands | ✅ في AGENTS.md تحت كل skill | مطابق |
| Skills / Progressive disclosure | ✅ عبر ملفات `.agents/skills/` | مطابق |

## Claude Code — Memory Patterns (2026)

### CLAUDE.md + Auto Memory
- `CLAUDE.md` — ملف في جذر المشروع (زي AGENTS.md) بيقرأه Claude Code في بداية كل session
- **Auto Memory** — Claude بيبني learnings عبر sessions أوتوماتيكيًا من غير ما المستخدم يكتب حاجة (بيتذكر build commands و debugging insights)
- Skills — `/review-pr` و `/deploy-staging` — workflows packageable

### القياس على MaxP
| Claude Code | MaxP | الحالة |
|------------|-------|--------|
| Auto Memory learns build commands | `.opencode/memory/learned-patterns.md` | أتمتة أقل لكن توثيق أكثر |
| CLAUDE.md instructions | `.opencode/AGENTS.md` | مطابق مع protocols إضافية |
| Skills | `.agents/skills/` | مطابق |
| Hooks (pre/post edit) | ⬜ غير موجود | فرصة تحسين |

### أقساط مهمة

### Agent Architecture Patterns (2025-2026)
- **MCP-first tool integration** — أغلب frameworks بتتبنى MCP كمعيار tools
- **Sandboxed execution** — فصل الـ harness عن compute (security + durability)
- **Durable agents** — checkpoint/recovery مش مجرد retry
- **AGENTS.md pattern** — تعليمات agent في ملف ماركداون في جذر المشروع
- **Skills** — progressive disclosure للـ capabilities (مش كل الأدوات محملة طول الوقت)
- **Multi-agent orchestration** — manager-agent, handoff, group chat patterns

### Model Trends (2025-2026)
- Frontier models بتقدر تدخل في "code mode" (multi-turn autonomous execution)
- Reasoning models (o-series, thinking tokens) للـ complex planning
- Model distillation — نماذج صغيرة بنفس قدرات الكبير
- caching لتقليل تكاليف الـ system prompts الكبيرة
