from __future__ import annotations

import itertools
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
    """MCP client using Streamable HTTP JSON-RPC transport.

    Connects to MCP servers, discovers tools, and calls them.
    Replaces the Node.js McpServerRegistry in Python.
    """

    def __init__(
        self,
        server_url: str,
        server_name: str,
        api_key: str | None = None,
        transport: str = "streamable_http",
    ) -> None:
        self.server_url = server_url.rstrip("/")
        self.server_name = server_name
        self.api_key = api_key
        self.transport = transport
        self._client: httpx.AsyncClient | None = None
        self._tools: dict[str, MCPTool] = {}
        self._ids = itertools.count(1)
        self._initialized = False
        self._session_id: str | None = None
        self._log = logger.bind(server=server_name, url=server_url)

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None:
            headers = {
                "Accept": "application/json",
                "Content-Type": "application/json",
            }
            if self.api_key:
                headers["Authorization"] = f"Bearer {self.api_key}"
            self._client = httpx.AsyncClient(
                headers=headers,
                timeout=30.0,
                trust_env=False,
            )
        return self._client

    def _endpoint(self, path: str = "") -> str:
        return f"{self.server_url}{path}"

    async def _rpc(self, method: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
        client = await self._get_client()
        request_id = next(self._ids)
        response = await client.post(
            self._endpoint(),
            json={
                "jsonrpc": "2.0",
                "id": request_id,
                "method": method,
                "params": params or {},
            },
        )
        response.raise_for_status()
        session_id = response.headers.get("Mcp-Session-Id") or response.headers.get("mcp-session-id")
        if session_id and session_id != self._session_id:
            self._session_id = session_id
            client.headers["Mcp-Session-Id"] = session_id

        data = response.json()
        if data.get("id") != request_id:
            raise RuntimeError(f"MCP response id mismatch for {method}")
        if data.get("error"):
            from mcp.shared.exceptions import McpError
            from mcp.types import ErrorData

            error = data["error"]
            raise McpError(
                ErrorData(
                    code=int(error.get("code", 0)),
                    message=str(error.get("message") or f"MCP {method} error"),
                    data=error.get("data"),
                )
            )
        result = data.get("result", {})
        return result if isinstance(result, dict) else {"value": result}

    async def _initialize(self) -> None:
        if self._initialized:
            return
        await self._rpc(
            "initialize",
            {
                "protocolVersion": "2025-06-18",
                "capabilities": {},
                "clientInfo": {
                    "name": "maxp-ai-service",
                    "version": "0.1.0",
                },
            },
        )
        self._initialized = True

    async def _list_tools_legacy_rest(self) -> list[MCPTool]:
        client = await self._get_client()
        response = await client.post(self._endpoint("/mcp/v1/tools/list"))
        response.raise_for_status()
        data = response.json()
        return [
            MCPTool(
                name=tool_data["name"],
                description=tool_data.get("description", ""),
                input_schema=tool_data.get("inputSchema", {}),
                server_name=self.server_name,
            )
            for tool_data in data.get("tools", [])
        ]

    async def list_tools(self) -> list[MCPTool]:
        try:
            if self.transport == "legacy_rest":
                tools = await self._list_tools_legacy_rest()
            else:
                await self._initialize()
                data = await self._rpc("tools/list")
                tools = [
                    MCPTool(
                        name=tool_data["name"],
                        description=tool_data.get("description", ""),
                        input_schema=tool_data.get("inputSchema") or tool_data.get("input_schema") or {},
                        server_name=self.server_name,
                    )
                    for tool_data in data.get("tools", [])
                ]
            for tool in tools:
                self._tools[tool.name] = tool
            self._log.info("tools discovered", count=len(tools), transport=self.transport)
            return tools
        except Exception as exc:
            self._log.warning("failed to list tools", error=str(exc), transport=self.transport)
            return []

    async def read_resource(self, uri: Any) -> Any:
        """Read an MCP resource using the shape expected by agent-framework.

        ``agent_framework.MCPSkillsSource`` calls ``read_resource`` on the MCP
        client session and expects an ``mcp.types.ReadResourceResult``. Keeping
        this adapter here lets MaxP's existing authenticated HTTP MCP client feed
        the SDK skills source without a second MCP client stack.
        """
        from mcp.types import BlobResourceContents, ReadResourceResult, TextResourceContents

        await self._initialize()
        uri_str = str(uri)
        result = await self._rpc("resources/read", {"uri": uri_str})
        contents = []
        for item in result.get("contents") or []:
            if not isinstance(item, dict):
                continue
            item_uri = item.get("uri") or uri_str
            mime_type = item.get("mimeType") or item.get("mime_type")
            if item.get("text") is not None:
                contents.append(
                    TextResourceContents(
                        uri=item_uri,
                        mimeType=mime_type,
                        text=str(item["text"]),
                    )
                )
            elif item.get("blob") is not None:
                contents.append(
                    BlobResourceContents(
                        uri=item_uri,
                        mimeType=mime_type,
                        blob=str(item["blob"]),
                    )
                )
        return ReadResourceResult(contents=contents)

    async def _call_tool_legacy_rest(
        self,
        tool_name: str,
        arguments: dict[str, Any],
    ) -> dict[str, Any]:
        client = await self._get_client()
        response = await client.post(
            self._endpoint("/mcp/v1/tools/call"),
            json={
                "name": tool_name,
                "arguments": arguments,
            },
        )
        response.raise_for_status()
        return response.json()

    async def call_tool(
        self,
        tool_name: str,
        arguments: dict[str, Any],
    ) -> dict[str, Any]:
        full_name = f"mcp_{self.server_name}_{tool_name}"
        try:
            if self.transport == "legacy_rest":
                result = await self._call_tool_legacy_rest(tool_name, arguments)
            else:
                await self._initialize()
                result = await self._rpc(
                    "tools/call",
                    {
                        "name": tool_name,
                        "arguments": arguments,
                    },
                )
            success = not bool(result.get("isError"))
            self._log.info("tool called", tool=tool_name, status="success" if success else "error")
            return {"tool": full_name, "success": success, "result": result}
        except Exception as exc:
            self._log.warning("tool call failed", tool=tool_name, error=str(exc))
            return {"tool": full_name, "success": False, "error": str(exc)}

    async def close(self) -> None:
        if self._client:
            await self._client.aclose()
            self._client = None
