"""Regression tests for the bulk import silent-drop bug.

The original ``bulk_add_ignore_entries`` ran every INSERT inside a single
``AsyncSession`` transaction. When a single statement failed (e.g. a
``UNIQUE (company_id, phone_number)`` violation), PostgreSQL marked the
whole transaction as aborted, so every subsequent ``session.execute``
silently failed. The result: 3 rows inserted out of 53 with no error
visible to the user.

The 2026 fix replaces the per-row loop with a **single multi-row
``INSERT ... ON CONFLICT DO NOTHING RETURNING ...``** emitted via
SQLAlchemy 2.0's PostgreSQL dialect helper. This is structurally immune
to the original bug because a single statement either succeeds or
fails — there is no "first failure poisons the rest" failure mode.

The tests below exercise:

1. **Savepoint-not-needed**: with the multi-row INSERT, the function
   calls ``session.execute`` exactly once and ``commit`` once, even when
   the input contains duplicates.
2. **All-insert**: 53 unique rows → 53 inserted, 0 skipped.
3. **All-duplicates**: 10 rows that all already exist → 0 inserted,
   10 skipped, single execute + single commit.
4. **Phone normalization**: ``+20 100 123 4567`` becomes
   ``201001234567`` *before* the INSERT is built.
5. **Empty-after-filter**: every input row is invalid → 0 inserted,
   skipped == len(items), no DB call at all.
"""
from __future__ import annotations

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from src.api.admin import whatsapp_ai_ignore_list as ignore_list_module


# A realistic fixed timestamp that pydantic accepts for ``datetime``.
_NOW = datetime(2026, 1, 1, 12, 0, 0, tzinfo=timezone.utc)

# The `admin` value FastAPI's dependency injection would resolve to when
# a valid JWT was presented. The endpoint requires it (no `| None`), so
# the tests pass this directly to bypass the auth layer.
_ADMIN_JWT = {"sub": "user_1", "auth_kind": "jwt"}


# ---------------------------------------------------------------------------
# Mock helpers
# ---------------------------------------------------------------------------

def _ok_row(phone_number: str, company_id: str = "COMPANY_A") -> dict:
    """Single row in the shape ``mappings().all()`` returns."""
    return {
        "id": "00000000-0000-0000-0000-000000000000",
        "company_id": company_id,
        "phone_number": phone_number,
        "label": None,
        "notes": None,
        "added_by_user_id": "user_1",
        "created_at": _NOW,
        "updated_at": _NOW,
    }


def _make_batch_result(rows: list[dict] | None) -> MagicMock:
    """Build a fake result that mimics ``session.execute(insert_stmt)``:
    ``.mappings().all()`` returns ``rows`` (which is the list of rows
    that actually inserted — ON CONFLICT DO NOTHING drops the rest)."""

    class _All:
        def all(self_inner) -> list[dict]:
            return rows or []

    class _Map:
        def all(self_inner) -> list[dict]:
            return rows or []

    class _Res:
        def mappings(self_inner) -> _Map:
            return _Map()

    return _Res()


def _make_pg_insert_chain(captured: dict[str, list]) -> tuple[MagicMock, MagicMock]:
    """Patch ``pg_insert`` so the function still produces a real
    SQLAlchemy ``Insert``-shaped object that the mock session can
    ``execute()``, while we record the rows the function passed to it.

    Returns (pg_insert_mock, final_stmt_mock) so the caller can wire
    ``final_stmt_mock`` as the value the session "executes".
    """
    final_stmt = MagicMock(name="InsertStatement")
    insert_builder = MagicMock()
    insert_builder.returning.return_value = final_stmt
    insert_builder.on_conflict_do_nothing.return_value = insert_builder
    pg_insert_mock = MagicMock()
    pg_insert_mock.return_value.values.return_value = insert_builder
    # Capture every .values(...) call.  In our refactor the function
    # only calls .values(...) once with the full list, but record all
    # calls so a regression that splits into multiple values() calls is
    # caught.
    original_values = pg_insert_mock.return_value.values

    def _record(*args, **kwargs):
        captured.setdefault("values_calls", []).append((args, kwargs))
        return insert_builder

    pg_insert_mock.return_value.values.side_effect = _record
    return pg_insert_mock, final_stmt


