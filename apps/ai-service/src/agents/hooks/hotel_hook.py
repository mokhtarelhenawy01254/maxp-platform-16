from __future__ import annotations

import json
import uuid
from decimal import Decimal
from typing import Any

import structlog

from src.pipeline.context import PipelineContext

logger = structlog.get_logger(__name__)


class HotelEnforcementHook:
    """Pipeline hook that enforces hotel_reserve when a user confirms a booking.

    Extracted from skills_pipeline.py so the pipeline stays generic.
    Registered for hotel-agent templates in base.py _load_hooks_for_template.

    Uses LLM structured output for intent detection and data extraction
    instead of keyword matching or regex.
    """

    async def before_llm(
        self,
        ctx: PipelineContext,
        system_prompt: str,
        skills: list[Any],
    ) -> str:
        return system_prompt

    async def before_reply(
        self,
        ctx: PipelineContext,
        executed: list[dict[str, Any]],
    ) -> None:
        pass

    async def after_tools(
        self,
        ctx: PipelineContext,
        executed: list[dict[str, Any]],
    ) -> list[dict[str, Any]] | None:
        _has_hotel_reserve = any(
            e.get("tool") == "hotel_reserve" and e.get("status") in ("success", "error")
            for e in executed
        )
        if _has_hotel_reserve:
            return None
        if not _message_indicates_hotel_confirmation(ctx):
            return None

        from src.skills.registry import get_skill_registry

        registry = get_skill_registry()
        hotel_tc = await _build_hotel_reserve_tool_call(ctx, registry)
        if not hotel_tc:
            logger.warning("hotel_enforcement_skipped_no_data")
            return None

        hotel_tc["id"] = f"call_enforced_{uuid.uuid4().hex[:8]}"
        hotel_tc["type"] = "function"

        hotel_tool = registry.resolve("hotel_reserve")
        if not hotel_tool or not ctx.company_id:
            return None

        try:
            args = json.loads(hotel_tc["function"]["arguments"])
            if "company_id" not in args:
                args["company_id"] = ctx.company_id
            validated = hotel_tool.input_model(**args)
            result = await hotel_tool.func(validated)
            executed.append({"tool": "hotel_reserve", "status": "success", "result": result})
            ctx.tool_evidence.append({"tool": "hotel_reserve", "result": result})
        except Exception as e:
            logger.error("hotel_enforcement_direct_failed", error=str(e))
            executed.append({"tool": "hotel_reserve", "status": "error", "error": str(e)})

        return [hotel_tc]


def _has_hotel_context(ctx: PipelineContext) -> bool:
    """Check if the conversation has hotel data from prior tool calls."""
    if any(
        ev.get("tool", "").startswith("hotel_") and ev.get("tool") != "hotel_reserve"
        for ev in getattr(ctx, "tool_evidence", [])
    ):
        return True
    for m in getattr(ctx, "messages", []):
        for tc in m.get("tool_calls") or []:
            fn = tc.get("function", {}).get("name", "")
            if fn.startswith("hotel_") and fn != "hotel_reserve":
                return True
        if m.get("role") == "tool":
            try:
                result = json.loads(m["content"]) if isinstance(m["content"], str) else m["content"]
            except (json.JSONDecodeError, TypeError, ValueError):
                continue
            if isinstance(result, dict) and ("hotels" in result or "available_room_types" in result):
                return True
    return False


def _message_indicates_hotel_confirmation(ctx: PipelineContext) -> bool:
    """Check if user responded after seeing hotel data.

    ponytail: no keyword matching — intent is detected by the LLM via
    tool descriptions + HOTEL_RESERVE_INSTRUCTION. This just checks if
    hotel context exists and the user is responding.
    Remove entirely when LLM calls hotel_reserve reliably.
    """
    if not (ctx.message or "").strip():
        return False
    return _has_hotel_context(ctx)


