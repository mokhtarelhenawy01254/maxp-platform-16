from __future__ import annotations

from typing import Any

import pytest

from src.llm.tool_parsers import get_parser
from src.llm.tool_parsers.base import BaseToolParser

_SAMPLE_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "test_tool",
            "description": "A test tool",
            "parameters": {
                "type": "object",
                "properties": {"query": {"type": "string"}},
                "required": ["query"],
            },
        },
    }
]

_SAMPLE_OUTPUT = (
    '<|tool_call|>test_tool{"query":<|"|">hello<|"|>}<tool_call|>'
)


def _discover_parsers() -> list[type[BaseToolParser]]:
    """Auto-discover all concrete BaseToolParser subclasses via get_parser."""
    parsers: set[type[BaseToolParser]] = set()
    for model, provider in [
        ("gpt-4o", None),
        ("gemma-4-31b-it", "GOOGLE"),
        ("deepseek-chat", "DEEPSEEK"),
    ]:
        p = get_parser(model, provider)
        parsers.add(type(p))
    return sorted(parsers, key=lambda cls: cls.__name__)


def pytest_generate_tests(metafunc: pytest.Metafunc) -> None:
    if "parser_cls" in metafunc.fixturenames:
        metafunc.parametrize(
            "parser_cls",
            _discover_parsers(),
            ids=lambda cls: cls.__name__,
        )


@pytest.fixture
def sample_tools() -> list[dict[str, Any]]:
    return list(_SAMPLE_TOOLS)


@pytest.fixture
def sample_output() -> str:
    return _SAMPLE_OUTPUT