def _build_session_for_batch(returned_rows: list[dict] | None) -> MagicMock:
    """Mock AsyncSession that returns ``returned_rows`` from a single
    ``session.execute`` call (the multi-row INSERT)."""
    session = MagicMock()
    session.commit = AsyncMock(return_value=None)
    session.rollback = AsyncMock(return_value=None)
    # No more begin_nested — the multi-row INSERT makes it unnecessary.
    session.begin_nested = MagicMock()  # in case any code path still touches it
    session.execute = AsyncMock(
        return_value=_make_batch_result(returned_rows)
    )
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


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_bulk_add_dedupes_duplicates_atomically():
    """5 rows in, 4 of them are already on the list. The single multi-row
    INSERT handles the conflict at the DB level; the response reports
    exactly 4 inserted and 1 skipped, with **one** execute and **one**
    commit.
    """
    body = _build_body(5)
    # The DB returns the 4 rows that actually inserted.
    returned = [
        _ok_row(phone_number=f"96650000000{i}") for i in range(4)
    ]
    session = _build_session_for_batch(returned)

    captured: dict = {}
    pg_mock, _ = _make_pg_insert_chain(captured)
    with patch("src.api.admin.whatsapp_ai_ignore_list.pg_insert", pg_mock):
        result = await ignore_list_module.bulk_add_ignore_entries(
            body=body, session=session, admin=_ADMIN_JWT
        )

    assert result.inserted == 4
    assert result.skipped == 1
    assert len(result.entries) == 4

    # The whole batch lives in a single execute / single commit.
    assert session.execute.await_count == 1
    assert session.commit.await_count == 1
    # The per-row savepoint pattern is gone.
    session.begin_nested.assert_not_called()

    # The single .values(...) call carried all 5 rows.
    assert len(captured["values_calls"]) == 1
    args, _ = captured["values_calls"][0]
    assert len(args[0]) == 5
    inserted_phones = {row["phone_number"] for row in args[0]}
    assert inserted_phones == {
        "966500000000",
        "966500000001",
        "966500000002",
        "966500000003",
        "966500000004",
    }


@pytest.mark.asyncio
async def test_bulk_add_inserts_all_when_no_conflicts():
    """53 unique rows → 53 inserted, 0 skipped, one execute, one commit."""
    body = _build_body(53)
    returned = [_ok_row(phone_number=f"96650000000{i:02d}") for i in range(53)]
    session = _build_session_for_batch(returned)

    captured: dict = {}
    pg_mock, _ = _make_pg_insert_chain(captured)
    with patch("src.api.admin.whatsapp_ai_ignore_list.pg_insert", pg_mock):
        result = await ignore_list_module.bulk_add_ignore_entries(
            body=body, session=session, admin=_ADMIN_JWT
        )

    assert result.inserted == 53
    assert result.skipped == 0
    assert len(result.entries) == 53
    assert session.execute.await_count == 1
    assert session.commit.await_count == 1
    session.begin_nested.assert_not_called()
    # All 53 rows were passed in a single .values([...]) call.
    args, _ = captured["values_calls"][0]
    assert len(args[0]) == 53


@pytest.mark.asyncio
async def test_bulk_add_handles_all_rows_being_duplicates():
    """Every row is a duplicate of an already-existing row. The mock
    returns an empty list (ON CONFLICT DO NOTHING returned nothing).
    The function must report 0 inserted, 10 skipped, one execute,
    one commit, and no exceptions.
    """
    body = _build_body(10)
    session = _build_session_for_batch([])

    with patch(
        "src.api.admin.whatsapp_ai_ignore_list.pg_insert",
        _make_pg_insert_chain({})[0],
    ):
        result = await ignore_list_module.bulk_add_ignore_entries(
            body=body, session=session, admin=_ADMIN_JWT
        )

    assert result.inserted == 0
    assert result.skipped == 10
    assert result.entries == []
    assert session.execute.await_count == 1
    assert session.commit.await_count == 1
    session.begin_nested.assert_not_called()


