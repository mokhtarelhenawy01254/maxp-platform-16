from __future__ import annotations

from src.skills.registry import get_skill_registry

# Import all skill instances
from src.skills.products.search import product_search
from src.skills.booking.reserve import booking_reserve
from src.skills.orders.lookup import order_lookup
from src.skills.orders.create_draft import create_draft_order
from src.skills.support.refund import support_refund
from src.skills.support.complaint import support_complaint
from src.skills.knowledge.search import knowledge_search


def register_all_skills() -> None:
    registry = get_skill_registry()
    registry.register(product_search)
    registry.register(booking_reserve)
    registry.register(order_lookup)
    registry.register(create_draft_order)
    registry.register(support_refund)
    registry.register(support_complaint)
    registry.register(knowledge_search)
