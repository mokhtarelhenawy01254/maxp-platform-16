# Feature Requests

Capabilities requested by the user.

---

## [FEAT-20260702-001] automated_knowledge_updates

**Logged**: 2026-07-02T12:00:00Z
**Priority**: high
**Status**: resolved
**Area**: docs

### Requested Capability
Keep the AI's knowledge about AI frameworks, models, and techniques updated beyond its training cutoff.

### User Context
User is building MaxP Agentic AI platform. Needs accurate, current information about:
- Latest LLM models (GPT-5.x, Claude 5, Gemini, etc.)
- Agent frameworks (OpenAI Agents SDK, MCP, LangGraph, etc.)
- Best practices for agent architecture in 2025-2026

### Complexity Estimate
medium

### Suggested Implementation
- Create `ai-knowledge-base.md` with structured, up-to-date AI knowledge
- Set up Fresh Research Protocol that forces web research before claims
- Schedule weekly automated research via Windows Task Scheduler
- Source tracking in `source-map.md` with verification dates and confidence levels

### Resolution
- **Resolved**: 2026-07-02T12:00:00Z
- **Notes**: All implemented. See `ai-knowledge-base.md`, AGENTS.md Knowledge Update Protocol, and `ai-knowledge-refresh-weekly` scheduled task.

---