@pytest.mark.asyncio
async def test_bulk_add_phone_normalization_strips_non_digits():
    """``+20 100 123 4567`` and ``0020 100 765 4321`` are normalized to
    digits-only *before* the row is built for the INSERT. We assert by
    inspecting the rows passed to ``pg_insert(...).values(...)``.
    """
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
    returned = [
        _ok_row(phone_number="201001234567"),
        _ok_row(phone_number="00201007654321"),
    ]
    session = _build_session_for_batch(returned)

    captured: dict = {}
    pg_mock, _ = _make_pg_insert_chain(captured)
    with patch("src.api.admin.whatsapp_ai_ignore_list.pg_insert", pg_mock):
        result = await ignore_list_module.bulk_add_ignore_entries(
            body=body, session=session, admin=_ADMIN_JWT
        )

    assert result.inserted == 2
    # Inspect what the function actually sent to the DB.
    args, _ = captured["values_calls"][0]
    sent_phones = sorted(row["phone_number"] for row in args[0])
    assert sent_phones == ["00201007654321", "201001234567"]


@pytest.mark.asyncio
async def test_bulk_add_short_circuits_when_every_row_is_invalid():
    """Every input has a bad phone (too short, non-digits, etc.). The
    function should report 0 inserted, len(items) skipped, and **never
    call the DB at all**.
    """
    body = ignore_list_module.IgnoreBulkCreate(
        companyId="COMPANY_A",
        items=[
            # Too short — fails the MIN_PHONE_DIGITS=10 check.
            ignore_list_module.IgnoreEntryCreate(
                companyId="COMPANY_A", phoneNumber="123"
            ),
            # No digits at all — _is_valid_phone rejects.
            ignore_list_module.IgnoreEntryCreate(
                companyId="COMPANY_A", phoneNumber="abc-def"
            ),
            # Whitespace only — normalizes to "" which fails _is_valid_phone.
            ignore_list_module.IgnoreEntryCreate(
                companyId="COMPANY_A", phoneNumber="   "
            ),
        ],
    )
    session = _build_session_for_batch([])

    with patch(
        "src.api.admin.whatsapp_ai_ignore_list.pg_insert",
        _make_pg_insert_chain({})[0],
    ):
        result = await ignore_list_module.bulk_add_ignore_entries(
            body=body, session=session, admin=_ADMIN_JWT
        )

    assert result.inserted == 0
    assert result.skipped == 3
    assert result.entries == []
    # No DB call was made — the short-circuit path skips the INSERT.
    session.execute.assert_not_awaited()
    session.commit.assert_not_awaited()


@pytest.mark.asyncio
async def test_bulk_add_dedupes_within_a_single_request():
    """If the user pastes the same number twice in one request, the
    in-request dedup catches it before the DB ever sees the duplicate.
    Only one row should be sent to the DB.
    """
    body = ignore_list_module.IgnoreBulkCreate(
        companyId="COMPANY_A",
        items=[
            ignore_list_module.IgnoreEntryCreate(
                companyId="COMPANY_A", phoneNumber="+20 100 123 4567"
            ),
            ignore_list_module.IgnoreEntryCreate(
                companyId="COMPANY_A", phoneNumber="201001234567"  # same
            ),
        ],
    )
    session = _build_session_for_batch(
        [_ok_row(phone_number="201001234567")]
    )

    captured: dict = {}
    pg_mock, _ = _make_pg_insert_chain(captured)
    with patch("src.api.admin.whatsapp_ai_ignore_list.pg_insert", pg_mock):
        result = await ignore_list_module.bulk_add_ignore_entries(
            body=body, session=session, admin=_ADMIN_JWT
        )

    assert result.inserted == 1
    assert result.skipped == 1
    args, _ = captured["values_calls"][0]
    assert len(args[0]) == 1


@pytest.mark.asyncio
async def test_bulk_add_rolls_back_on_db_failure():
    """If the multi-row INSERT raises (e.g. connection drop), the
    function must call ``session.rollback()``, raise a 500, and not
    leave the session in a weird state.
    """
    body = _build_body(5)
    session = _build_session_for_batch([])

    async def _raise(*_args, **_kwargs):
        raise RuntimeError("db is down")

    session.execute = AsyncMock(side_effect=_raise)

    with patch(
        "src.api.admin.whatsapp_ai_ignore_list.pg_insert",
        _make_pg_insert_chain({})[0],
    ):
        with pytest.raises(Exception) as excinfo:
            await ignore_list_module.bulk_add_ignore_entries(
                body=body, session=session, admin=_ADMIN_JWT
            )

    # The endpoint converts the DB error into an HTTP 500.
    from fastapi import HTTPException

    assert isinstance(excinfo.value, HTTPException)
    assert excinfo.value.status_code == 500
    session.rollback.assert_awaited_once()
    session.commit.assert_not_awaited()
