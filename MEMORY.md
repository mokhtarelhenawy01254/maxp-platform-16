# MEMORY.md - Long-Term Curated Memory

## Deployment & Repository Directives

- **Mandatory Target Repo for Post-Task Auto-Push:**
  - **URL:** `https://github.com/shroukmagdi74-source/maxperformance14`
  - **Remote Name:** `origin`
  - **Strict Post-Task Rule:** After completing **ANY** task, automatically commit all changes with a clear, descriptive commit message explaining what was updated, and push directly to `origin` (`git push origin main`).
  - **Commit Naming:** Always write explicit commit messages (e.g., `feat(...)`, `fix(...)`, `docs(...)`) so the user can easily trace every update.
  - **Exclusion:** Under no circumstances should updates be pushed to any old/deprecated fork or mirror — `origin` pointing to the URL above is the **only** remote in the local config, and every other legacy remote has been removed. If any instruction or note references a different repository, it is outdated: ignore it and push to `origin` only.
- **Cross-Agent Coordination (إلزامي — أكثر من إيجينت على نفس المستودع):** هذا الـ workspace مشترك بين أكثر من إيجينت (Antigravity + Hermes + غيره). قبل أي تاسك: `python scripts/agent-coord/coord.py status`، ثم `claim --agent <name> --task "..."` قبل أول تعديل؛ والرفع **فقط** عبر `python scripts/agent-coord/coord.py guard --agent <name> --push` (fetch + pull --rebase + retries — بديلاً عن أي `git push` مباشر)؛ وبعد الإنهاء `release --commit <hash> --note "..."`. لو القفل محجوز بإيجينت آخر نشط: لا تعمل بالتوازي — قف ونسّق. الحالة: `~/.agent-coordination/` — التفاصيل: `docs/agent-coordination.md`.

## 🧠 Core AI Agent Architecture Standard (`maxp-agent-builder`)

- **Permanent Single Source of Truth:**
  - All AI agents, templates, contracts, and agent-facing UI screens MUST strictly follow `.agents/skills/maxp-agent-builder/SKILL.md`.
- **Mandatory Architectural Rules:**
  1. **Cloud Database-Backed Sessions (Ban pure `localStorage`):** Agent sessions and message histories must never exist only in browser `localStorage`. They must be persisted in PostgreSQL (`companyId` + `userId` scoped) to guarantee multi-device synchronization (office, home, mobile) and resilience against cache clearing.
  2. **Rich Markdown & Data Tables Mandate:** Every agent chat UI must support Markdown tables, structured headers, and decision chips (`SCALE`, `KILL`, `WATCH`, etc.).
  3. **Asset Visibility & Operational Tools:** Never launch a specialized agent blind. Always equip it with introspection tools (`_account_info`, `_attribution_report`) so it has full visibility into connected accounts, pages, pixels, and real order attribution.
  4. **Modular Independent Screens:** Agent cockpits must be split into modular components (<300–400 lines), single-depth styling, with independent error boundaries.
  5. **Continuous Evolutionary Feedback:** Any discovered bug, edge case, or enhancement during live agent usage must be immediately documented into `maxp-agent-builder/SKILL.md` and anchored into long-term memory.
  6. **Pristine User Prompts & Ephemeral Context Channel (Ban Context Prefixing):** Never inject active entity tags (e.g. `[المنتج المحدد في الرادار: س]`) into the user's raw prompt text. Entity state must pass through a dedicated, structured channel (`memory_context.active_product`) to prevent intent corruption on short queries (`؟`).
  7. **Enforced Multi-Step Superstep Continuation (Ban Silent Tool Termination):** Never terminate a ReAct loop immediately after tool execution without a natural language synthesis step. Always enforce a follow-up step to provide human-like explanation and fallback summaries.
  8. **Discreet Observability & Traceability:** All agent chat interfaces must expose unobtrusive session copy/tracing controls (`sessionId`) for zero-friction forensic analysis and debugging.
  9. **Meta Graph API v21+ Bidding Standard:** Always provide explicit `bid_strategy: 'LOWEST_COST_WITHOUT_CAP'` in Meta AdSet/Campaign creations for `OUTCOME_SALES` to prevent auction constraint rejections (`error_subcode: 2490487`). Never leak raw `Invalid parameter` text; extract `error_user_msg` and `error_user_title` for clean Arabic merchant explanations.
  10. **Prompt Elasticity & Merchant Constraint Respect:** Never rigidly hardcode fixed output structures (such as "always 3 angles") over explicit merchant commands ("زاوية واحدة بس" or "نشيل الاودينس نتورك"). Tools and agent contracts must flexibly accommodate 1 or 3 angles and manual placement exclusions.
  11. **In-Flight Self-Healing Interceptor:** Meta API integrations must automatically retry auction/bidding constraint rejections (`2490487`) in-flight with `LOWEST_COST_WITHOUT_CAP` before failing.
  12. **Failure Reflection & Anti-Blind-Retries:** Never blindly re-execute a failed tool call when the merchant asks "ليه؟"; explain the blocker in clean Arabic business terms and ask for the specific resolution.
  13. **Meta Structured Targeting & Geo-Key Resolution (Ban Empty Targeting Specs):** Ad creation and draft tools must explicitly assemble nested `targeting` (`ageMin`, `ageMax`, `genders`, `regions`, `cities`, `interests`) and resolve Egyptian governorates to official numeric Meta keys (`geo_locations.regions`), with backend defensive auto-hydration preventing blank `{}` AdSet creation. When activating a campaign, cascade status to all child ad sets and ads so delivery starts immediately without leaving ads stranded in `PAUSED`.
  14. **Dynamic Meta Geolocation & Negative Targeting Engine (Global-Ready & COD Logistics Guard):** Never rely solely on static regional dictionaries. The advertising pipeline must support dynamic real-time querying of Meta's Graph Search API (`GET /search?type=adgeolocation` and `type=adinterest`) for any country worldwide (EG, SA, AE, US, etc.), support exact GPS Pin-Drop radius targeting (`custom_locations: [{ latitude, longitude, radius, distance_unit }]`), and negative geographic exclusions (`excluded_geo_locations: { regions, cities, custom_locations }`) to automatically cut off high-cancellation and delivery-failure provinces in cash-on-delivery (COD) markets.
  15. **Capability-Driven Authority & Topology-Aware Handoff (Ban Negative Boundaries & Blind Handoffs):**
      - The Tool Manifest (`allowed_tools` + `FunctionTool` schemas) is the explicit, absolute source of authority for an agent.
      - Never write negative functional refusal statements in `SOUL.md` or `PERSONA.md` (e.g. "أنا مسؤول فقط عن كذا ولا شأن لي بالشحن"); doing so breaks dynamic tool assignment from the dashboard.
      - Agents must never call `agent_handoff_to` blindly without verifying that an active target agent actually exists for that tenant (`company_id`).
      - In Single-Agent Mode, the agent must seamlessly act as an all-in-one Store Assistant, executing any task it is equipped with tools to perform.
      - Never patch system prompts ad-hoc when tools are assigned; rely on Pydantic tool definitions to keep KV prompt caching intact (80%+ cost savings).

