# Company Assistant OpenClaw-Style Memory Plan - 2026-05-09

## Goal

Improve Company Assistant memory so it behaves closer to OpenClaw's active memory model while staying safe for MaxP's multi-company SaaS environment.

The target is not to copy OpenClaw literally. MaxP should keep PostgreSQL as the durable source of truth, then add active recall, hybrid retrieval, memory promotion, and better operator controls.

## Current Baseline

- `CompanyAssistantMemory` persists durable memory in `company_assistant_memories`.
- Runtime memory injects scoped durable memories, conversation summaries, session boundaries, and recent command snippets.
- Explicit facts, preferred names, corrections, and rule proposals are captured.
- Rule proposals require admin approval before changing assistant behavior.
- Search is still simple: scoped database filtering ordered by importance and recency. There is no semantic recall over assistant memories yet.

## Architecture Decisions

- Keep canonical assistant memory in PostgreSQL, not Markdown files.
- Add embeddings as an index layer, not as the only source of truth.
- Use hybrid retrieval: structured filters + keyword match + vector similarity + recency/importance scoring.
- Run active memory before the main assistant reply with a hard timeout and safe fallback.
- Do not vectorize secrets, raw full transcripts, transient operational numbers, or unapproved rule proposals.
- Keep rule/style/personality changes governed by admin approval.

## Phase 1: Active Recall Foundation

### Task 1.1: Add memory retrieval service

**Description:** Create a focused service that builds a recall query from the latest Telegram/WhatsApp message plus the recent conversation tail, then retrieves relevant memories.

**Acceptance criteria:**
- Returns scoped memories for `companyId`, `channelId`, and `externalUserId`.
- Supports modes similar to OpenClaw: `message`, `recent`, and later `full`.
- Has hard timeout and returns empty context instead of failing the assistant reply.

**Verification:**
- Focused unit tests for scoping, timeout fallback, and session-boundary behavior.

**Likely files:**
- `backend/services/companyAssistant/CompanyAssistantMemoryRecall.js`
- `backend/tests/services/companyAssistantMemoryRecall.test.js`

### Task 1.2: Inject active memory context before planning

**Description:** Wire the recall service into `CompanyAssistantAgent` before AI planning and tool selection.

**Acceptance criteria:**
- Active memory context is injected as untrusted context, not instructions.
- The assistant remembers older relevant facts without requiring exact wording.
- If recall fails, normal assistant behavior continues.

**Verification:**
- Scenario: save a preference, discuss unrelated topics, ask indirectly about it, assistant recalls it.
- Scenario: `/newchat` resets direct context but preserves durable preferences.

## Phase 2: Hybrid Search Index

### Task 2.1: Extend memory schema for embeddings

**Description:** Add embedding metadata to assistant memories or a linked memory embedding table.

**Acceptance criteria:**
- Stores embedding vector/string, source hash, embedding model/provider, and generation timestamp.
- Existing memories remain valid without embeddings.
- No secrets or excluded types are embedded.

**Verification:**
- Prisma migration/generate passes.
- Unit tests confirm excluded content is not sent to embedding generation.

### Task 2.2: Generate embeddings for durable memories

**Description:** Reuse MaxP's existing embedding provider patterns to embed memory text for approved memory types.

**Acceptance criteria:**
- Embeds `FACT`, `PREFERENCE`, `CORRECTION`, approved knowledge/rules, and conversation summaries.
- Skips `SESSION_BOUNDARY`, pending `RULE_PROPOSAL`, secrets, and short noise.
- Supports backfill and on-create generation.

**Verification:**
- Backfill command processes a small sample safely.
- Failed embedding generation does not block message handling.

### Task 2.3: Add hybrid ranking

**Description:** Combine scoped DB filters, keyword matching, vector similarity, recency, and importance into one ranked result set.

**Acceptance criteria:**
- Exact IDs/names are preserved through keyword scoring.
- Semantic matches work when wording differs.
- Recent and high-importance memories get sensible boosts.

**Verification:**
- Tests cover exact match, semantic match, stale memory decay, and company/user isolation.

## Phase 3: Memory Capture And Promotion

### Task 3.1: Add memory candidate extraction

**Description:** Capture candidate memories from conversations without immediately making everything durable.

**Acceptance criteria:**
- Detects preferences, repeated corrections, stable company facts, and operator instructions.
- Records candidate source, confidence, and reason.
- Does not capture secrets or transient operational data.

**Verification:**
- Scenario tests for preference, correction, secret rejection, and noisy chat rejection.

### Task 3.2: Add nightly promotion job

**Description:** Build a Dreaming-like job that reviews candidates and promotes only useful memories.

**Acceptance criteria:**
- Scores by frequency, relevance, recency, correction strength, and operator approval.
- Promotes safe facts/preferences automatically only above threshold.
- Rules/personality changes remain pending for admin approval.

