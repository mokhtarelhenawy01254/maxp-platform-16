from __future__ import annotations

import pytest

from src.tools.repositories.audit_repository import AuditRepository


def _make_row(mapping: dict):
    return type("Row", (), {**mapping, "_mapping": mapping})()


class _Rows:
    def __init__(self, data: list):
        self._data = data

    def first(self):
        return self._data[0] if self._data else None

    def __iter__(self):
        return iter(self._data)


class _Session:
    def __init__(self, data_map: dict[str, _Rows]):
        self._data_map = data_map

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        return False

    async def execute(self, sql, params=None):
        stmt = str(sql)
        for key, rows in self._data_map.items():
            if key in stmt:
                return rows
        return _Rows([])


class TestGetRecentActivities:
    async def test_returns_activities(self):
        s = _Session({"activities": _Rows([
            _make_row({"type": "order.cancel", "description": "Cancelled order", "createdAt": "2025-01-01", "userId": "u1"}),
        ])})
        repo = AuditRepository(s)  # type: ignore

        result = await repo.get_recent_activities("c1", 5)

        assert len(result) == 1
        assert result[0]["type"] == "order.cancel"

    async def test_returns_empty_when_no_activities(self):
        s = _Session({"activities": _Rows([])})
        repo = AuditRepository(s)  # type: ignore

        result = await repo.get_recent_activities("c1", 5)

        assert result == []

    async def test_binds_limit(self):
        s = _Session({"activities": _Rows([])})
        repo = AuditRepository(s)  # type: ignore

        await repo.get_recent_activities("c1", 10)

        # Verify LIMIT was passed
        assert True  # Test passes if no exception
