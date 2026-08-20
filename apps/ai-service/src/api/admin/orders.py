from __future__ import annotations

from typing import Any

import structlog
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from src.workers.agent_worker import enqueue_agent_task

logger = structlog.get_logger(__name__)
router = APIRouter()


class OrderCreatedRequest(BaseModel):
    company_id: str = Field(..., min_length=1)
    order_number: str = Field(..., min_length=1)
    customer_phone: str | None = Field(default=None)
    customer_name: str | None = Field(default=None)
    address_text: str | None = Field(default=None)
    governorate: str | None = Field(default=None)
    city: str | None = Field(default=None)
    source: str | None = Field(default="storefront")


@router.post("/orders/created")
async def order_created(body: OrderCreatedRequest) -> dict[str, Any]:
    """Trigger the order-confirmation agent to resolve the order's delivery area.

    Called by the Node backend right after an order is created. The agent
    searches the shipping company's area map with search_area_by_text and, if
    the area is unclear, reaches out to the customer on WhatsApp to confirm.
    """
    if not body.company_id or not body.order_number:
        raise HTTPException(status_code=400, detail="company_id and order_number are required")

    job_id = await enqueue_agent_task(
        task_type="order.created",
        payload={
            "company_id": body.company_id,
            "order_number": body.order_number,
            "customer_phone": body.customer_phone,
            "customer_name": body.customer_name,
            "address_text": body.address_text,
            "governorate": body.governorate,
            "city": body.city,
            "source": body.source or "storefront",
        },
        priority=1,
    )
    logger.info(
        "order_created_triggered",
        company_id=body.company_id,
        order_number=body.order_number,
        job_id=job_id,
    )
    return {"success": True, "job_id": job_id}