async def _extract_booking_data(
    ctx: PipelineContext,
    msg: str,
    property_id: str,
    available_rooms: list[dict],
    room_types_map: dict[str, Any],
) -> dict[str, Any] | None:
    """Extract booking data from user message using LLM.

    ponytail: replaces regex/AR_MONTHS/room_ar_names extraction with a
    lightweight LLM structured output call. Remove when hotel_reserve tool
    description alone makes the main LLM call it naturally.
    """
    from src.llm.client import LLMClient
    from src.llm.model_manager import model_manager

    try:
        routing = await model_manager.get_next_key("deepseek-flash", ctx.company_id)
        client = LLMClient(
            provider=routing.provider,
            model=routing.model,
            api_key=routing.api_key,
            base_url=routing.base_url,
        )
    except Exception as e:
        logger.warning("hotel_extraction_no_client", error=str(e))
        return None

    room_summary = ""
    if available_rooms:
        names = set()
        for rm in available_rooms:
            rt = rm.get("roomType", {})
            name = rt.get("nameAr") or rt.get("name") or ""
            if name:
                names.add(name)
        room_summary = f"الغرف المتاحة: {', '.join(sorted(names))}"
    elif room_types_map:
        room_summary = f"أنواع الغرف: {', '.join(sorted(room_types_map.keys()))}"

    prompt = f"""استخرج بيانات الحجز الفندقي من رسالة العميل التالية.

الغرفة المطلوب حجزها:
{room_summary}

رسالة العميل:
{msg}

أرجع JSON فقط بالحقول التالية (أو null لو مش موجود):
- customer_name: اسم العميل
- customer_phone: رقم الموبايل (مصري 01xxxxxxxxx)
- check_in: تاريخ الوصول (YYYY-MM-DD)
- check_out: تاريخ المغادرة (YYYY-MM-DD)
- adults: عدد الأشخاص (رقم)
- room_type: نوع الغرفة المطلوب

مثال: {{"customer_name": "أحمد علي", "customer_phone": "01012345678", "check_in": "2026-08-01", "check_out": "2026-08-03", "adults": 2, "room_type": "غرفة ديلوكس"}}"""

    try:
        response = await client.generate(
            messages=[
                {"role": "system", "content": "استخرج بيانات JSON من رسالة العميل. أرجع JSON فقط بدون أي شرح."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.1,
        )
        if not response.text:
            return None
        data = json.loads(response.text.strip().removeprefix("```json").removesuffix("```").strip())
        return data
    except Exception as e:
        logger.warning("hotel_extraction_failed", error=str(e))
        return None


class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super().default(obj)


def _scan_messages_for_hotel_data(ctx: PipelineContext) -> tuple[str | None, list[dict], dict[str, Any]]:
    """Scan ctx.messages and ctx.tool_evidence for hotel_info and check_availability results."""
    property_id = None
    room_types_map: dict[str, Any] = {}
    available_rooms: list[dict] = []

    for ev in getattr(ctx, "tool_evidence", []):
        if ev.get("tool") == "hotel_info":
            for hotel in ev.get("result", {}).get("hotels") or []:
                property_id = hotel.get("id")
                for rt in hotel.get("roomTypes") or []:
                    name_ar = rt.get("nameAr", "")
                    if name_ar and name_ar not in room_types_map:
                        room_types_map[name_ar] = rt
        if ev.get("tool") == "hotel_check_availability":
            for art in ev.get("result", {}).get("available_room_types") or []:
                rt = art.get("roomType", {})
                for rm in art.get("rooms") or []:
                    available_rooms.append({**rm, "roomType": rt})

    for m in getattr(ctx, "messages", []):
        if m.get("role") == "tool":
            try:
                result = json.loads(m["content"]) if isinstance(m["content"], str) else m["content"]
                if isinstance(result, dict):
                    for hotel in result.get("hotels") or []:
                        if not property_id:
                            property_id = hotel.get("id")
                        for rt in hotel.get("roomTypes") or []:
                            name_ar = rt.get("nameAr", "")
                            if name_ar and name_ar not in room_types_map:
                                room_types_map[name_ar] = rt
            except (json.JSONDecodeError, TypeError):
                pass

    return property_id, available_rooms, room_types_map


async def _build_hotel_reserve_tool_call(
    ctx: PipelineContext, registry: Any
) -> dict[str, Any] | None:
    msg = (ctx.message or "").strip()
    if not msg:
        return None

    property_id, available_rooms, room_types_map = _scan_messages_for_hotel_data(ctx)
    if not property_id and ctx.company_id:
        try:
            hotel_info_tool = registry.resolve("hotel_info")
            if hotel_info_tool:
                from src.tools.backend_client import api_get

                data = await api_get(f"/api/v1/hotel/properties?companyId={ctx.company_id}")
                if data.get("success"):
                    for hotel in data.get("data") or []:
                        property_id = hotel.get("id")
                        for rt in hotel.get("roomTypes") or []:
                            name_ar = rt.get("nameAr", "")
                            if name_ar and name_ar not in room_types_map:
                                room_types_map[name_ar] = rt
        except Exception:
            pass

    extracted = await _extract_booking_data(ctx, msg, property_id, available_rooms, room_types_map)
    if not extracted:
        return None

    is_confirmation = extracted.get("is_booking_confirmation", True)
    if not is_confirmation:
        return None

    customer_name = extracted.get("customer_name")
    customer_phone = extracted.get("customer_phone")
    check_in = extracted.get("check_in")
    check_out = extracted.get("check_out")
    adults = extracted.get("adults", 2)
    room_type = extracted.get("room_type")

    if not customer_name or not customer_phone or not property_id:
        return None

    rooms: list[dict] = []
    if available_rooms:
        for rm in available_rooms:
            rt = rm.get("roomType", {})
            if room_type and rt.get("nameAr") and room_type not in (rt.get("nameAr", ""), rt.get("name", "")):
                continue
            nightly_rate = rt.get("basePrice", 0)
            if rt.get("pricingModel") == "PER_PERSON":
                nightly_rate = rt.get("basePrice", 0) * (adults or 2)
            rooms.append({
                "roomTypeId": rt.get("id", ""),
                "roomId": rm.get("id", ""),
                "nightlyRate": nightly_rate,
            })
    elif room_types_map and room_type:
        for name_ar, rt in room_types_map.items():
            if room_type in name_ar or name_ar in room_type:
                nightly_rate = rt.get("basePrice", 0)
                rooms.append({"roomTypeId": rt.get("id", ""), "nightlyRate": nightly_rate})
                break

    if not rooms:
        return None

    from datetime import date as _date
    _year = str(_date.today().year)
    args = {
        "customer_name": customer_name,
        "customer_phone": customer_phone,
        "property_id": property_id,
        "check_in": check_in or f"{_year}-07-20",
        "check_out": check_out or f"{_year}-07-22",
        "adults": adults or 2,
        "rooms": rooms,
    }

    return {
        "function": {
            "name": "hotel_reserve",
            "arguments": json.dumps(args, ensure_ascii=False, cls=DecimalEncoder),
        }
    }
