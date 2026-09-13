from __future__ import annotations

import pytest
from src.agents.compactor import ToolResultCompactor


def test_compactor_preserves_small_results():
    small_data = {"status": "ACTIVE", "campaign_id": "123", "spend": 100}
    compacted = ToolResultCompactor.compact(small_data, tool_name="facebook_ad.get_decision")
    assert compacted == small_data


def test_compactor_truncates_long_string():
    long_text = "A" * 2000
    compacted = ToolResultCompactor.compact(long_text, tool_name="terminal", threshold_chars=500)
    assert isinstance(compacted, str)
    assert len(compacted) < 2000
    assert "[Micro-Compacted:" in compacted


def test_compactor_compacts_large_list_of_records():
    large_list = [
        {"id": f"camp_{i}", "name": f"Campaign {i}", "spend": 100 * i, "roas": 2.5, "raw_data": "x" * 500}
        for i in range(20)
    ]
    compacted = ToolResultCompactor.compact(large_list, tool_name="facebook_ads.list")
    assert isinstance(compacted, dict)
    assert compacted["_compacted"] is True
    assert compacted["total_count"] == 20
    assert len(compacted["top_items"]) == 3
    # Check that droppable raw_data is stripped
    assert "raw_data" not in compacted["top_items"][0]
    # Check that identifiers are preserved for all items
    assert len(compacted["all_identifiers"]) == 20
    assert compacted["all_identifiers"][0]["id"] == "camp_0"


def test_compactor_compacts_nested_dict_list():
    nested = {
        "success": True,
        "company_id": "comp_101",
        "campaigns": [
            {"id": f"c_{i}", "name": f"Ad {i}", "roas": 3.0, "asset_feed_spec": "blob" * 100}
            for i in range(15)
        ],
    }
    compacted = ToolResultCompactor.compact(nested, tool_name="facebook_insights")
    assert compacted["_micro_compacted"] is True
    assert compacted["campaigns"]["_compacted"] is True
    assert compacted["campaigns"]["total_count"] == 15
    assert len(compacted["campaigns"]["top_items"]) == 3