**Verification:**
- Dry-run mode shows what would be promoted and why.
- Apply mode promotes only approved/high-confidence candidates.

## Phase 4: Admin Visibility And Control

### Task 4.1: Improve memory UI

**Description:** Expand the Company Assistant admin memory/development tab.

**Acceptance criteria:**
- Search memories by text/type/user/channel.
- Show why a memory was remembered and last recalled.
- Allow edit, forget, approve, reject, and re-embed.
- Show active recall traces for debugging.

**Verification:**
- Browser smoke on `/settings/company-assistant`.
- API tests for admin-only access and company isolation.

### Task 4.2: Add Telegram controls

**Description:** Add simple assistant commands for memory control.

**Acceptance criteria:**
- `/memory` shows a short safe summary of what the assistant remembers about the current operator.
- `/forget` starts a safe forget flow for current-user memories.
- `/newchat` remains the new conversation boundary command.

**Verification:**
- Live Telegram scenario on Swan.

## Phase 5: Full Scenario Testing

### Task 5.1: Add memory scenario suite

**Description:** Expand the Company Assistant scenario runner around long-context recall.

**Acceptance criteria:**
- Tests name recall, preference recall, correction learning, new chat reset, semantic recall, forget flow, and company isolation.
- Includes both Telegram bot and userbot where practical.

**Verification:**
- Local focused Jest passes.
- Production Swan scenario runner passes after deployment.

## Data Policy

Vectorize:
- Durable facts.
- User/company preferences.
- Conversation summaries.
- Corrections.
- Approved rules and company knowledge.
- FAQ and policies.

Do not vectorize:
- Secrets, tokens, passwords, cookies, authorization headers.
- Raw full conversations by default.
- Pending rule proposals.
- Transient metrics like today's order count or current stock snapshots.
- Customer PII unless there is a clear approved use case and strict scoping.

## Rollout Order

1. Active recall without embeddings, using the current DB memory table.
2. Hybrid keyword + vector retrieval.
3. Candidate capture and nightly promotion.
4. Admin memory review/debug UI.
5. Telegram memory controls and production scenario hardening.

## Success Criteria

- Assistant can recall old preferences even when the user asks with different wording.
- Assistant keeps direct conversational context across follow-ups.
- New conversation resets short-term context without deleting durable memory.
- Operators can inspect, edit, approve, reject, and forget memories.
- No secrets are stored or embedded.
- Memory failure never blocks normal assistant replies.

## Phase 1 Delivery - Active Recall

Implemented in this pass:

- Added `CompanyAssistantMemoryRecall`, a bounded active recall layer inspired by OpenClaw Active Memory.
- Recall now builds a query from the latest message plus a short recent conversation tail.
- Recall ranks scoped memories by lexical/synonym overlap, intent boost, importance, recency, and channel/user scope.
- `CONVERSATION_SUMMARY` memories are treated as soft context so they do not outrank a directly relevant fact.
- Recall output is injected into the assistant prompt as untrusted memory context.
- The assistant can answer active memory questions deterministically when no AI provider is available.
- Preferred-name recall now checks active recall results before falling back to the older durable-memory list.
- Recent-conversation summaries redact sensitive-looking previews such as API key or internal prompt requests.

## Local Scenario Results

Local DB first failed because pending migrations had not been applied. After applying local migrations, the Company Assistant scenario runner passed:

- Total: 28
- Passed: 27
- Failed: 0
- Skipped: 1 (`CA-TELEGRAM-USERBOT`, no local userbot session)

Important long-memory scenarios now passing:

- `CA-LONG-MEMORY-SEMANTIC-RECALL`: remembers a return-policy fact after multiple unrelated turns and answers with different wording.
- `CA-LONG-MEMORY-NEWCHAT-DURABLE`: starts a new conversation while keeping durable memory available.
- Live Telegram userbot mode now sends a longer non-name memory scenario: saves a return-policy fact, asks unrelated dashboard/stock questions, starts a new chat with `/newchat`, then asks with different wording and expects the remembered policy.

Focused tests:

- `companyAssistantMemoryRecall.test.js`
- `companyAssistantMemory.test.js`
- `companyAssistantAgent.permissions.test.js`
- `companyAssistantScenarios.test.js`

Result: 47 tests passed.

## Comparison After Phase 1

Closer to OpenClaw:

- MaxP now has an Active Memory-style pre-reply recall pass.
- Memory context is injected as untrusted context, not as executable instructions.
- Recall is scoped by company, channel, and external user.
- Recall fails closed and does not block the assistant reply.
- Long conversations can recall durable facts without relying only on the latest turns.

OpenClaw recheck on 2026-05-09 against `openclaw/openclaw` `origin/main` (`11f9383f8ad61457f841bd798285a0a5102db1b1`):

