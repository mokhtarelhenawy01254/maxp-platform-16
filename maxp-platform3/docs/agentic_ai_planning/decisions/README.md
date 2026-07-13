# Agentic AI Decision Logs

Use this folder for durable architecture decisions produced with the `agentic-ai-research-radar` skill.

## Filename

`YYYY-MM-DD-short-topic.md`

Example: `2026-05-26-agent-runtime-persistence.md`

## When To Save A Decision

Save a decision log when the choice affects agent runtime behavior, memory, RAG, DAG planning, MCP/tool boundaries, approvals, observability, model routing, persistence, customer replies, merchant UI strings, or production cost/security posture.

Do not save a log for quick triage answers unless the decision is likely to be revisited.

## Required Checks

- Use fresh sources and record source type, date checked, currentness note, and confidence.
- Map the decision to current MaxP implementation state, not only the roadmap.
- Check `AGENTS.md`: no hardcoded customer-facing replies, merchant UI strings use i18n, tool outputs use English keys/enums, and tool data stays structured.
- Include verification steps and the files/services/tests likely affected.
