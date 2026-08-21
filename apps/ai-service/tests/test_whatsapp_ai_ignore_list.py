"""Tests for WhatsApp AI ignore list (do-not-reply) feature.

Validates:
1. `_normalize_phone` strips non-digits and produces a comparable key.
2. `handle_whatsapp_message` short-circuits when the sender is in the list.
3. `handle_whatsapp_message` proceeds normally when the sender is NOT in the list.
4. `handle_whatsapp_message` fail-opens if the lookup itself errors.
"""
from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from src.workers import agent_worker
from src.workers.agent_worker import handle_whatsapp_message
from src.api.admin import whatsapp_ai_ignore_list as ignore_list_module


# ---------------------------------------------------------------------------
# Phone normalization
# ---------------------------------------------------------------------------

class TestNormalizePhone:
    def test_strips_spaces_dashes_and_plus(self):
        assert ignore_list_module._normalize_phone("+20 100-123-4567") == "201001234567"

    def test_keeps_digits_only(self):
        assert ignore_list_module._normalize_phone("0020 100 123 4567") == "00201001234567"

    def test_handles_empty(self):
        assert ignore_list_module._normalize_phone("") == ""
        assert ignore_list_module._normalize_phone(None) == ""

    def test_strips_parentheses_and_dots(self):
        assert ignore_list_module._normalize_phone("+1 (415) 555.2671") == "14155552671"


# ---------------------------------------------------------------------------
# Worker ignore-list behavior
# ---------------------------------------------------------------------------

def _make_job(sender_id: str = "201001234567") -> dict:
    return {
        "payload": {
            "sender_id": sender_id,
            "phone_number_id": "WHATSAPP_BUSINESS_ID_1",
            "text": "hello",
            "company_id": "COMPANY_UUID",
            "mid": "msg-abc",
        }
    }


def _make_session_ctx(execute_return):
    """Build a mock async_session context manager with the given execute() return."""
    session = MagicMock()
    session.__aenter__ = AsyncMock(return_value=session)
    session.__aexit__ = AsyncMock(return_value=None)
    session.commit = AsyncMock(return_value=None)
    session.rollback = AsyncMock(return_value=None)
    # First execute call returns the ignore-list check result.
    if isinstance(execute_return, Exception):
        session.execute = AsyncMock(side_effect=execute_return)
    else:
        session.execute = AsyncMock(return_value=execute_return)
    return session


@pytest.mark.asyncio
async def test_ignored_sender_skips_ai_reply():
    """If the sender is on the ignore list, the function bails out before
    creating threads or invoking the agent."""
    ignored_row = MagicMock()
    ignored_row.scalar_one_or_none = MagicMock(return_value=1)  # truthy -> ignored

    session = _make_session_ctx(ignored_row)

    with patch("src.workers.agent_worker.async_session", return_value=session), \
         patch("src.workers.agent_worker._channel_reply_enabled",
               new=AsyncMock(return_value=True)), \
         patch("src.workers.agent_worker.enqueue_agent_task",
               new=AsyncMock()) as mock_enqueue:

        await handle_whatsapp_message(_make_job("201001234567"))

    # We expect at least one session.execute (the ignore-list lookup), then
    # bail out — so the agent_worker never enqueues another task.
    assert session.execute.await_count >= 1
    mock_enqueue.assert_not_awaited()


@pytest.mark.asyncio
async def test_non_ignored_sender_does_not_short_circuit_on_ignore_list():
    """If the sender is NOT on the list, the function continues past the
    ignore-list check. We don't assert the rest of the pipeline — just that
    the ignore-list check itself returns negative and the function does not
    return early from that path."""
    not_ignored_row = MagicMock()
    not_ignored_row.scalar_one_or_none = MagicMock(return_value=None)

    # The second execute (page_access_token) raises to bail out gracefully
    # so we don't need to mock the entire customer/thread path.
    call_count = {"n": 0}

    async def fake_execute(*args, **kwargs):
        call_count["n"] += 1
        if call_count["n"] == 1:
            return not_ignored_row
        raise RuntimeError("stop after ignore-list check")

    session = MagicMock()
    session.__aenter__ = AsyncMock(return_value=session)
    session.__aexit__ = AsyncMock(return_value=None)
    session.commit = AsyncMock(return_value=None)
    session.execute = AsyncMock(side_effect=fake_execute)

    with patch("src.workers.agent_worker.async_session", return_value=session), \
         patch("src.workers.agent_worker._channel_reply_enabled",
               new=AsyncMock(return_value=True)):
        # We expect the function to swallow the RuntimeError from the
        # 2nd execute (because we didn't add a try/except around it) — but
        # what matters is that the ignore-list check did NOT return early.
        try:
            await handle_whatsapp_message(_make_job("201001234567"))
        except RuntimeError:
            pass

    assert call_count["n"] >= 2, "function returned before the 2nd DB call"


@pytest.mark.asyncio
async def test_ignore_list_lookup_failure_fail_opens():
    """If the ignore-list check itself raises, the function must NOT silently
    block all replies — it must log and continue (fail-open)."""
    session = _make_session_ctx(RuntimeError("db is down"))

    # Track whether the function reaches a 2nd execute (it should, since
    # the ignore check fails open and we let the next call raise too).
    call_count = {"n": 0}

    async def fake_execute(*args, **kwargs):
        call_count["n"] += 1
        if call_count["n"] == 1:
            raise RuntimeError("db is down")
        raise RuntimeError("stop after fail-open")

    session.execute = AsyncMock(side_effect=fake_execute)

    with patch("src.workers.agent_worker.async_session", return_value=session), \
         patch("src.workers.agent_worker._channel_reply_enabled",
               new=AsyncMock(return_value=True)):
        try:
            await handle_whatsapp_message(_make_job("201001234567"))
        except RuntimeError:
            pass

    # Fail-open: function should have continued past the first failed call
    # and attempted a second DB call.
    assert call_count["n"] >= 2