- OpenClaw still treats durable memory as explicit workspace knowledge (`MEMORY.md`, daily notes, optional `DREAMS.md`), but its default runtime index is stronger: builtin SQLite, FTS5/BM25, optional vector search, and hybrid merge.
- Active Memory is a blocking pre-reply memory pass, scoped to eligible persistent chat sessions, with `/verbose` and `/trace` visibility.
- Memory search chunks files and can use hybrid vector + BM25 ranking, temporal decay, MMR diversity, and provider auto-detection.
- Dreaming is opt-in background consolidation with light/deep/REM phases, short-term evidence, scored promotion to long-term memory, and human-readable Dream Diary output.
- Newer OpenClaw docs also describe Memory Wiki as a provenance-rich companion layer with structured claims, evidence, freshness, dashboards, and wiki-native search/apply/lint tools.

Still behind OpenClaw:

- No real vector embeddings for assistant memories yet.
- No BM25/FTS index dedicated to assistant memory yet.
- No Dreaming-like promotion job for recurring short-term signals yet.
- Memory search/debug UI is now basic keyword/trace visibility; it is not a full OpenClaw-style hybrid/vector trace yet.

## Phase 3 Follow-Up Delivery - Auto Learn And Safer Execution

Implemented in this pass:

- Added conservative automatic memory promotion for natural messages that contain stable company policies/facts, user response preferences, or behavior-rule candidates.
- Natural policy statements such as warranty, return, shipping, delivery, or packaging rules can now become durable company memory without requiring the exact "remember this" wording.
- Natural auto-learn captures now get a direct acknowledgement reply (`حفظت...`) before active recall is considered, so a policy statement does not look like a memory question.
- Auto-promoted memories are deduplicated by company, scope, type, and normalized content; repeated evidence refreshes the existing memory instead of creating copies.
- Behavior-changing instructions become pending `RULE_PROPOSAL` memory rather than silently changing assistant rules.
- Operational questions, greetings, tool metrics, secrets, and command-like requests are rejected as memory signals.
- Write confirmations now require the explicit confirmation key (`نفذ ABCD1234`). A bare `نفذ` or `confirm` does not execute the latest pending action.
- Added `search_company_knowledge_base`, a read tool that searches active company FAQs, policies, store pages, products, and product landing pages for open-ended site-knowledge questions.
- Expanded scenarios with:
  - natural auto-memory policy recall after unrelated turns and `/newchat`
  - strict write-confirmation guard
  - company knowledge search
  - longer live Telegram plan covering greeting, auto memory, dashboard, stock, orders, storefront, WhatsApp, Facebook Ads, secret guard, `/newchat`, and recall.

## Current Capability Boundary

The assistant is now stronger at answering operational questions across the company site, but it is still intentionally governed:

- Supported read coverage includes dashboard, orders, order details, products, inventory/warehouses, customers, conversations, tasks, storefront, WhatsApp, Facebook Ads, shipping, integrations, assistant memory, and company knowledge/FAQ/policies.
- Supported write execution is still limited to task creation, with confirmation and permission checks.
- Unsupported write requests must be added as explicit tools with preview/draft, confirmation key, audit log, and domain-specific permissions before they can execute safely.

This is closer to OpenClaw in memory shape: active recall, durable indexed memory, automatic capture, provenance metadata, and guarded self-improvement. It is not yet OpenClaw parity because the remaining missing pieces are a dedicated FTS/BM25 engine, MMR/reranking, Dreaming-style periodic promotion, a Memory Wiki/evidence layer, and a broader safe tool set for site actions.
- No Telegram `/memory` or `/forget` controls yet.
- No Memory Wiki-style structured claim/evidence layer for company knowledge, policies, and corrections yet.
- No operator-facing Dream Diary/backfill screen for reviewing what the system is learning from older conversations.

UI review note:

- Keep the admin `الذاكرة` tab. It is the operator-facing durable-memory surface and should not be removed.
- The current split between `الذاكرة` and `التطوير` is functional but not self-explanatory. A better next UI pass is to rename or group it as `الذاكرة والتعلم`, while still separating durable facts from corrections, conversation summaries, and rule proposals.
- The biggest missing UI capability is not another memory list; it is active-recall visibility: which memory was recalled, why it matched, when it was last used, and whether it came from a durable fact or a summary.
- The memory row UI now localizes memory type/source labels, including auto-learned memories as `تعلم تلقائي`, and shows promotion count when repeated evidence refreshes the same durable memory.
- Telegram assistant replies now include an explicit source footer so operators can tell whether the answer was produced by AI, AI over site data, a direct site-data tool, memory/system logic, or a fallback because the AI provider did not respond.
- Added `/status` and the `حالة المصدر` Telegram quick action to explain these source labels from inside the chat.
- Admin test-message output and command logs now surface the same response-source metadata, including `providerIssue=true` when the AI provider/failover layer was unavailable and a safe deterministic path was used.
- Telegram Bot API assistant chats now send a `typing` chat action immediately and refresh it while the Company Assistant is preparing the reply, so operators can see that the bot is working during slow AI/provider paths.

