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
from src.skills.shipping.rates import shipping_rates_skill
from src.skills.orders.cancel import cancel_order_skill
from src.skills.orders.create_confirmed import create_confirmed_order_skill
from src.skills.booking.info import booking_info_skill
from src.skills.booking.slots import booking_slots_skill
from src.skills.booking.status import booking_status_skill
from src.skills.booking.packages import booking_packages_skill
from src.skills.knowledge.ask_merchant import ask_merchant_skill
from src.skills.products.inventory import inventory_check
from src.skills.customer.info import customer_info
from src.skills.facebook.reply import facebook_reply
from src.skills.promotions.offers_list import offers_list_active_skill


def register_all_skills() -> None:
    registry = get_skill_registry()
    registry.register(product_search)
    registry.register(booking_reserve)
    registry.register(order_lookup)
    registry.register(create_draft_order)
    registry.register(support_refund)
    registry.register(support_complaint)
    registry.register(knowledge_search)
    registry.register(shipping_rates_skill)
    registry.register(cancel_order_skill)
    registry.register(create_confirmed_order_skill)
    registry.register(booking_info_skill)
    registry.register(booking_slots_skill)
    registry.register(booking_status_skill)
    registry.register(booking_packages_skill)
    registry.register(ask_merchant_skill)
    registry.register(inventory_check)
    registry.register(customer_info)
    registry.register(facebook_reply)
    registry.register(offers_list_active_skill)