## 🖥️ Desktop Application Auto-Update & Versioning Law (Mandatory SemVer Bump)

- **Mandatory SemVer Increment on ANY Desktop Change:** Whenever any bug fix, UI change, or feature is made in `apps/desktop`, you MUST ALWAYS bump the `version` in `apps/desktop/package.json` (e.g. `1.0.4` → `1.0.5`).
- **Electron-Updater SemVer Mechanics:** `electron-updater` fetches `https://maxp.online/download/latest.yml` and performs strict semantic comparison (`remoteVersion > localVersion`). If the version is unchanged, it returns `up-to-date` and aborts download, preventing employee and user machines from receiving the update.
- **Synchronized Tag Push:** Always push the matching git tag (e.g. `git tag -a v1.0.5` + `git push origin refs/tags/v1.0.5`) so GitHub Actions (`release-desktop.yml`) builds the new setup and publishes the updated `latest.yml`.
- **Ban Ghost Releases:** Never deploy or commit desktop modifications with a static version number. Every desktop release MUST have an incremented version.

## 🎥 AI Video Generation & Creative Studio Engine (Google Flow via Gemini API)

- **Context & Business Role in MaxP:**
  - MaxP serves 24 commercial verticals (e-commerce, fashion, food, clinics, etc.). Video generation is a core asset for the Creative Studio & Media Buyer squad to automatically generate high-converting promotional reels (9:16) from real product photos (Image-to-Video).
- **Google Flow Reality & Direct Gemini API Access:**
  - `flow.google` is simply the front-end web studio for end users. Its actual generative powerhouse is the **Gemini API** running the **Veo 3.1** model.
  - **No Need for Complex Workarounds:** Generating a Gemini API Key from Google AI Studio using a Pro account grants direct programmatic access to the exact same engine that powers Flow. No brittle browser cookies, reverse-engineered proxies, or third-party wrappers needed.
- **2026 Native Audio & Single-Pass Generation:**
  - In 2026, **Veo 3.1 via Gemini API** natively generates high-fidelity synchronized audio, dialogue with realistic lip-sync, context-aware sound effects (SFX), and background music in a single pass.
  - No separate audio synthesis (TTS) or manual video/audio stitching is required for standard ad creation.
- **MaxP Backend Architecture:**
  - **Backend Service:** `apps/backend/services/googleVeoService.js` defaults to `veo-3.1-generate-preview` (with automatic fallback to `veo-2.0-generate-001`) and sets `generateAudio: true`.
  - **Zero .env Leaks:** Resolves keys exclusively from PostgreSQL `public.ai_keys` (`provider = 'GOOGLE'`).
  - **REST Endpoints:** `/api/v1/ai-video/generate`, `/api/v1/ai-video/status/:taskId`, and `/api/v1/ai-video/history`.
  - **Agent Tooling:** `apps/ai-service/src/tools/definitions/video_generation.py` auto-discovered by the agent framework (`generate_marketing_video`, `check_video_status`).
  - **MCP Integration:** FastMCP server in `apps/mcp-servers/video-mcp` (Port `7102`).

## 🔐 Security & Architecture Law: Ban AI Keys in .env (Mandatory Database Storage)

- **Ban AI API Keys in `.env`:** NEVER store, hardcode, suggest, or read AI provider API keys (Google, Gemini, Veo, OpenAI, Anthropic, DeepSeek, OpenRouter, Groq, etc.) from `.env` files. Storing AI keys in `.env` is strictly prohibited and considered an architectural violation.
- **Mandatory PostgreSQL Storage (`public.ai_keys`):** All AI keys MUST be persisted strictly in the database table `public.ai_keys` scoped either per tenant (`companyId`) or as a platform-wide central key (`keyType = 'CENTRAL'`).
- **Dynamic Key Resolution & Zero Secret Leaks:** Backend services, agents, and workers must resolve keys exclusively through database queries against `public.ai_keys` (`WHERE isActive = true ORDER BY priority ASC`), enabling real-time key rotation, tenant quota isolation, and eliminating secrets leaking into the filesystem, logs, or git.


