from __future__ import annotations
from pydantic import BaseModel, Field
from src.skills.base import Skill

class KnowledgeSearchInput(BaseModel):
    query: str = Field(description="Search query in Arabic or English for FAQs, policies, or store information")
    category: str | None = Field(None, description="Category: 'policies', 'faq', 'about', 'shipping_policy', 'return_policy'")

async def search_knowledge(params: KnowledgeSearchInput) -> dict:
    # ponytail: stub — searches knowledge base / FAQ via RAG or DB
    return {
        "results": [
            {"question": "ما هي سياسة الاسترجاع؟", "answer": "يمكن استرجاع المنتجات خلال 14 يوم من الاستلام."},
            {"question": "كم تكلفة الشحن؟", "answer": "الشحن مجاني للطلبات فوق 200 جنيه."},
        ],
        "total": 2,
    }

knowledge_search = Skill(
    name="knowledge_search",
    description="Search the store's knowledge base for FAQs, policies, store information, and general inquiries. Use when customer asks about store policies, business hours, shipping info, or general questions. Arabic keywords: معلومات, اسئله, سؤال, سياسة, شحن, توصيل, مواعيد, عنوان",
    input_schema=KnowledgeSearchInput,
    handler=search_knowledge,
)
