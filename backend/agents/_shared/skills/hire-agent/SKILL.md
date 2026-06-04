# Hire Agent

Use when the manager needs a new specialist agent for a clear role.

## Inputs

- Role or template slug.
- Reason for hiring.
- Required tools and skills.

## Procedure

1. Check existing agents first with `agent.list_agents`.
2. If no suitable agent exists, choose the narrowest approved template.
3. Use `agent.spawn` with least-privileged tools.
4. Record why the agent was created.

## Stop Conditions

- The requested role is unclear.
- The tool scope includes unrelated departments.
- The hire would exceed budget or policy.
