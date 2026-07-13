from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest

import src.db.session


def test_imports() -> None:
    assert src.db.session.init_db is not None
    assert src.db.session.close_db is not None
    assert src.db.session.get_session is not None


@pytest.mark.asyncio
async def test_init_db_creates_engine() -> None:
    with patch("src.db.session.create_async_engine") as mock_create:
        mock_engine = mock_create.return_value
        mock_engine.dispose = AsyncMock()

        await src.db.session.init_db()

        assert src.db.session.engine is mock_engine
        assert src.db.session.async_session is not None
        mock_create.assert_called_once()

        await src.db.session.close_db()

        mock_engine.dispose.assert_awaited_once()
        assert src.db.session.engine is None
        assert src.db.session.async_session is None


@pytest.mark.asyncio
async def test_get_session_raises_when_not_initialized() -> None:
    src.db.session.async_session = None
    with pytest.raises(RuntimeError, match="Database not initialized"):
        async for _ in src.db.session.get_session():
            pass
