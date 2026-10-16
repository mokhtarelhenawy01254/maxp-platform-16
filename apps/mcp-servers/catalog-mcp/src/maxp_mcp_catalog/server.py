from __future__ import annotations

import os

import structlog
from mcp.server.fastmcp import FastMCP

from maxp_mcp_catalog.auth_context import MerchantAuthMiddleware
from maxp_mcp_catalog.backend_client import MaxPBackendClient
from maxp_mcp_catalog.tools import register_tools

logger = structlog.get_logger(__name__)


SERVER_NAME = "maxp-catalog"
SERVER_INSTRUCTIONS = (
    "MaxP catalog MCP server. Exposes read-only product search, "
    "inventory check, and product details tools."
)
DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 7100


def _build_server(
    client: MaxPBackendClient | None = None,
    company_id: str = "default",
) -> FastMCP:
    host = os.environ.get("CATALOG_MCP_HOST", DEFAULT_HOST)
    port = int(os.environ.get("CATALOG_MCP_PORT", str(DEFAULT_PORT)))

    mcp = FastMCP(
        name=SERVER_NAME,
        instructions=SERVER_INSTRUCTIONS,
        host=host,
        port=port,
        stateless_http=True,
        json_response=True,
    )
    register_tools(mcp, client=client, company_id=company_id)
    return mcp


mcp: FastMCP = _build_server()


def build_asgi_app():
    """Streamable HTTP app with the merchant context middleware attached."""
    app = mcp.streamable_http_app()
    app.add_middleware(MerchantAuthMiddleware)
    return app


def serve() -> None:
    import uvicorn

    logger.info("starting_mcp_server", name=SERVER_NAME, host=mcp.settings.host, port=mcp.settings.port)
    uvicorn.run(build_asgi_app(), host=mcp.settings.host, port=mcp.settings.port)


if __name__ == "__main__":
    serve()
