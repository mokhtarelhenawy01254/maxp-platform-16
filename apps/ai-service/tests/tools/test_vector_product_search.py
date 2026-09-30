from __future__ import annotations

import pytest

from src.tools import vector_product_search as vector_module


def test_score_embedding_rows_sorts_products_by_similarity():
    rows = [
        {
            "id": "prod-low",
            "name": "Low Match",
            "sku": "LOW",
            "price": 100,
            "stock": 0,
            "track_inventory": True,
            "main_image": "https://cdn.example.com/low.jpg",
            "embedding_json": "[0, 1, 0]",
        },
        {
            "id": "prod-high",
            "name": "High Match",
            "sku": "HIGH",
            "price": 200,
            "stock": 5,
            "track_inventory": True,
            "main_image": "https://cdn.example.com/high.jpg",
            "embedding_json": "[1, 0, 0]",
        },
    ]

    results = vector_module._score_embedding_rows(rows, [1, 0, 0], min_score=0.1)

    assert [item["name"] for item in results] == ["High Match"]
    assert results[0]["status"] == "IN_STOCK"
    assert results[0]["image_url"] == "https://cdn.example.com/high.jpg"


@pytest.mark.asyncio
async def test_vector_product_search_falls_back_to_product_json_embeddings(monkeypatch):
    class _Rows:
        def __iter__(self):
            return iter([
                type("Row", (), {
                    "_mapping": {
                        "id": "prod-1",
                        "name": "Catalog Visual Match",
                        "sku": "VIS-1",
                        "price": 1200,
                        "main_image": "https://cdn.example.com/product.jpg",
                        "stock": 7,
                        "track_inventory": True,
                        "embedding_json": "[1, 0, 0]",
                    }
                })()
            ])

    class _Session:
        def __init__(self):
            self.calls = 0

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def execute(self, sql, params):
            self.calls += 1
            statement = str(sql)
            if "FROM products" in statement:
                return _Rows()
            raise RuntimeError("missing product_embeddings")

    async def fake_generate_embedding(**_):
        return [1, 0, 0]

    async def fake_query_embedding(**_):
        return {"vector": [1, 0, 0], "provider": "test"}

    monkeypatch.setattr(vector_module, "_generate_query_embedding", fake_query_embedding)
    monkeypatch.setattr("src.db.session.async_session", lambda: _Session())

    results = await vector_module.vector_product_search(
        company_id="comp1",
        query="find this",
        image_bytes=b"image",
        mime_type="image/jpeg",
    )

    assert results == [{
        "id": "prod-1",
        "name": "Catalog Visual Match",
        "sku": "VIS-1",
        "price": 1200.0,
        "status": "IN_STOCK",
        "image_url": "https://cdn.example.com/product.jpg",
        "mainImage": "https://cdn.example.com/product.jpg",
        "score": 1.0,
    }]
