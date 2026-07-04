from __future__ import annotations

from src.pipeline.stages.skills_pipeline import _format_tool_results


def test_format_tool_results_with_products():
    executed = [
        {
            "tool": "product_search",
            "status": "success",
            "result": {
                "count": 2,
                "products": [
                    {"productName": "Shoes"},
                    {"productName": "T-Shirt"},
                ],
            },
        }
    ]
    formatted = _format_tool_results(executed)
    assert "Shoes" in formatted
    assert "T-Shirt" in formatted


def test_format_tool_results_with_categories():
    executed = [
        {
            "tool": "category_list",
            "status": "success",
            "result": {
                "count": 2,
                "categories": [
                    {"category": "Electronics"},
                    {"category": "Apparel"},
                ],
            },
        }
    ]
    formatted = _format_tool_results(executed)
    assert "Electronics" in formatted
    assert "Apparel" in formatted


def test_format_tool_results_empty():
    executed = [
        {
            "tool": "category_list",
            "status": "success",
            "result": {
                "count": 0,
                "categories": [],
            },
        }
    ]
    formatted = _format_tool_results(executed)
    assert formatted == ""


def test_format_tool_results_with_results_key():
    executed = [
        {
            "tool": "product_search",
            "status": "success",
            "result": {
                "count": 1,
                "results": [
                    {"name": "كوتشي الاسكوتش من سوان"}
                ]
            }
        }
    ]
    formatted = _format_tool_results(executed)
    assert "كوتشي الاسكوتش من سوان" in formatted


def test_format_tool_results_with_single_product():
    executed = [
        {
            "tool": "inventory_check",
            "status": "success",
            "result": {
                "found": True,
                "productName": "كوتشي الاسكوتش من سوان",
                "sku": "sswan"
            }
        }
    ]
    formatted = _format_tool_results(executed)
    assert "كوتشي الاسكوتش من سوان" in formatted


def test_format_tool_results_with_offers_active():
    executed = [
        {
            "tool": "offers_list_active",
            "status": "success",
            "result": {
                "totalActiveCoupons": 2,
                "hasStorePromotion": True,
                "hasFreeShipping": True
            }
        }
    ]
    formatted = _format_tool_results(executed)
    assert "كوبونات خصم (2)" in formatted
    assert "خصم تلقائي بالمتجر" in formatted
    assert "شحن مجاني" in formatted

