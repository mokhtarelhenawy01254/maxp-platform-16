from __future__ import annotations
from pydantic import BaseModel, Field
from src.skills.base import Skill


class BookingPackagesInput(BaseModel):
    company_id: str = Field(default="", description="")


async def get_packages(params: BookingPackagesInput) -> dict:
    from src.tools.definitions.booking import booking_info, InfoInput
    inp = InfoInput(company_id=params.company_id)
    info = await booking_info(inp)
    services = info.get("services", [])

    enriched = []
    for s in services:
        pkgs = s.get("packages", [])
        if not pkgs:
            continue
        single_price = None
        multi_packages = []
        for p in pkgs:
            entry = {
                "count": p.get("count", 1),
                "price": p.get("price", 0),
                "original_price": p.get("originalPrice"),
                "branch": p.get("branch", ""),
                "per_session": round(p.get("price", 0) / max(p.get("count", 1), 1), 2),
            }
            if entry["count"] == 1:
                single_price = entry["price"]
            else:
                multi_packages.append(entry)
        enriched.append({
            "id": s.get("id"),
            "name": s.get("name"),
            "description": s.get("description"),
            "single_price": single_price,
            "packages": multi_packages,
            "total_options": pkgs,
        })

    return {
        "branches": info.get("branches", []),
        "doctors": info.get("doctors", []),
        "services_with_pricing": enriched,
        "has_multi_session_packages": any(s["packages"] for s in enriched),
    }


booking_packages_skill = Skill(
    name="booking_packages",
    description="Aggregate pricing data for all medical services: single-session prices, multi-session package bundles with per-session savings. Use when the patient asks about prices, packages, offers, bundles, or subscriptions.",
    input_schema=BookingPackagesInput,
    handler=get_packages,
    internal_fields=["company_id"],
)
