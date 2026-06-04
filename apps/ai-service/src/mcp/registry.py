from __future__ import annotations

from typing import Any

import structlog

from src.config import get_settings
from src.mcp.client import MCPClient

logger = structlog.get_logger(__name__)


class MCPRegistry:
    """Registry for MCP server connections.

    Mirrors the Node.js McpServerRegistry for Python.
    Discovers tools from configured MCP servers and makes them available.
    """

    def __init__(self) -> None:
        self._servers: dict[str, MCPClient] = {}
        self._tools: dict[str, dict[str, Any]] = {}
        self._log = logger

    async def register_server(
        self,
        name: str,
        url: str,
        api_key: str | None = None,
    ) -> None:
        if name in self._servers:
            self._log.warning("server already registered", name=name)
            return

        client = MCPClient(server_url=url, server_name=name, api_key=api_key)
        self._servers[name] = client

        tools = await client.list_tools()
        for tool in tools:
            full_name = f"mcp_{name}_{tool.name}"
            self._tools[full_name] = {
                "name": full_name,
                "description": tool.description,
                "input_schema": tool.input_schema,
                "server_name": name,
                "original_name": tool.name,
            }

        self._log.info("server registered", name=name, tools=len(tools))

    async def register_from_config(self) -> None:
        """Register servers configured in Settings.mcp_servers JSON."""
        settings = get_settings()
        servers = settings.mcp_servers or []
        for server in servers:
            await self.register_server(
                name=server["name"],
                url=server["url"],
                api_key=server.get("api_key"),
            )

    def get_tool(self, full_name: str) -> dict[str, Any] | None:
        return self._tools.get(full_name)

    def get_all_tools(self) -> list[dict[str, Any]]:
        return list(self._tools.values())

    def get_server_tools(self, server_name: str) -> list[dict[str, Any]]:
        prefix = f"mcp_{server_name}_"
        return [
            t for name, t in self._tools.items() if name.startswith(prefix)
        ]

    async def call_tool(self, full_name: str, arguments: dict[str, Any]) -> dict[str, Any]:
        tool_info = self._tools.get(full_name)
        if not tool_info:
            return {"success": False, "error": f"Tool {full_name} not found"}

        client = self._servers.get(tool_info["server_name"])
        if not client:
            return {"success": False, "error": f"Server {tool_info['server_name']} not found"}

        return await client.call_tool(tool_info["original_name"], arguments)

    async def disconnect_all(self) -> None:
        for name, client in self._servers.items():
            await client.close()
            self._log.info("disconnected", server=name)
        self._servers.clear()
        self._tools.clear()


_mcp_registry: MCPRegistry | None = None


def get_mcp_registry() -> MCPRegistry:
    global _mcp_registry
    if _mcp_registry is None:
        _mcp_registry = MCPRegistry()
    return _mcp_registry
