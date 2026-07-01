from __future__ import annotations

import re
from contextvars import ContextVar
from typing import Any

_ctx: ContextVar[dict[str, Any]] = ContextVar("_order_msg_ctx", default={})

_PHONE_RE = re.compile(r"(?:^|[\s\-،,])(01[0-9]{9})(?=[\s\-،,\d]|$)", re.MULTILINE)
_NAME_RE = re.compile(r"(?:اسمي|اسم|انا|أنا)\s+([^\d\-،,\n]{3,40}?)(?=\s*\d|\s*[-،,]|$)", re.IGNORECASE)
_PRODUCT_SUMMARY_RE = re.compile(r"(?:المنتج|منتج)[:\s*]+([^\n\-،,]{3,60}?)(?=\s*[-،,\n]|$)", re.IGNORECASE)
_CONFIRM_WORDS_RE = re.compile(r"\b(?:اوكد|أوكد|اكد|أكد|تأكيد|تاكيد|نعم|أيوه|ايوه|confirm|موافق|تمام)\b", re.IGNORECASE)


def set_message_ctx(message: str, recent: list[dict]) -> None:
    _ctx.set({"message": message, "recent": recent})


def fill_order_fields(model_data: dict[str, Any]) -> None:
    if model_data.get("customer_name") and model_data.get("customer_phone") and model_data.get("product_name"):
        return
    ctx = _ctx.get({})
    message = ctx.get("message", "")
    recent = ctx.get("recent", [])
    combined_user = " ".join(
        [message] + [str(m.get("content", "")) for m in recent if m.get("role") == "user"]
    )
    combined_all = combined_user + " " + " ".join(
        [str(m.get("content", "")) for m in recent if m.get("role") == "assistant"]
    )
    if not model_data.get("customer_phone"):
        m = _PHONE_RE.search(combined_user)
        if m:
            model_data["customer_phone"] = re.sub(r"[\s\-]", "", m.group(1))
    if not model_data.get("customer_name"):
        m = _NAME_RE.search(combined_user)
        if m:
            model_data["customer_name"] = m.group(1).strip()
    if not model_data.get("product_name"):
        m = _PRODUCT_SUMMARY_RE.search(combined_all)
        if m:
            model_data["product_name"] = m.group(1).strip()
        else:
            cleaned = _CONFIRM_WORDS_RE.sub("", message)
            cleaned = _PHONE_RE.sub("", cleaned)
            cleaned = _NAME_RE.sub("", cleaned)
            cleaned = re.sub(r"[-،,؛\s\-]+", " ", cleaned).strip()
            parts = [w for w in cleaned.split() if len(w) > 2]
            if len(parts) >= 2:
                model_data["product_name"] = " ".join(parts)
