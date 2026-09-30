from __future__ import annotations

import json
from typing import Any
import structlog

logger = structlog.get_logger(__name__)

DEFAULT_COMPACTION_THRESHOLD_CHARS = 1200
DEFAULT_HEAD_ITEMS_TO_KEEP = 3

# High-value keys to prioritize when compacting individual records
KEY_IDENTIFIER_FIELDS = {
    "id", "campaign_id", "ad_id", "adset_id", "name", "title",
    "status", "effective_status", "roas", "cpa", "spend", "revenue",
    "price", "comparePrice", "discountSummary", "quantityOffers", "offersSummary",
    "stock", "quantity", "sku", "phone", "currency"
}

# Low-value / verbose keys that can be dropped during compaction
DROPPABLE_VERBOSE_FIELDS = {
    "raw_data", "raw_response", "payload", "debug", "spec",
    "access_token", "hash", "asset_feed_spec", "adlabels"
}


class ToolResultCompactor:
    """In-flight Micro-Compaction Engine for Agent Tool Execution.
    
    Inspired by Nous Research Hermes Agent (agent/micro_compaction.py).
    Prunes verbose, repetitive, and bloated tool outputs (e.g. Meta Graph API
    campaign lists, e-commerce catalog dumps, shipping tracking logs) while
    preserving critical identifiers, numerical telemetry, and decision facts.
    """

    @classmethod
    def compact(
        cls,
        result: Any,
        tool_name: str = "",
        threshold_chars: int = DEFAULT_COMPACTION_THRESHOLD_CHARS,
    ) -> Any:
        if result is None:
            return result

        # 1. Handle string outputs
        if isinstance(result, str):
            if len(result) <= threshold_chars:
                return result
            head_len = min(500, threshold_chars // 2)
            tail_len = min(300, threshold_chars // 4)
            omitted = len(result) - (head_len + tail_len)
            logger.debug("micro_compacted_string_tool_result", tool=tool_name, original_len=len(result), omitted=omitted)
            return f"{result[:head_len]}\n... [Micro-Compacted: {omitted} characters omitted] ...\n{result[-tail_len:]}"

        # 2. Handle list outputs
        if isinstance(result, list):
            try:
                serialized = json.dumps(result, ensure_ascii=False)
                if len(serialized) <= threshold_chars:
                    return result
            except Exception:
                pass
            return cls._compact_list(result, tool_name)

        # 3. Handle dict outputs
        if isinstance(result, dict):
            try:
                serialized = json.dumps(result, ensure_ascii=False)
                if len(serialized) <= threshold_chars:
                    return result
            except Exception:
                return result
            return cls._compact_dict(result, tool_name, threshold_chars)

        return result

    @classmethod
    def _sanitize_record(cls, item: Any) -> Any:
        """Strip bloated nested fields from a single dictionary record."""
        if not isinstance(item, dict):
            return item
        return {
            k: v for k, v in item.items()
            if k not in DROPPABLE_VERBOSE_FIELDS
        }

    @classmethod
    def _extract_identifiers(cls, items: list[Any]) -> list[dict[str, Any]]:
        """Extract essential keys for every item in a list so the agent knows every entity exists."""
        identifiers = []
        for it in items:
            if isinstance(it, dict):
                extracted = {k: it[k] for k in KEY_IDENTIFIER_FIELDS if k in it}
                if extracted:
                    identifiers.append(extracted)
                else:
                    first_two = dict(list(it.items())[:2])
                    identifiers.append(first_two)
            else:
                identifiers.append({"value": str(it)[:60]})
        return identifiers

    @classmethod
    def _compact_list(cls, items: list[Any], tool_name: str) -> dict[str, Any]:
        total = len(items)
        if total <= DEFAULT_HEAD_ITEMS_TO_KEEP:
            return {
                "_compacted": True,
                "total_count": total,
                "items": [cls._sanitize_record(it) for it in items],
            }

        head = [cls._sanitize_record(it) for it in items[:DEFAULT_HEAD_ITEMS_TO_KEEP]]
        identifiers = cls._extract_identifiers(items)

        logger.debug(
            "micro_compacted_list_tool_result",
            tool=tool_name,
            total_items=total,
            preserved_head=len(head),
        )
        return {
            "_compacted": True,
            "total_count": total,
            "summary": f"إجمالي العناصر: {total}. تم الاحتفاظ بأول {len(head)} عناصر كاملة، مع تلخيص المعرفات لبقية العناصر.",
            "top_items": head,
            "all_identifiers": identifiers,
        }

    @classmethod
    def _compact_dict(cls, data: dict[str, Any], tool_name: str, threshold: int) -> dict[str, Any]:
        compacted = {}
        candidate_list_keys = [
            "data", "items", "campaigns", "ads", "adsets",
            "products", "orders", "results", "records", "insights"
        ]

        found_large_list = False
        for k, v in data.items():
            if k in DROPPABLE_VERBOSE_FIELDS:
                continue

            if isinstance(v, list) and (k in candidate_list_keys or len(v) > DEFAULT_HEAD_ITEMS_TO_KEEP):
                try:
                    ser = json.dumps(v, ensure_ascii=False)
                    if len(ser) > 400:
                        compacted[k] = cls._compact_list(v, f"{tool_name}.{k}")
                        found_large_list = True
                        continue
                except Exception:
                    pass
            compacted[k] = v

        if found_large_list:
            compacted["_micro_compacted"] = True
            return compacted

        # If no specific large list was found but overall dict is still huge
        compacted["_micro_compacted"] = True
        return compacted
