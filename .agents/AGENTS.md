# MaxP Platform — Project Agent Rules

## Rule: Ban AI Keys in .env (Mandatory Database Storage in public.ai_keys)
1. **Ban AI API Keys in `.env`:** NEVER store, hardcode, suggest, or read AI provider API keys (Google, Gemini, Veo, OpenAI, Anthropic, DeepSeek, OpenRouter, Groq, etc.) from `.env` files. Storing AI keys in `.env` is strictly prohibited.
2. **Mandatory PostgreSQL Storage (`public.ai_keys`):** All AI keys MUST be persisted strictly in the database (`public.ai_keys`) scoped either per tenant (`companyId`) or as a platform-wide central key (`keyType = 'CENTRAL'`).
3. **Dynamic Key Resolution & Safety:** Backend services, agents, and workers must resolve keys exclusively through database queries against `public.ai_keys` (`WHERE isActive = true ORDER BY priority ASC`), enabling real-time key rotation, tenant quota isolation, and eliminating secrets leaking into filesystem, logs, or git.

## Rule: Structured Parameters for Tools (No Brittle Text Extraction)
1. **Always Use Explicit Parameters**: All agent tools designed for modifying, creating, or updating data (such as bookings, orders, customer records, inventory adjustments) MUST use explicit, structured parameters with appropriate types (e.g., `patient_name: str`, `appointment_date: str`, etc.).
2. **Ban Generic Text Request Params**: Never use a single generic text parameter (like `request`, `prompt`, or `message`) to pass unstructured strings containing mixed fields that are parsed using custom regex or NLP backend logic. This is brittle and causes parameter extraction failures.
3. **Structured Outputs & Function Calling**: Leverage Pydantic schemas to validate and constrain tool inputs directly.
4. **Conversational Slot-Filling**: Agent instruction sets (such as `AGENTS.md` and `SOUL.md` files) MUST instruct agents to collect missing parameters step-by-step through interactive dialogue (slot-filling) rather than expecting the user to provide all information at once or attempting to guess.

## Rule: Mobile-First Single-Depth Surfaces (Ban Cramped "Box-in-Box" UI)
1. **Ban Nested Cards/Boxes on Mobile (MOB-015)**: Never nest full-border cards inside other cards or containers with heavy padding (`p-6`). On mobile (`< 640px`), sub-sections MUST blend into the parent surface using subtle dividers (`border-t border-border`) or vertical rhythm (`space-y-4`), not an extra layer of `border rounded-xl bg-gray-50 p-4`.
2. **Responsive Padding Defaults**: Always use responsive padding for page wrappers and cards: `p-3 sm:p-6` or `px-2.5 sm:px-6`. Never hardcode static desktop padding like `p-6` or `p-8` without an `sm:` prefix.
3. **85%+ Viewport Utilization**: On a 390px viewport (iPhone 14), the actual content width (inputs, tables, texts) MUST occupy >= 85% of the screen width. Padding cascade from outer containers must never starve content width.
4. **Horizontal Scroll for Dense Navigations**: Never stack 5+ action buttons or 10+ tabs vertically on mobile; convert them to compact horizontal scrollbars (`overflow-x-auto`) with touch-friendly heights (>= 44px).

