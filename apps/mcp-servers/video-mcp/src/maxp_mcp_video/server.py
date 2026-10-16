from __future__ import annotations

import os

import structlog
from mcp.server.fastmcp import FastMCP

from maxp_mcp_video.auth_context import MerchantAuthMiddleware
from maxp_mcp_video.tools import register_tools

logger = structlog.get_logger(__name__)

SERVER_NAME = "maxp-video"
SERVER_INSTRUCTIONS = (
    "MaxP Video Generation MCP Server. Exposes tools to generate videos using "
    "Google Veo, check generation status, and list generated video assets."
)
DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 7102


def _build_server() -> FastMCP:
    host = os.environ.get("VIDEO_MCP_HOST", DEFAULT_HOST)
    port = int(os.environ.get("VIDEO_MCP_PORT", str(DEFAULT_PORT)))

    mcp = FastMCP(
        name=SERVER_NAME,
        instructions=SERVER_INSTRUCTIONS,
        host=host,
        port=port,
        stateless_http=True,
        json_response=True,
    )
    register_tools(mcp)
    return mcp


mcp: FastMCP = _build_server()


def build_asgi_app():
    """Streamable HTTP app with the merchant context middleware attached."""
    app = mcp.streamable_http_app()
    app.add_middleware(MerchantAuthMiddleware)
    return app


def serve() -> None:
    import uvicorn

    logger.info("starting_video_mcp_server", name=SERVER_NAME, host=mcp.settings.host, port=mcp.settings.port)
    uvicorn.run(build_asgi_app(), host=mcp.settings.host, port=mcp.settings.port)


if __name__ == "__main__":
    serve()
