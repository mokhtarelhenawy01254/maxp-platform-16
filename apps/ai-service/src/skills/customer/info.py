from __future__ import annotations
from pydantic import BaseModel, Field
from src.skills.base import Skill


class CustomerInfoInput(BaseModel):
    query: str = Field(description="Phone number, name, or email to look up customer by")
    company_id: str = Field(default="", description="")


async def get_customer_info(params: CustomerInfoInput) -> dict:
    from src.tools.definitions.customer import customer_info, CustomerInfoInput as _CII
    return await customer_info(_CII(query=params.query, company_id=params.company_id))


customer_info = Skill(
    name="customer_info",
    description="Look up a customer by phone number, name, or email. Use when customer wants to order and you need their details, or to check if they are a returning customer. Keywords: عميل, زبون, بيانات, تلفون, تليفون, موبايل, customer, client",
    input_schema=CustomerInfoInput,
    handler=get_customer_info,
    internal_fields=["company_id"],
)
