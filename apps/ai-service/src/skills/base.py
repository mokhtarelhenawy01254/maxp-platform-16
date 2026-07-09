from __future__ import annotations
from typing import Any, Callable, Coroutine

from pydantic import BaseModel


class Skill:
    name: str
    description: str
    input_schema: type[BaseModel]
    handler: Callable[..., Coroutine[Any, Any, Any]]

    def __init__(self, name: str, description: str, input_schema: type[BaseModel], handler: Callable, internal_fields: list[str] | None = None):
        self.name = name
        self.description = description
        self.input_schema = input_schema
        self.handler = handler
        self._internal_fields = set(internal_fields or [])

    async def execute(self, **params) -> Any:
        validated = self.input_schema(**params)
        return await self.handler(validated)

    def to_openai_tool(self) -> dict:
        schema = self.input_schema.model_json_schema()
        if self._internal_fields:
            props = schema.get("properties", {})
            for f in self._internal_fields:
                props.pop(f, None)
            required = schema.get("required", [])
            schema["required"] = [r for r in required if r not in self._internal_fields]
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": schema,
                "strict": True,
            }
        }

    def to_gemini_tool(self) -> dict:
        schema = self.input_schema.model_json_schema()
        if self._internal_fields:
            props = schema.get("properties", {})
            for f in self._internal_fields:
                props.pop(f, None)
            required = schema.get("required", [])
            schema["required"] = [r for r in required if r not in self._internal_fields]
        return {
            "name": self.name,
            "description": self.description,
            "parameters": schema,
        }
