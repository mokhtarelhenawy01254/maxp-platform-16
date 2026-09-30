from __future__ import annotations

from unittest.mock import AsyncMock, patch
import pytest

from src.tools.backend_client import BackendAPIError, BackendClient
from src.tools.definitions.promotions import (
    OffersListActiveInput,
    offers_list_active,
)


@pytest.mark.asyncio
async def test_backend_client_get_coupons_pagination():
    """Verify get_coupons loops through pagination.totalPages and aggregates all coupons."""
    client = BackendClient()

    page1_resp = {
        "items": [{"id": f"c_{i}", "code": f"CODE_{i}", "isActive": True} for i in range(1, 26)],
        "pagination": {"page": 1, "totalPages": 2, "total": 44, "limit": 25},
    }
    page2_resp = {
        "items": [{"id": f"c_{i}", "code": f"CODE_{i}", "isActive": True} for i in range(26, 45)],
        "pagination": {"page": 2, "totalPages": 2, "total": 44, "limit": 25},
    }

    async def mock_request(method, path, company_id=None, params=None, json=None):
        page = params.get("page", 1) if params else 1
        if page == 1:
            return page1_resp
        return page2_resp

    with patch.object(client, "_request", side_effect=mock_request):
        result = await client.get_coupons("company_123", limit=25)
        assert len(result) == 44
        assert result[0]["code"] == "CODE_1"
        assert result[-1]["code"] == "CODE_44"


@pytest.mark.asyncio
async def test_offers_list_active_all_five_sources_success():
    """Verify offers_list_active reads all 5 sources, formats smart summary for >10 coupons, and records sourcesRead."""
    mock_coupons = [
        {"id": f"c_{i}", "code": f"SAVE_{i}", "name": "Welcome 15%", "type": "PERCENTAGE", "value": 15, "isActive": True}
        for i in range(25)
    ]
    mock_store_promo = {
        "id": "sp_1",
        "name": "Summer Buy 2 Get 1",
        "isActive": True,
        "tiers": [{"quantity": 2, "discountPercent": 50}],
    }
    mock_promo_settings = {
        "freeShippingThreshold": 2000,
        "flatShippingRate": 50,
    }
    mock_storefront_settings = {
        "apps": {
            "boughtTogether": True,
            "freeShippingBar": True,
            "bulkSavings": True,
        },
        "freeShippingBarThreshold": 2000,
    }
    mock_products = [
        {
            "id": "p_1",
            "name": "Sneakers",
            "price": 1000,
            "comparePrice": 1200,
            "quantityOffers": [{"minQuantity": 2, "discountPercent": 15}],
        }
    ]

    with patch.object(BackendClient, "get_coupons", new_callable=AsyncMock, return_value=mock_coupons), \
         patch.object(BackendClient, "get_store_promotion", new_callable=AsyncMock, return_value=mock_store_promo), \
         patch.object(BackendClient, "get_promotion_settings", new_callable=AsyncMock, return_value=mock_promo_settings), \
         patch.object(BackendClient, "get_public_storefront_settings", new_callable=AsyncMock, return_value=mock_storefront_settings), \
         patch.object(BackendClient, "get_store_products", new_callable=AsyncMock, return_value=mock_products):

        result = await offers_list_active(OffersListActiveInput(company_id="comp_1"))

        # Verify sources tracking
        assert len(result["sourcesRead"]) == 5
        read_sources = [s["source"] for s in result["sourcesRead"]]
        assert "coupons" in read_sources
        assert "storePromotion" in read_sources
        assert "promotionSettings" in read_sources
        assert "storefrontSettings" in read_sources
        assert "productOffers" in read_sources
        assert len(result["sourcesFailed"]) == 0
        assert "تمت قراءة جميع المصادر بنجاح" in result["sourcesStatusSummary"]

        # Verify coupon summarization for > 10 coupons
        assert result["totalActiveCoupons"] == 25
        assert result["couponsSummary"]["isSummarized"] is True
        assert len(result["couponsSummary"]["campaigns"]) == 1
        summary = result["couponsSummary"]["campaigns"][0]
        assert summary["campaignName"] == "Welcome 15%"
        assert summary["count"] == 25
        assert len(summary["sampleCodes"]) <= 3

        # Verify other sources data
        assert result["storePromotion"]["name"] == "Summer Buy 2 Get 1"
        assert "conversionTools" in result
        assert "boughtTogether" in result
        assert result["productQuantityOffers"]["totalProductsWithOffers"] == 1


@pytest.mark.asyncio
async def test_offers_list_active_tracks_failures_without_silent_failure():
    """Verify that when a source fails (e.g. 403 or network), it is placed in sourcesFailed and does not say 'no data'."""
    mock_coupons = [{"id": "c_1", "code": "SALE10", "name": "Sale 10%", "type": "PERCENTAGE", "value": 10, "isActive": True}]
    mock_storefront_settings = {"apps": {"boughtTogether": False}}
    mock_products = []

    with patch.object(BackendClient, "get_coupons", new_callable=AsyncMock, return_value=mock_coupons), \
         patch.object(BackendClient, "get_store_promotion", new_callable=AsyncMock, side_effect=BackendAPIError(403, "Access denied to promotions")), \
         patch.object(BackendClient, "get_promotion_settings", new_callable=AsyncMock, side_effect=RuntimeError("Connection reset by peer")), \
         patch.object(BackendClient, "get_public_storefront_settings", new_callable=AsyncMock, return_value=mock_storefront_settings), \
         patch.object(BackendClient, "get_store_products", new_callable=AsyncMock, return_value=mock_products):

        result = await offers_list_active(OffersListActiveInput(company_id="comp_1"))

        # 3 succeeded, 2 failed
        assert len(result["sourcesRead"]) == 3
        assert len(result["sourcesFailed"]) == 2

        failed_names = [f["source"] for f in result["sourcesFailed"]]
        assert "storePromotion" in failed_names
        assert "promotionSettings" in failed_names

        # Summary indicates partial failure clearly
        assert "تمت قراءة 3 مصادر بنجاح" in result["sourcesStatusSummary"]
        assert "تعذرت قراءة 2 مصادر" in result["sourcesStatusSummary"]
        assert result["hasFailedSources"] is True
        assert "ممنوع تماماً القول «مفيش عروض»" in result["reportingInstructions"]


@pytest.mark.asyncio
async def test_offers_list_active_include_all_coupons():
    """Verify include_all_coupons=True includes the full item list even when count > 10."""
    mock_coupons = [
        {"id": f"c_{i}", "code": f"SAVE_{i}", "name": "Bulk", "type": "FIXED", "value": 100, "isActive": True}
        for i in range(15)
    ]

    with patch.object(BackendClient, "get_coupons", new_callable=AsyncMock, return_value=mock_coupons), \
         patch.object(BackendClient, "get_store_promotion", new_callable=AsyncMock, return_value=None), \
         patch.object(BackendClient, "get_promotion_settings", new_callable=AsyncMock, return_value=None), \
         patch.object(BackendClient, "get_public_storefront_settings", new_callable=AsyncMock, return_value={}), \
         patch.object(BackendClient, "get_store_products", new_callable=AsyncMock, return_value=[]):

        result = await offers_list_active(OffersListActiveInput(company_id="comp_1", include_all_coupons=True))
        assert isinstance(result["coupons"], list)
        assert len(result["coupons"]) == 15