Production Telegram follow-up:

- First live Swan Telegram long-memory run exposed a real ordering bug: a prefixed save command like `اختبار ذاكرة طويل: افتكر ان ... 17 يوم` was treated as an active-recall question and answered with an older 14-day policy instead of saving the new fact.
- The fix makes prefixed explicit save commands extract as memory writes first, while preserving inline preferred-name capture such as `اسمي مختار. احفظ الاسم`.
- Regression coverage now protects both the prefixed fact-save case and the preferred-name case.

## Phase 2 Implementation - Recall Trace and Admin Search

This phase closes the immediate observability gap without adding a risky schema migration:

- Every Company Assistant command log now stores a compact `activeRecall` trace in `metadata`.
- The trace includes recall status, query mode, elapsed time, candidate count, recalled memory count, top score, matched memory ids/titles, matched terms, and short content previews.
- `/api/v1/company-assistant/admin/memories` accepts `query`, `type`, `channelId`, and `externalUserId` filters and returns scored memory results using the same recall scorer as runtime active memory.
- The admin `الذاكرة` tab now supports search, type filtering, editing existing memories, setting memory type/importance, and showing score/matched-term badges.
- The `السجلات` tab now shows a small recall trace for each command so operators can see whether memory participated in the reply.

This is closer to OpenClaw's `/trace` visibility, but still uses the current PostgreSQL table plus lexical/synonym scoring. No vector column, BM25/FTS index, or background Dreaming promotion was added in this phase.

Recommended next implementation phase:

1. Add nightly candidate promotion with dry-run review.
2. Add Telegram `/memory` and `/forget` controls.
3. Add Memory Wiki-style structured claim pages for policies, corrections, and frequently recalled facts.

## Phase 3 Implementation - Hybrid Index, Provenance, and Feedback

This phase adds the first durable OpenClaw-style search index for Company Assistant memory:

- Added `company_assistant_memory_indexes` for chunked memory text, keyword payloads, local vector payloads, provider metadata, and source-memory provenance.
- Added `company_assistant_memory_feedback` so operators can mark recalled/search results as helpful, wrong, stale, or ignored.
- Memory create/update/delete now syncs the index automatically and removes index/feedback rows on delete.
- Active recall now queries the hybrid index before falling back to the older lexical scorer, then logs keyword/vector/feedback/provenance details in the compact recall trace.
- Admin memory search now returns hybrid score, keyword score, vector score, feedback score, matched terms, and index provenance when indexed data exists.
- Added admin APIs for index status, rebuild/backfill, and memory feedback.
- The admin `الذاكرة` tab now shows index coverage, stale counts, chunk counts, embedding provider, rebuild control, hybrid score badges, and quick feedback buttons.

Implementation note:

- The default vector provider is `LOCAL_KEYWORD_HASH_V1`, a deterministic local vector built from normalized Arabic/English tokens and synonyms. It is safe, free, and available in tests/production without extra keys.
- Optional AI embeddings can be enabled later with `COMPANY_ASSISTANT_MEMORY_USE_AI_EMBEDDINGS=true`; the service already has the hook to use existing Google/Gemini embedding keys.
- This is not full OpenClaw parity yet: OpenClaw still has stronger BM25/FTS and optional semantic embeddings with MMR/temporal decay. MaxP now has the same product shape: pre-reply active memory, durable index, hybrid scoring, trace, provenance, and operator feedback.

## Production Hardening Follow-Up - Telegram Latency

Live Swan Telegram testing showed that the memory path worked, but clear read-tool messages could wait behind NVIDIA planning/composition timeouts. One run returned the low-stock answer after about 97 seconds, which is too slow for an operator assistant even though the final answer was correct.

The runtime now treats high-confidence deterministic read tools as a fast path:

- If a heuristic confidently maps the message to a read tool, the assistant skips the AI planner.
- If the same request has a deterministic formatter, the assistant returns the tool summary directly instead of waiting for AI prose.
- Write tools, risky tools, clarification, open-ended conversation, and memory-recall questions can still use the AI planner/composer where useful.

This keeps operational Telegram commands such as dashboard summary, low stock, storefront status, WhatsApp status, and order details responsive even when the active model is slow or cooling down.

The production cleanup also exposed stale orphan index rows from earlier scenario runs that deleted memories directly. Scenario cleanup now removes memory feedback and index chunks before deleting temporary memories, and index status ignores orphan chunks while surfacing an orphan count for admins.
