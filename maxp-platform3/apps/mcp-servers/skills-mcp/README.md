# skills-mcp

MaxP Skills MCP server. Exposes `apps/ai-service/skills/` as MCP **resources** so
`agent_framework.MCPSkillsSource` can discover and serve them dynamically.

## Resources

- `skill://index.json` (`application/json`) — full index of available skills
- `skill://<slug>/SKILL.md` (`text/markdown`) — markdown body for one skill

The index is rebuilt in-memory on startup and hot-reloaded via `watchfiles`
whenever a `skill.json` or `SKILL.md` changes underneath the skills directory.

## Run

```bash
uv run python -m maxp_mcp_skills
```

The server listens on `http://0.0.0.0:7101/mcp` using Streamable HTTP transport.

## Configuration

| Env var            | Default                            | Purpose                          |
| ------------------ | ---------------------------------- | -------------------------------- |
| `SKILLS_MCP_PORT`  | `7101`                             | TCP port for Streamable HTTP     |
| `SKILLS_MCP_HOST`  | `0.0.0.0`                          | Bind host                        |
| `SKILLS_DIR`       | `apps/ai-service/skills` (resolved)| Directory to scan for skills     |

## Tests

```bash
uv run pytest -v
```
