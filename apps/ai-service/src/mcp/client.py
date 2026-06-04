from __future__ import annotations

from typing import Any

import httpx
import structlog

logger = structlog.get_logger(__name__)


class MCPTool:
    """Represents a tool discovered from an MCP server."""

    def __init__(
        self,
        name: str,
        description: str,
        input_schema: dict[str, Any],
        server_name: str,
    ) -> None:
        self.name = name
        self.description = description
        self.input_schema = input_schema
        self.server_name = server_name


class MCPClient:
    """MCP client using StreamableHTTP transport.

    Connects to MCP servers, discovers tools, and calls them.
    Replaces the Node.js McpServerRegistry in Python.
    """

    def __init__(self, server_url: str, server_name: str, api_key: str | None = None) -> None:
        self.server_url = server_url.rstrip("/")
        self.server_name = server_name
        self.api_key = api_key
        self._client: httpx.AsyncClient | None = None
        self._tools: dict[str, MCPTool] = {}
        self._log = logger.bind(server=server_name, url=server_url)

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None:
            headers = {"Content-Type": "application/json"}
            if self.api_key:
                headers["Authorization"] = f"Bearer {self.api_key}"
            self._client = httpx.AsyncClient(
                base_url=self.server_url,
                headers=headers,
                timeout=30.0,
            )
        return self._client

    async def list_tools(self) -> list[MCPTool]:
        client = await self._get_client()
        try:
            response = await client.post("/mcp/v1/tools/list")
            response.raise_for_status()
            data = response.json()
            tools = []
            for tool_data in data.get("tools", []):
                tool = MCPTool(
                    name=tool_data["name"],
                    description=tool_data.get("description", ""),
                    input_schema=tool_data.get("inputSchema", {}),
                    server_name=self.server_name,
                )
                self._tools[tool.name] = tool
                tools.append(tool)
            self._log.info("tools discovered", count=len(tools))
            return tools
        except Exception as exc:
            self._log.warning("failed to list tools", error=str(exc))
            return []

    async def call_tool(
        self,
        tool_name: str,
        arguments: dict[str, Any],
    ) -> dict[str, Any]:
        client = await self._get_client()
        full_name = f"mcp_{self.server_name}_{tool_name}"
        try:
            response = await client.post(
                "/mcp/v1/tools/call",
                json={
                    "name": tool_name,
                    "arguments": arguments,
                },
            )
            response.raise_for_status()
            result = response.json()
            self._log.info("tool called", tool=tool_name, status="success")
            return {"tool": full_name, "success": True, "result": result}
        except Exception as exc:
            self._log.warning("tool call failed", tool=tool_name, error=str(exc))
            return {"tool": full_name, "success": False, "error": str(exc)}

    async def close(self) -> None:
        if self._client:
            await self._client.aclose()
            self._client = None
