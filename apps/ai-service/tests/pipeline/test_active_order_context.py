"""Active-order context injection tests (2026-09-23 context-engineering fix:
never re-ask the customer for facts already on the order)."""

from __future__ import annotations

from types import SimpleNamespace

import pytest

from src.pipeline.stages.skills_pipeline import (
    _build_active_order_block,
    _looks_like_cuid,
)


def _ctx(**overrides):
    base = {
        "message": "فين أوردي؟",
        "thread_id": "t1",
        "company_id": "comp1",
        "customer_id": None,
        "conversation_id": None,
        "channel": "messenger",
    }
    base.update(overrides)
    return SimpleNamespace(**base)


def test_cuid_detection():
    assert _looks_like_cuid("cmleybpf70028juo2wwpmp8rt")
    assert not _looks_like_cuid("test_sm_swan_1")
    assert not _looks_like_cuid("")
    assert not _looks_like_cuid(None)


@pytest.mark.asyncio
async def test_non_customer_channel_skips_injection(monkeypatch):
    called = {"phone": False}

    async def fake_phone(ctx):
        called["phone"] = True
        return "01000000000"

    monkeypatch.setattr(
        "src.pipeline.stages.skills_pipeline._resolve_customer_phone", fake_phone
    )
    block = await _build_active_order_block(_ctx(channel="dashboard_internal"))
    assert block == ""
    assert called["phone"] is False


@pytest.mark.asyncio
async def test_no_phone_returns_empty(monkeypatch):
    async def fake_phone(ctx):
        return None

    monkeypatch.setattr(
        "src.pipeline.stages.skills_pipeline._resolve_customer_phone", fake_phone
    )
    block = await _build_active_order_block(_ctx())
    assert block == ""


@pytest.mark.asyncio
async def test_block_contains_order_facts(monkeypatch):
    from sqlalchemy.exc import SQLAlchemyError

    class FakeResult:
        def __init__(self, value):
            self._value = value

        def scalar(self):
            return self._value

        def mappings(self):
            return self

        def first(self):
            return self._value

        def all(self):
            return self._value or []

    class FakeSession:
        def __init__(self):
            self.queries = []

        async def __aenter__(self):
            return self

        async def __aexit__(self, *a):
            return False

        async def execute(self, query, params):
            self.queries.append((str(query), params))
            sql = str(query)
            if "FROM public.conversations" in sql:
                return FakeResult("01153718071")
            if "FROM public.orders o" in sql:
                return FakeResult({
                    "orderNumber": "ORD-845169-887",
                    "status": "PROCESSING",
                    "payment_method": "CASH",
                    "payment_status": "PENDING",
                    "total": 590.0,
                    "currency": "EGP",
                    "address": "عمرانيه شارع الزهراء برج عبدالله العصيمي الدور الثاني",
                    "governorate": "الجيزة",
                    "city": "",
                    "created_at": "2026-09-17",
                })
            if "FROM public.order_items" in sql:
                return FakeResult([
                    {"name": "Luma", "size": "40", "color": "أزرق جينز", "quantity": 1},
                ])
            raise SQLAlchemyError("unexpected query")

    sessions = [FakeSession()]

    async def fake_phone(ctx):
        return "01153718071"

    monkeypatch.setattr(
        "src.pipeline.stages.skills_pipeline._resolve_customer_phone", fake_phone
    )

    import src.db.session as db_session

    class SessionFactory:
        def __call__(self):
            return sessions[0]

    monkeypatch.setattr(db_session, "async_session", SessionFactory())

    block = await _build_active_order_block(_ctx(company_id="c1"))

    assert "<active_order>" in block and "</active_order>" in block
    assert "ORD-845169-887" in block
    assert "مقاس 40" in block
    assert "أزرق جينز" in block
    assert "الجيزة" in block
    assert "لا تعيد سؤال العميل عنها" in block


@pytest.mark.asyncio
async def test_db_failure_returns_empty_not_crash(monkeypatch):
    import src.db.session as db_session

    async def fake_phone(ctx):
        return "01000000000"

    monkeypatch.setattr(
        "src.pipeline.stages.skills_pipeline._resolve_customer_phone", fake_phone
    )

    class BrokenFactory:
        def __call__(self):
            raise RuntimeError("db down")

    monkeypatch.setattr(db_session, "async_session", BrokenFactory())
    block = await _build_active_order_block(_ctx(company_id="c1"))
    assert block == ""
