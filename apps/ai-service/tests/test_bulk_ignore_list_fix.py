"""Regression test for the bulk import silent-drop bug.

The original `bulk_add_ignore_entries` ran every INSERT inside a single
AsyncSession transaction. When a single statement failed (e.g. a
``UNIQUE (company_id, phone_number)`` violation), PostgreSQL marked the
whole transaction as aborted, so every subsequent ``session.execute``
silently failed. The result: 3 rows inserted out of 53 with no error
visible to the user.

The fix wraps each row in ``session.begin_nested()`` (savepoint) and
uses ``ON CONFLICT (company_id, phone_number) DO NOTHING`` so duplicates
are atomic no-ops. This test exercises the new code path with a mix of
new and duplicate numbers and asserts that the entire batch survives.
"""
from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock

import pytest
from sqlalchemy.exc import IntegrityError

from src.api.admin import whatsapp_ai_ignore_list as ignore_list_module


# A realistic fixed timestamp that pydantic accepts for ``datetime``.
_NOW = datetime(2026, 1, 1, 12, 0, 0, tzinfo=timezone.utc)


def _ok_row(**kwargs):
    """Plain dict — `.mappings().one_or_none()` returns this."""
    base = {
        "id": "00000000-0000-0000-0000-000000000000",
        "company_id": "COMPANY_A",
        "phone_number": "966500000000",
        "label": None,
        "notes": None,
        "added_by_user_id": "user_1",
        "created_at": _NOW,
        "updated_at": _NOW,
    }
    base.update(kwargs)
    return base


def _make_execute_result(row_or_none):
    """Build a fake `row` object whose `.mappings().one_or_none()` returns
    ``row_or_none``. We avoid MagicMock here because MagicMock's
    auto-attribute magic is fragile and tends to swallow `return_value`."""
    class _Map:
        def one_or_none(self_inner):
            return row_or_none

    class _Res:
        def mappings(self_inner):
            return _Map()

    return _Res()


def _build_session(*, fail_on_index: int | None = None,
                   return_row: bool = True) -> MagicMock:
    """Mock AsyncSession.

    If ``fail_on_index`` is set, the (fail_on_index+1)th call to
    ``session.execute`` raises ``IntegrityError`` to simulate a
    duplicate-key violation. If ``return_row`` is False, every result
    is empty (one_or_none returns None) to simulate "ON CONFLICT DO
    NOTHING" duplicates.
    """
    session = MagicMock()
    session.commit = AsyncMock(return_value=None)
    session.rollback = AsyncMock(return_value=None)

    # begin_nested() returns an async context manager — the fix's
    # `async with session.begin_nested():` enters it on every row.
    nested = MagicMock()
    nested.__aenter__ = AsyncMock(return_value=nested)
    nested.__aexit__ = AsyncMock(return_value=None)
    session.begin_nested = MagicMock(return_value=nested)

    call_count = {"n": 0}

    async def fake_execute(*args, **kwargs):
        call_count["n"] += 1
        idx = call_count["n"] - 1
        if fail_on_index is not None and idx == fail_on_index:
            raise IntegrityError(
                "INSERT ... duplicate key value violates unique constraint",
                params=None,
                orig=Exception("duplicate"),
            )
        # The second positional arg is the bound-parameters dict; the
        # real call is `session.execute(text("..."), {...})` so the dict
        # is positional, not keyword. Fall back to kwargs for safety.
        params = (args[1] if len(args) > 1 else None) or kwargs or {}
        if return_row:
            return _make_execute_result(_ok_row(phone_number=params.get("pn")))
        return _make_execute_result(None)

    session.execute = AsyncMock(side_effect=fake_execute)
    return session


def _build_body(n: int) -> ignore_list_module.IgnoreBulkCreate:
    return ignore_list_module.IgnoreBulkCreate(
        companyId="COMPANY_A",
        items=[
            ignore_list_module.IgnoreEntryCreate(
                companyId="COMPANY_A",
                phoneNumber=f"96650000000{i}",
            )
            for i in range(n)
        ],
    )


@pytest.mark.asyncio
async def test_bulk_add_survives_first_row_duplicate_with_savepoint():
    """The 3rd row triggers a unique-constraint error. With the fix, the
    savepoint isolates that row so the remaining rows still insert.
    """
    session = _build_session(fail_on_index=2)
    body = _build_body(5)

    result = await ignore_list_module.bulk_add_ignore_entries(
        body=body, session=session, admin={"sub": "user_1"}
    )

    # 4 rows should have been "inserted" (the failing 3rd is skipped).
    assert result.inserted == 4
    assert result.skipped == 1
    assert len(result.entries) == 4
    # commit() called exactly once at the end.
    assert session.commit.await_count == 1
    # Each row entered its own savepoint.
    assert session.begin_nested.call_count == 5


@pytest.mark.asyncio
async def test_bulk_add_inserts_all_when_no_conflicts():
    session = _build_session()
    body = _build_body(53)

    result = await ignore_list_module.bulk_add_ignore_entries(
        body=body, session=session, admin={"sub": "user_1"}
    )

    assert result.inserted == 53
    assert result.skipped == 0
    assert session.begin_nested.call_count == 53


@pytest.mark.asyncio
async def test_bulk_add_handles_all_rows_being_duplicates():
    """If every row collides, we must still get a clean response: 0
    inserted, all skipped, commit() once, no exceptions propagated."""
    session = _build_session(return_row=False)
    body = _build_body(10)

    result = await ignore_list_module.bulk_add_ignore_entries(
        body=body, session=session, admin={"sub": "user_1"}
    )

    assert result.inserted == 0
    assert result.skipped == 10
    assert session.begin_nested.call_count == 10


@pytest.mark.asyncio
async def test_bulk_add_phone_normalization_strips_non_digits():
    """Verify _normalize_phone runs on every item (e.g. ``+20 100 ...``
    becomes ``20100...``) before the unique-constraint check."""
    session = _build_session()
    body = ignore_list_module.IgnoreBulkCreate(
        companyId="COMPANY_A",
        items=[
            ignore_list_module.IgnoreEntryCreate(
                companyId="COMPANY_A", phoneNumber="+20 100 123 4567"
            ),
            ignore_list_module.IgnoreEntryCreate(
                companyId="COMPANY_A", phoneNumber="0020 100 765 4321"
            ),
        ],
    )
    captured_params: list[dict] = []

    original_execute = session.execute.side_effect

    async def capture(*args, **kwargs):
        # The bound-params dict is the second positional arg of
        # session.execute(text(...), {...}).
        params = (args[1] if len(args) > 1 else None) or kwargs or {}
        captured_params.append(params)
        return _make_execute_result(_ok_row(phone_number=params.get("pn")))

    session.execute = AsyncMock(side_effect=capture)
    result = await ignore_list_module.bulk_add_ignore_entries(
        body=body, session=session, admin={"sub": "user_1"}
    )
    assert result.inserted == 2
    assert captured_params[0]["pn"] == "201001234567"
    assert captured_params[1]["pn"] == "00201007654321"