## Rule: Modular Independent Screens (Ban Monolithic "All-in-One-Page" Aggregation)
1. **Ban Monolithic God-Components**: NEVER combine multiple distinct screens/tabs/domains (such as production bench, barcode kiosk, earnings ledger, alerts, and reports) into a single giant monolithic file. Each functional screen MUST be an independent, modular component in its own file (under 300-400 lines max).
2. **Clarification on Single-Depth**: "Single-Depth" is strictly a CSS visual rule for container borders and nested box padding (preventing card-in-card cramping on mobile). It DOES NOT mean cramming every feature onto one page or avoiding dedicated sub-pages.
3. **Dedicated Route & State Isolation**: Each screen MUST maintain its own localized state, data fetching, and Error Boundary. A crash or edge-case error in one screen (e.g. reports or vouchers) must NEVER take down or degrade other independent screens (such as the technician's active case bench).
4. **Clean File Structure**: Group related domain screens under a dedicated feature folder (e.g. `pages/dental-lab/technician/` containing `DentalTechBenchPage.tsx`, `DentalTechKioskPage.tsx`, `DentalTechWagePage.tsx`, `DentalTechNotificationsPage.tsx`, `DentalTechReportsPage.tsx`).

## Rule: Strict Change Isolation — Zero Blast-Radius (عزل التعديلات التام — أي تعديل في مكان لا يسمع نهائياً في أي مكان آخر)
1. **Mandatory Pre-Edit Reference Audit**: NEVER modify any component, hook, helper, backend service, or CSS class without first checking all references across the codebase (`grep`). If a file is used by more than one screen, you MUST NOT alter its default behavior, layout, or return signature.
2. **Specialize/Fork Over Mutating Shared Components**: When a specific page requires layout, visual, or behavioral changes to a shared component (`components/common/`, `components/ui/`, shared hooks, or global layout wrappers), DO NOT mutate the shared component in a way that affects other pages. Instead, create a page-scoped component/wrapper inside that feature's folder or use strictly additive optional props with 100% backward-compatible defaults.
3. **Ban Global CSS & Shell Bleed**: Never modify global stylesheets (`index.css`, `App.css`), global theme tokens, or shared `Layout.tsx` rules to fix a single page's UI issue. Scope all styling and layout changes strictly to the target component's root container.
4. **Backend API & Service Contract Immutability**: When updating a backend controller or service for a specific screen, NEVER rename, remove, or change the type/semantics of existing response fields or query filters used by other screens, storefront, or desktop/mobile apps. Create a dedicated endpoint/method or pass an explicit optional parameter that preserves existing behavior 100% when omitted.
5. **Scoped Storage & Cache Keys**: Always prefix `localStorage`, `sessionStorage`, and query cache keys with the specific screen/module namespace so state changes in one screen never collide with or leak into another screen.
6. **Post-Edit `git diff` Blast-Radius Check**: Before committing, verify via `git status` and `git diff` that ONLY the intended target feature files were modified and zero unintended side-effects were introduced elsewhere (see `.agents/skills/strict-change-isolation/SKILL.md`).

## Rule: Multi-Agent Parallel Task Execution & Subagent Delegation (إلزامية تشغيل المهام وتفويضها عبر أكثر من إيجينت متخصص)
1. **Mandatory Subagent Delegation on Complex Tasks**: Never execute multi-phase or multi-domain tasks in a single bloated, monolithic pass. Any task requiring exploration/research, multi-file code modifications across frontend/backend, security auditing, or scenario verification MUST be partitioned and executed across specialized subagents using `invoke_subagent` (and `define_subagent` when custom roles are required).
2. **Subagent Archetypes & Separation of Concerns**:
   - **Lead Orchestrator (Parent Agent)**: Coordinates the subtask dependency graph, launches subagents in parallel, synthesizes findings, resolves conflicts, and interfaces with the user.
   - **Codebase & Schema Researcher (`research` / `flash`)**: Read-only exploration of files, database schemas, and references without cluttering the main context.
   - **Module Implementers (`self` / specialized)**: Focused code writers operating on discrete files or branched workspaces (`branch`/`share`).
   - **Strict Isolation & Security Auditor (`self` / `code-reviewer`)**: Verifies `git diff`, ensures zero blast-radius, checks modular file size limits (< 400 lines), and confirms zero AI keys in `.env`.
   - **Live Scenario Tester (`self` / devtools)**: Runs hands-on browser verification, checks console logs, and confirms API responses.
3. **Zero Polling Loops**: Never poll `manage_subagents(Action='status')` in a loop. Launch subagents concurrently via `invoke_subagent` and stop tool execution to await the runtime's reactive wakeup.
4. **Strict Compliance with `multi-agent-orchestrator` Skill**: All multi-agent workflows must strictly conform to `.agents/skills/multi-agent-orchestrator/SKILL.md`.

## Rule: Deployment Strategy (Frontend via GitHub CI/CD, Backend Fast Hot-Patch with Git Sync)
1. **Frontend Releases**: Always deploy frontend changes through Git (`git commit & push` to `main`). GitHub Actions builds the production `dist` bundle, runs full syntax/size guards, and deploys cleanly to Nginx. Never upload ad-hoc raw bundles manually unless specifically directed during emergency offline recovery.
2. **Backend Fast Verification & Sync**: Backend JS files may be hot-tested on the server directly for rapid verification (`ssh` file update + `pm2 reload maxp-backend`). Once verified on production, ALWAYS commit and push the changes to GitHub immediately to ensure zero drift between the repository and the live environment.

## Rule: Ergonomic Workspace Design (Ban Wasted Space, Explanatory Clutter, and Single-Use Permanent Columns)
1. **Ban Permanent Columns for Single-Use Tools**: Never allocate a permanent screen column/panel (eating 20-30%+ of the screen width) to an action that the user performs only once per session (e.g. selecting a product, browsing historical chat sessions, or picking initial filters). Such tools MUST be placed inside top-bar comboboxes, dropdowns, or collapsible slide-over sheets/modals that disappear immediately after selection, reserving 75-85%+ of the screen for the active workspace and live canvas.
2. **Ban Explanatory Copy & Subtitle Clutter (Show, Don't Tell)**: Pro SaaS and dashboard tools must NEVER be bloated with instructional paragraphs, tutorial subtitles, or marketing copy under every button and title (e.g., "تخطيط الحملات وصياغة الزوايا بناءً على...", "خبير الميديا باير..."). Replace wordy text with crisp, compact action labels, tooltips on hover, and self-evident interactive controls.
3. **Ban Wasted Space & Nested Padding Bloat**: Operational tools and cockpits are productivity workspaces, not marketing landing pages. Eliminate excessive paddings (`p-6`+ on nested cards), outer container margins, and static multi-level border wrapping. Utilize 85%+ of screen space for core production actions.
4. **Action Cards over Walls of Text in AI Outputs**: Long streaming text answers from AI agents that recommend strategies, angles, or parameters must NOT remain dead text. They MUST be formatted as compact, interactive Generative UI cards (e.g., selectable angle card, copyable hook button, budget slider, one-click "Apply to Draft" trigger).
5. **Zero Dead Margins (Full Edge-to-Edge Cockpit)**: In workspaces, cockpits, and full-screen tools, never let the parent shell wrap the page with default dashboard padding (`p-4 md:p-6`). Always configure `<Layout fullWidth>` and add the route to `shouldRemovePadding` in `Layout.tsx` (`p-0 overflow-hidden min-h-0 h-full max-h-full`) with tightly bounded inner padding (`p-1.5 sm:p-2 gap-1.5`).
6. **Laptop Viewport Height Ergonomics (<= 768px Viewports)**: On standard laptops (1366x768 or scaled 1080p), the usable height below chrome is 550-650px. Never use tall fixed-ratio media blocks (`aspect-[4/3]`) that push CTAs below the fold; cap media at `h-36 sm:h-44 object-cover`. Merge inputs (budget/pricing) horizontally into a single action bar with the primary CTA (`[ Input ] + [ Primary Button ]`). Keep secondary settings in collapsible drawers defaulting to collapsed. Never duplicate header context (e.g. product/session badges) inside child panels.
7. **Ban Floating Island Fragmentation (Mandate Unified Single-Surface Cockpits)**:
   - **Ban Triple/Double Header Syndrome**: Never split a workspace into multiple disconnected headers (e.g. page header + chat panel header + preview canvas header). Use a single, unified top control bar that houses session switcher, product picker, and status. Child panels must seamlessly connect below it without redundant sub-headers.
   - **Ban Floating Islands with Background Gaps**: Never render multiple floating card boxes separated by container background gaps (`bg-slate-100 gap-3 rounded-2xl`). Workspaces and studios must be a **single continuous surface (One Seamless Chassis)** where panels are separated only by subtle, clean borders (`border-r` / `border-l`), creating a unified, professional 2026 SaaS cockpit feel (like Linear/Cursor).
   - **Ban Redundant Cross-Panel Context Duplication**: Do not show the same selected entity (product, campaign, status) in 3 different headers and badges across the screen. Centralize the active entity in the top unified control bar.
   - **Ban Nested Border Nesting (Borders inside Borders)**: Do not wrap small stats and sub-sections with thick full-border boxes inside already bordered panels. Use subtle dividers, typography hierarchy, or single-surface groupings to keep the screen breathing and uncluttered.

## Rule: Absolute Ban on Meta-Explanatory Clutter in Production UI (حظر قطعي لحشو الشروحات والتنظير وأزرار المقارنة داخل واجهات المستخدم)
1. **Production UI is Strictly for Customers & Business (الواجهة للعميل فقط وليست للمهندس):**
   - User interfaces, landing pages, dashboards, and client portals MUST NEVER contain design-theory lectures, rule codes, AI self-talk, or internal comparison widgets.
   - **PERMANENT BAN on embedding inside production UI:**
     - "Taste vs Slop" toggles, pills, or buttons in user-facing UI.
     - "قبل المهارة / بعد المهارة" toggles.
     - "Audit Matrix Drawers" or design breakdown drawers.
     - Rule codes (`ANTI_SLOP_P01`, `ANTI_SLOP_P02`, etc.) or internal architecture labels.
     - Text paragraphs lecturing the viewer on why the AI designed something or why an aesthetic is good.
2. **Comparisons Belong Strictly in Chat/Artifacts, NEVER in Code:**
   - When the user asks to "show the difference between using a skill and not", or "compare approaches", the explanation, audit, and breakdown MUST be presented strictly in the chat conversation or an artifact markdown file. NEVER leak internal comparisons, debugging lenses, or explanatory drawers into the production frontend components or live landing pages.
3. **Show, Don't Tell — Zero Instructional Subtitle Bloat:**
   - Pro SaaS pages and landing pages must never lecture the visitor with paragraphs explaining "why we designed this button" or "how this tool benefits you in 5 lines of prose".
   - The UI must speak through crisp, self-evident actions, transparent pricing, visual demonstrations, and hard business metrics.

## Rule: Anti-AI-Slop & Design Authenticity (Domain-First Aesthetic & Permanent Ban on AI Clichés)
Any design resembling generic LLM output or blindly imposing developer-tool aesthetics onto non-technical domains is strictly rejected. Audit all code against these 6 core detection pillars & 12 slop flags:

### The 6 AI-Detection Pillars (Domain-Aware Engineering Standard):
1. **Domain-First Aesthetic & Palette (الملائمة القطاعية والجمهور المستهدف):**
   - **Fashion, Apparel, Beauty & Lifestyle Commerce:** NEVER use dark hacker terminal themes, OLED black carbon, or cyber neon. Mandate warm luxury creams (`#FAF8F5`, `#FDFBF7`), clean porcelain whites (`#FFFFFF`), architectural ink contrast (`#141416`), soft tailored shadows, rich garment lookbooks, and high-fashion editorial typography (Zara, Massimo Dutti, Farfetch caliber).
   - **Business Operations & Dashboards (Dental Lab, POS, Warehouses):** Clean, crisp, high-contrast, distraction-free daylight surfaces (`#FFFFFF` with `#F8FAFC` and subtle zinc dividers).
   - **Developer Tools & Infrastructure Only:** Dark titanium/graphite palettes are strictly restricted to low-level engineering consoles, CLIs, or IDE extensions — PERMANENTLY BANNED on customer-facing commerce, merchants, clinics, or lifestyle pages.
2. **Typography & Micro-Typography:**
   - Mandatory `text-wrap: balance` on headings and `text-pretty` on body copy (ban orphan words).
   - Mandatory `font-variant-numeric: tabular-nums` (or `tabular-nums`) for all numbers, pricing, and business metrics.
   - For Arabic typography: NEVER apply monospace (`font-mono`) to Arabic words as it breaks cursive character connections; restrict monospace strictly to Latin codes, currencies, or digit-only tabular blocks.
   - Use true typographical glyphs: `…` (never `...`), curly quotes `“ ”` (never `"`), non-breaking spaces before units (`10&nbsp;MB`, `0.8&nbsp;s`, `⌘&nbsp;K`).
3. **Interaction Physics & Micro-Haptics:**
   - Buttons MUST feel physically responsive: `:active` state requires `transform: scale(0.97)` with `transition: transform 160ms ease-out`.
   - Popovers MUST be origin-aware: `transform-origin: var(--transform-origin)` (scale in from trigger, not center).
   - Tooltips MUST skip delay after first hover (`instant hover mode`). Strict `prefers-reduced-motion` compliance.
4. **Layout Architecture (Anti-Symmetry & Editorial Hierarchy):**
   - Ban cookie-cutter 3-column equal cards. Use asymmetrical layouts and Bento Grids with varied visual weight.
   - For SaaS workspaces & cockpits: Unified single-surface chassis with subtle hairline dividers, banning floating islands separated by wide grey gaps.
   - For Commerce & Marketing: Spacious editorial hierarchy with high-contrast hero, clear visual product previews, and frictionless conversion actions. PERMANENTLY BAN forcing Linear/Cursor dark IDE layouts onto commerce or lifestyle products.
5. **Real Business Economics & Telemetry over Jargon (الأرقام والنتائج التجارية الحقيقية):**
   - Zero marketing buzzword fluff ("الذكاء الاصطناعي الخارق").
   - For E-commerce & Fashion: Replace fluff with hard merchant economics: Return reduction % (e.g. 60%), 1-click Bosta AWB dispatch speed, real profit margin calculations, 0% sales commission, and verified local payment methods (InstaPay/Meeza).
   - PERMANENTLY BAN developer metrics (P95 latency, model names like DeepSeek/Llama) on business merchant or consumer pages. Developer metrics belong strictly in engineering dashboards.
6. **Accessibility & Edge-Case Resilience:**
   - Always use semantic HTML (`<button>`, `<a>`, `<label>`) with `aria-label` on icon-only buttons.
   - Replace `outline-none` with `focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1`.
   - Defensive layout: `min-w-0` on flex children with `truncate` or `line-clamp-*` to prevent overflow crashes.

### The 12 Banned Slop Flags:
1. Zero Emoji Littering (`🤖`, `🚀`, `⚡`, `✨`, `🔥`, `💡`, `🎯`, `🛒`, `🧠`).
2. Ban Purple/Cyan Dark Mesh Cliché.
3. Ban Cookie-Cutter Symmetrical Card Clones.
4. Ban Marketing Buzzword Fluff.
5. Ban Everything-Is-Glassmorphism.
6. Ban Fake Glowing Rainbow Borders & Shimmer Spam.
7. Ban Floating Island Fragmentation.
8. Ban Stock 3D Cartoon Avatars.
9. Ban The Centered Hero Trap.
10. Ban Dead Unclickable UI Badges.
11. **Ban Developer Terminal Aesthetics on Commerce/Fashion/Lifestyle:** Never use pitch black OLED/carbon or cyber themes for fashion, clothing, clinics, food, or retail.
12. **Ban Developer Jargon on Business Landing Pages:** Never show P95 latency, API signatures, or LLM model names to merchant or consumer buyers; use real business unit economics instead.

## Rule: Desktop App Auto-Update & Mandatory Version Bumping
1. **Mandatory SemVer Increment on ANY Desktop Change:** Whenever any bug fix, UI change, or feature is made in `apps/desktop`, you MUST ALWAYS bump the `version` in `apps/desktop/package.json` (e.g. `1.0.4` → `1.0.5`).
2. **SemVer Comparison Law (`electron-updater`):** The Electron auto-updater strictly compares the remote version in `latest.yml` against the client's currently installed local version (`package.json`). If `remoteVersion === localVersion`, the updater evaluates the app as "up-to-date" and silently aborts download. For employees and users to receive automatic background updates without manual reinstall, `remoteVersion` MUST BE STRICTLY GREATER than `localVersion` (`remote > local`).
3. **Synchronized Tag & Release Pipeline:** After bumping the version in `package.json`, create and push the matching git tag (e.g. `git tag -a v1.0.5` + `git push origin refs/tags/v1.0.5`) to trigger the GitHub Actions build workflow (`release-desktop.yml`), which publishes the new installer and `latest.yml` to `https://maxp.online/download/`.
4. **Ban Ghost Releases:** Never push desktop source code fixes or build installers without bumping the version in `package.json`. Every desktop release MUST have an incremented version.

## Rule: Mandatory Scenario Formulation & Browser Self-Verification Before Push (قاعدة السيناريو الإلزامي والاختبار الذاتي بالمتصفح قبل الرفع)
1. **Strict Law — NO PUSH WITHOUT LIVE PROOF (حظر قطعي للرفع بدون إثبات عملي حي):**
   - **Phase 1 (فهم التاسك وصياغة السيناريو):** عند استلام أي تاسك، يجب تحليل المطلوب بدقة وصياغة سيناريو تنفيذ وسيناريو فحص تفاعلي مسبق (Pre-Flight Test Scenario) يحدد الرابط المستهدف وخطوات التجربة ومعايير النجاح قبل لمس الكود.
   - **Phase 2 (التنفيذ المنضبط المعزول):** تطبيق التعديل طبقاً لقواعد `strict-change-isolation` دون أي آثار جانبية.
   - **Phase 3 (بوابة الاختبار الذاتي بالمتصفح - شرط مانع للرفع):** يُحظر منعاً باتاً عمل `git commit` أو `git push` قبل تشغيل المتصفح (عبر `chrome-devtools` MCP أو بيئة التطوير)، وزيارة الصفحة، وتنفيذ خطوات السيناريو تفاعلياً، والتأكد من خلو سجلات الكونسول تماماً من أي أخطاء (`list_console_messages` - Zero Errors)، وسلامة اتصالات الشبكة والواجهة. (وللمهام الخلفية/Backend: تشغيل فحص واختبار حقيقي للـ API بنتيجة 200 OK).
   - **Phase 4 (الرفع المعتمد والتوثيق):** فقط بعد اجتياز فحص المتصفح بنجاح تام، يتم عمل Commit & Push مع إرفاق سيناريو الفحص ونتيجة التجربة للعميل.

## Rule: Post-Task Automatic Git Push Rule (Conditional on Passing Browser Verification)
1. **Mandatory Quality Gate:** You MUST strictly pass the Browser Self-Verification above BEFORE executing this push rule. Pushing unverified code is strictly prohibited.
2. **Commit & Push Execution:** After passing verification, automatically stage changes, craft a descriptive commit message, and push directly to `https://github.com/shroukmagdi74-source/maxperformance14` (`origin` remote).
3. **ABSOLUTE BAN — Force Push is PERMANENTLY FORBIDDEN:** Never force push under any circumstance.


