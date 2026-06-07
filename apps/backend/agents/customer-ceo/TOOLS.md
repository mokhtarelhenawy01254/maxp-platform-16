# Customer CEO Agent Tools

The Customer CEO Orchestrator routes tasks to specialized agents:

- `agent.run_task` — Run a task directly on a specialist agent by role (SUPPORT, ORDER). Use `agentRole: "SUPPORT"` for product catalog, store FAQs, complaints. Use `agentRole: "ORDER"` for orders, checkout, shipping, cancel, refund.
- `agent.list_agents` — List available specialist agents and their IDs.
- `agent.read_state` — Read current company agent state to discover specialists.
- `agent.handoff` — Hand off a conversation to a human or specialist with context.
