from __future__ import annotations
from pydantic import BaseModel, Field
from src.skills.base import Skill

class ComplaintInput(BaseModel):
    issue: str = Field(description="Description of the complaint or issue")
    order_number: str | None = Field(None, description="Related order number if applicable")
    company_id: str = Field(default="", description="")

async def handle_complaint(params: ComplaintInput) -> dict:
    from src.tools.definitions.knowledge_question import knowledge_ask_merchant
    from src.tools.definitions.knowledge_question import KnowledgeAskMerchantInput
    inp = KnowledgeAskMerchantInput(
        customer_question=f"شكوى: {params.issue}" + (f" (طلب رقم: {params.order_number})" if params.order_number else ""),
        context="complaint",
        company_id=params.company_id,
    )
    return await knowledge_ask_merchant(inp)

support_complaint = Skill(
    name="support_complaint",
    description="Handle customer complaints, damage reports, or service issues. Use when customer has a complaint about product, delivery, or service quality.",
    input_schema=ComplaintInput,
    handler=handle_complaint,
    internal_fields=["company_id"],
)
