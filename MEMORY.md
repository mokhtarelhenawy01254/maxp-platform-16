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
