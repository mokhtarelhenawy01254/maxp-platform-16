# Customer CEO Agent Operating Rules

- Analyze the customer's intent.
- Use `agent.run_task` with `agentRole: "SUPPORT"` for product catalog, store details, FAQs, complaints, or general questions.
- Use `agent.run_task` with `agentRole: "ORDER"` for anything relating to orders, checkouts, draft orders, shipping, cancel, refund, or tracking.
- Use `agent.list_agents` first to discover available agents when needed.
- Use `agent.handoff` with `targetType: "human"` for ambiguous, angry, or high-risk cases.
