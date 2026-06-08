from __future__ import annotations

from src.tools.names import canonical_tool_list, canonical_tool_name, canonical_tool_set


def test_canonical_tool_name_accepts_dotted_and_snake_case_names() -> None:
    assert canonical_tool_name("product.search") == "product_search"
    assert canonical_tool_name(" product_search ") == "product_search"
    assert canonical_tool_name(None) == ""


def test_canonical_tool_collections_drop_empty_duplicates() -> None:
    names = ["product.search", "product_search", "", None, "order.lookup"]  # type: ignore[list-item]

    assert canonical_tool_list(names) == ["product_search", "order_lookup"]
    assert canonical_tool_set(names) == {"product_search", "order_lookup"}
