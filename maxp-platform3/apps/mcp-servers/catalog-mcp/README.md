# maxp-mcp-catalog

First production MCP server for the MaxP platform. Exposes catalog
capabilities (product search, inventory check, product details) over MCP
`streamable_http` on port 7100.

The server is the reference implementation for all future MaxP MCP servers.
All tool calls are routed directly to the **Python AI Service** (`/mcp/tools/execute`),
bypassing the Node.js backend entirely. The AI service executes tools via direct SQL.

## Run

```bash
cd apps/mcp-servers/catalog-mcp
MAXP_AI_SERVICE_URL=http://localhost:8000 \
MAXP_SERVICE_TOKEN=<bridge-token> \
uv run python -m maxp_mcp_catalog
```

The server listens on `http://127.0.0.1:7100/mcp` (override host and port
with `CATALOG_MCP_HOST` and `CATALOG_MCP_PORT`).

Environment variables:
- `MAXP_AI_SERVICE_URL` - Python AI Service URL (default: `http://localhost:8000`)
- `MAXP_SERVICE_TOKEN` - Service token for authentication
- `MAXP_API_URL` - Legacy, kept for backwards compatibility

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
