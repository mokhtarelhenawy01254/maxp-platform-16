from unittest.mock import AsyncMock, patch

import pytest


@pytest.fixture(autouse=True)
def add_auth_header(client) -> None:
    client.headers.update({"Authorization": "Bearer test-service-token"})



def test_embeddings_generate_returns_vector(client) -> None:
    """POST /admin/embeddings/generate returns a float vector."""
    mock_embedding = [0.1] * 768

    with patch(
        "src.memory.episodic_memory.episodic_memory_service.generate_embedding_async",
        new_callable=AsyncMock,
        return_value=mock_embedding,
    ):
        response = client.post(
            "/admin/embeddings/generate",
            json={"text": "blue sneakers size 42", "dimension": 768},
        )

    assert response.status_code == 200
    body = response.json()
    assert "embedding" in body
    assert isinstance(body["embedding"], list)
    assert len(body["embedding"]) == 768


def test_embeddings_generate_custom_dimension(client) -> None:
    """POST /admin/embeddings/generate respects custom dimension."""
    mock_embedding = [0.05] * 1536

    with patch(
        "src.memory.episodic_memory.episodic_memory_service.generate_embedding_async",
        new_callable=AsyncMock,
        return_value=mock_embedding,
    ):
        response = client.post(
            "/admin/embeddings/generate",
            json={"text": "red shoes", "dimension": 1536},
        )

    assert response.status_code == 200
    body = response.json()
    assert len(body["embedding"]) == 1536


def test_embeddings_generate_empty_text_returns_400(client) -> None:
    """POST /admin/embeddings/generate with empty text returns 400."""
    response = client.post(
        "/admin/embeddings/generate",
        json={"text": "", "dimension": 768},
    )
    assert response.status_code == 400


def test_embeddings_generate_default_dimension(client) -> None:
    """POST /admin/embeddings/generate uses 768 as default dimension."""
    mock_embedding = [0.01] * 768

    with patch(
        "src.memory.episodic_memory.episodic_memory_service.generate_embedding_async",
        new_callable=AsyncMock,
        return_value=mock_embedding,
    ) as mock_fn:
        response = client.post(
            "/admin/embeddings/generate",
            json={"text": "test query"},
        )

    assert response.status_code == 200
    mock_fn.assert_called_once_with(text="test query", image_bytes=None, mime_type=None, dimension=768)
