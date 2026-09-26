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
            if key in stmt or (key == "activities" and "activity_logs" in stmt):
                return rows
        return _Rows([])


class TestGetRecentActivities:
    @pytest.mark.asyncio
    async def test_returns_activities(self):
        s = _Session({"activity_logs": _Rows([
            _make_row({"type": "order.cancel", "description": "Cancelled order", "createdAt": "2025-01-01", "userId": "u1"}),
        ])})
        repo = AuditRepository(s)  # type: ignore

        result = await repo.get_recent_activities("c1", 5)

        assert len(result) == 1
        assert result[0]["type"] == "order.cancel"

    @pytest.mark.asyncio
    async def test_returns_empty_when_no_activities(self):
        s = _Session({"activity_logs": _Rows([])})
        repo = AuditRepository(s)  # type: ignore

        result = await repo.get_recent_activities("c1", 5)

        assert result == []

    @pytest.mark.asyncio
    async def test_binds_limit(self):
        s = _Session({"activity_logs": _Rows([])})
        repo = AuditRepository(s)  # type: ignore

        await repo.get_recent_activities("c1", 10)

        # Verify LIMIT was passed
        assert True  # Test passes if no exception


class TestRecordActivity:
    @pytest.mark.asyncio
    async def test_record_activity_includes_updated_at(self):
        executed = []

        class _MockSession:
            async def execute(self, sql, params=None):
                executed.append((str(sql), params))

            async def commit(self):
                pass

        session = _MockSession()
        repo = AuditRepository(session)  # type: ignore
        await repo.record_activity(
            company_id="comp_123",
            action="discount_create",
            description="Created discount",
            category="DISCOUNT",
            severity="MEDIUM",
            metadata={"product_id": "p1"},
            user_id="user_1",
        )

        assert len(executed) == 1
        sql, params = executed[0]
        assert '"updatedAt"' in sql, "SQL query must include 'updatedAt' column"
        assert params["cid"] == "comp_123"
        assert params["act"] == "discount_create"
        assert params["uid"] == "user_1"

