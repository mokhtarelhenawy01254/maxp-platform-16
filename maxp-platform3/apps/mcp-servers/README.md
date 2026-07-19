# apps/mcp-servers

Production Model Context Protocol servers for the MaxP platform. Each server
is a standalone Python package that exposes MaxP capabilities over MCP
`streamable_http` and is consumed by the `apps/ai-service` `MCPSkillsSource`
clients.

Servers:

- `catalog-mcp` -> product search, inventory check, product details
  (port 7100, Sprint 1)
- `skills-mcp` -> skill index + SKILL.md serving (port 7101, Sprint 2)

All servers follow the same conventions: hatchling build, `mcp[cli]>=1.2`,
Pydantic-validated tools, structlog, httpx backend bridge, respx-mocked tests.
