# maxp-mcp-catalog

First production MCP server for the MaxP platform. Exposes catalog
capabilities (product search, inventory check, product details) over MCP
`streamable_http` on port 7100.

The server is the reference implementation for all future MaxP MCP servers.
All tool calls are routed through the MaxP backend
`/api/v1/ai-bridge/tools/execute` bridge, so the agent never talks to the
database directly.

## Run

```bash
cd apps/mcp-servers/catalog-mcp
MAXP_API_URL=http://localhost:3007 \
MAXP_SERVICE_TOKEN=<bridge-token> \
uv run python -m maxp_mcp_catalog
```

The server listens on `http://127.0.0.1:7100/mcp` (override host and port
with `CATALOG_MCP_HOST` and `CATALOG_MCP_PORT`).

## Tools

| Tool              | Inputs                                  | Bridge tool       |
| ----------------- | --------------------------------------- | ----------------- |
| `search`          | `query: str, limit: int = 20`           | `product.search`  |
| `inventory_check` | `product_id: str`                       | `inventory.check` |
| `product_get`     | `product_id: str`                       | `product.get_by_id` |

All three tools are read-only and Pydantic-validated. On 4xx/5xx responses
the tool returns a `CallToolResult` with `isError: True` rather than
raising, so the MCP server keeps serving.

## Test

```bash
cd apps/mcp-servers/catalog-mcp
uv run pytest -v
```

The tests use `respx` to mock the MaxP backend and the
`mcp.client.streamable_http` client for the JSON-RPC round-trip test.
