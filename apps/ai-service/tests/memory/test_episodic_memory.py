from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest

from src.memory.episodic_memory import EMBEDDING_PROVIDER_GEMINI, EpisodicMemoryService


@pytest.mark.asyncio
async def test_search_similar_rolls_back_when_pgvector_is_unavailable(monkeypatch):
    service = EpisodicMemoryService()
    monkeypatch.setattr(
        service,
        "generate_embedding_with_provider",
        AsyncMock(
            return_value={
                "vector": [1.0, 0.0, 0.0],
                "provider": EMBEDDING_PROVIDER_GEMINI,
                "model": "gemini-embedding-2",
                "dimension": 3,
                "cached": False,
            }
        ),
    )

    fact = SimpleNamespace(
        id="mem1",
        content="Customer likes black shoes",
        embedding=[1.0, 0.0, 0.0],
        embedding_provider=EMBEDDING_PROVIDER_GEMINI,
        metadata_json={},
    )
    fallback_result = MagicMock()
    fallback_result.scalars.return_value.all.return_value = [fact]

    session = MagicMock()
    session.execute = AsyncMock(
        side_effect=[
            Exception('type "vector" does not exist'),
            fallback_result,
        ]
    )
    session.rollback = AsyncMock()

    results = await service.search_similar(
        session=session,
        company_id="comp1",
        customer_id="cust1",
        query_text="black shoes",
        include_pseudo=True,
    )

    session.rollback.assert_awaited_once()
    assert results[0]["id"] == "mem1"
    assert results[0]["similarity"] > 0.99


@pytest.mark.asyncio
async def test_search_similar_skips_pgvector_sql_when_capability_is_disabled(monkeypatch):
    service = EpisodicMemoryService()
    service._pgvector_search_available = False
    monkeypatch.setattr(
        service,
        "generate_embedding_with_provider",
        AsyncMock(
            return_value={
                "vector": [1.0, 0.0, 0.0],
                "provider": EMBEDDING_PROVIDER_GEMINI,
                "model": "gemini-embedding-2",
                "dimension": 3,
                "cached": False,
            }
        ),
    )

    fact = SimpleNamespace(
        id="mem1",
        content="Customer likes black shoes",
        embedding=[1.0, 0.0, 0.0],
        embedding_provider=EMBEDDING_PROVIDER_GEMINI,
        metadata_json={},
    )
    fallback_result = MagicMock()
    fallback_result.scalars.return_value.all.return_value = [fact]

    session = MagicMock()
    session.execute = AsyncMock(return_value=fallback_result)

    results = await service.search_similar(
        session=session,
        company_id="comp1",
        customer_id="cust1",
        query_text="black shoes",
        include_pseudo=True,
    )

    sql_text = str(session.execute.call_args.args[0])
    assert "<=>" not in sql_text
    assert results[0]["id"] == "mem1"
