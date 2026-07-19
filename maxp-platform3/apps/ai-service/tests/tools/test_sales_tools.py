from __future__ import annotations

import pytest

from src.tools.sales_tools import company_snapshot, sales_revenue


class _Rows:
    def __init__(self, data):
        self._data = data
        self._idx = 0

    def __iter__(self):
        return iter(self._data)

    def first(self):
        return self._data[0] if self._data else None


def _make_row(mapping: dict):
    return type("Row", (), {**mapping, "_mapping": mapping})()


@pytest.mark.asyncio
async def test_sales_revenue_no_company(monkeypatch):
    result = await sales_revenue(company_id="")
    assert result["totalOrders"] == 0
    assert result["revenue"] == "0"


@pytest.mark.asyncio
async def test_sales_revenue_with_data(monkeypatch):
    class _Session:
        call_count = 0

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def execute(self, sql, params):
            _Session.call_count += 1
            statement = str(sql)
            if "COALESCE(SUM(total)" in statement:
                return _Rows([_make_row({
                    "total_orders": 10,
                    "paid_count": 7,
                    "paid_revenue": 5000.0,
                    "avg_value": 714.29,
                })])
            if "GROUP BY status" in statement:
                return _Rows([
                    _make_row({"status": "DELIVERED", "cnt": 5}),
                    _make_row({"status": "PENDING", "cnt": 3}),
                    _make_row({"status": "CANCELLED", "cnt": 2}),
                ])
            return _Rows([])

    monkeypatch.setattr("src.db.session.async_session", lambda: _Session())

    result = await sales_revenue(company_id="comp1", period="month")
    assert result["totalOrders"] == 10
    assert result["ordersCount"] == 7
    assert float(result["revenue"]) == 5000.0
    assert "delivered" in result["byStatus"]


@pytest.mark.asyncio
async def test_company_snapshot_no_company(monkeypatch):
    result = await company_snapshot(company_id="")
    assert result["todayOrders"] == 0
    assert result["lowStockCount"] == 0


@pytest.mark.asyncio
async def test_company_snapshot_with_data(monkeypatch):
    class _Session:
        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def execute(self, sql, params):
            statement = str(sql)
            # First query: has multiple FILTER clauses (pending, confirmed, shipped, etc.)
            if "FILTER (WHERE status = 'PENDING')" in statement and "FILTER (WHERE status = 'CONFIRMED')" in statement:
                return _Rows([_make_row({
                    "total": 5, "revenue": 2000.0,
                    "pending": 2, "confirmed": 1, "shipped": 1, "delivered": 1, "cancelled": 0,
                })])
            # Second query: simple COUNT with status = 'PENDING' (not in FILTER)
            if "status = 'PENDING'" in statement and "FILTER" not in statement:
                return _Rows([_make_row({"cnt": 3})])
            if "FROM products" in statement:
                return _Rows([_make_row({"cnt": 4})])
            return _Rows([])

    monkeypatch.setattr("src.db.session.async_session", lambda: _Session())

    result = await company_snapshot(company_id="comp1")
    assert result["todayOrders"] == 5
    assert result["pendingOrders"] == 3
    assert result["lowStockCount"] == 4
    assert float(result["todayRevenue"]) == 2000.0
