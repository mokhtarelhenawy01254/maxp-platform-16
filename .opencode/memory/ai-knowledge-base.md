# AI Knowledge Base

_Last updated: 2026-07-17_

## Project Context

### WhatsApp Chat Right Panel (Customer Profile)
- **File**: `apps/frontend/src/pages/whatsapp/components/ChatRightPanel.tsx`
- Complete rewrite with 3 tabs (Info/Orders/Activity), stats row, order timeline, activity timeline
- Uses `useCustomerProfile` hook from `hooks/inbox/useCustomerProfile.ts`
- Avatar fallback chain: `contact.profilePicUrl` → `customer.avatar` → initials via proxy
- `pps.whatsapp.net` added to proxy allowlist in both frontend (`imageUrl.ts`) and backend (`proxyImageController.js`)

### Inbox Panel Patterns
- **FacebookInbox**: Toggleable right profile column via `PanelRightClose`/`PanelRightOpen` + localStorage
- **InstagramInbox**: Same pattern as Facebook
- **WhatsApp Chat** (old, `/whatsapp/chat`): Has right panel toggle (`PanelRightClose`/`PanelRightOpen`) + localStorage `whatsappChatRightPanelVisible`
- **WhatsApp Inbox** (new, `/whatsapp/routing`): No panel toggle (routing workspace, not a chat)

## AI Agent Ecosystem 2026 (Research — July 2026)

### The Agent Definition for SaaS Web
AI agent in 2026 = LLM-driven system with: tool-use (MCP/A2A), memory (checkpointers + stores), sandboxed execution, multi-step planning, human-in-the-loop approval, structured output. Industry standards: **MCP** (Anthropic→Linux Foundation), **A2A** (Google), **AGENTS.md** (60k+ repos).

### Top Frameworks (SaaS Web Focus)
| Framework | Lang | GitHub | Key Feature |
|-----------|------|--------|-------------|
| OpenAI Agents SDK | Python | official | Sandbox exec, MCP, skills, AGENTS.md, durable snapshots |
| Google ADK 2.0 | Python | 20.6k ⭐ | Workflow runtime, Task API, native Gemini |
| LangGraph | Py/JS | langchain-ai | Graph-based orchestration, checkpointers, stores |
| Microsoft Agent Framework | C#/Py/Java | microsoft | Sequential/Concurrent/Handoff/GroupChat/Magentic patterns |
| CrewAI | Python | crewAIInc | Role-based crews, used by 60%+ Fortune 500 |
| AutoGen | Python | microsoft | Multi-agent conversations |
| Pydantic AI | Python | pydantic | Type-safe, clean Pythonic, production-ready |
| Mastra | TypeScript | mastra-ai | TS-first, observational memory |
| Smolagents | Python | huggingface | ~1000 lines minimal |
| DSPy | Python | stanfordnlp | Programming not prompting, auto-optimizes |

### Key GitHub Projects (Agent Category)
- **OpenClaw**: 188k ⭐, fastest-growing ever. Self-hosted agent across WhatsApp/Telegram/Slack/Discord/Signal
- **OpenAI Codex CLI**: terminal agent with sandbox, MCP, subagents
- **Aider**: OSS pair programmer, git-aware, any LLM
- **Browser Use**: OSS browser agent library
- **n8n**: OSS workflow + AI agent nodes
- **Dify**: OSS LLMOps, visual agent builder, RAG, 130k+ ⭐
- **Langfuse**: OSS LLM observability
- **Ollama**: Local LLM runner, 162k+ ⭐
- **awesome-ai-agents-2026**: 340+ resources, 20 categories, 1.5k ⭐

### Protocols & Standards (2026)
- **MCP**: "USB-C for AI" — tools, resources, prompts, MCP Apps (rich UIs in chat)
- **A2A**: Google's Agent-to-Agent protocol
- **MCP Gateways**: Enterprise auth/routing/observability
- **AGENTS.md**: Industry standard for agent instructions (Linux Foundation)
- **GNAP**: Git-Native Agent Protocol — coordinate AI teams with 4 JSON files

### Scientific Papers (July 2026)
- **CIPHER** (cs.AI): Decoupled Exploration-Selection for test-time scaling of data science agents
- **ToolAnchor**: Counterfactual context to boost tool-use in agents
- **MAPS**: Multi-Agent Perspective Spaces for cognitive dialogue
- **CatalogAgent**: Supervisor-mediated self-learning agent system
- **Traccia**: OpenTelemetry-based governance platform for AI agents
- **SCITUS**: Adapting NIST AI RMF to agentic AI threat landscape (v2.0, 57 controls)
- **Ripple**: AI-formalized Lean 4 framework (agents doing formal verification)
- **BrainPilot**: Multi-agent system for automated brain science research
- **NNStar**: End-to-end AI agent for neutron star physics (portable skill)

### 2026 Trends (Key Takeaways for SaaS)
1. **Sandboxed execution** is standard — every major framework now supports isolated environments
2. **MCP became the industry standard** after donation to Linux Foundation
3. **Durable execution** — checkpoint/rehydration, crash recovery (OpenAI, LangGraph, Temporal)
4. **Multi-agent orchestration** — 5+ patterns (sequential, concurrent, handoff, group chat, manager)
5. **Memory layers** — short-term (checkpointers) + long-term (stores) separated
6. **Human-in-the-loop** — approval gates, tool approval, request info
7. **AGENTS.md** became the universal agent instruction format (60k+ repos)
8. **Python dominates** agent frameworks; TypeScript growing (Mastra, LangGraph JS)

### Routing
- `/whatsapp-inbox` → renamed to `/whatsapp/routing` (commit `b7544234`)
- `/super-admin/whatsapp/companies/:companyId/inbox` → `/super-admin/whatsapp/companies/:companyId/routing`
- Old chat at `/whatsapp/chat` and `/whatsapp`
- API endpoints (`/api/v1/whatsapp-inbox`) unchanged
