from __future__ import annotations
from pydantic import BaseModel, Field
from src.skills.base import Skill


class AskMerchantInput(BaseModel):
    customer_question: str = Field(description="The customer's question that the AI couldn't answer")
    context: str | None = Field(None, description="JSON string with additional context like product IDs, order IDs")
    company_id: str = Field(default="", description="")


async def ask_merchant(params: AskMerchantInput) -> dict:
    from src.tools.definitions.knowledge_question import knowledge_ask_merchant, KnowledgeAskMerchantInput
    inp = KnowledgeAskMerchantInput(
        customer_question=params.customer_question,
        context=params.context,
        company_id=params.company_id,
    )
    return await knowledge_ask_merchant(inp)


ask_merchant_skill = Skill(
    name="ask_merchant",
    description="Ask the merchant for information when the AI cannot answer a customer's question. Use when you don't have enough information about pricing, policies, promotions, stock, or other merchant-specific knowledge. Keywords: merchant, تاجر, سؤال, استفسار, صاحب المتجر",
    input_schema=AskMerchantInput,
    handler=ask_merchant,
    internal_fields=["company_id"],
)
