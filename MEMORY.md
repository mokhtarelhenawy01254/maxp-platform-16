# MEMORY.md - Long-Term Curated Memory

## Deployment & Repository Directives

- **Mandatory Target Repo for Post-Task Auto-Push:**
  - **URL:** `https://github.com/mokhtar267/maxp-platform-6`
  - **Remote Name:** `mokhtar267`
  - **Strict Post-Task Rule:** After completing **ANY** task, automatically commit all changes with a clear, descriptive commit message explaining what was updated, and push directly to `mokhtar267` (`git push mokhtar267 main`).
  - **Commit Naming:** Always write explicit commit messages (e.g., `feat(...)`, `fix(...)`, `docs(...)`) so the user can easily trace every update.
  - **Exclusion:** Under no circumstances should updates be pushed to `origin`, `platform3`, `platform4`, `omokhtar748`, or any other remotes unless explicitly requested.

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

