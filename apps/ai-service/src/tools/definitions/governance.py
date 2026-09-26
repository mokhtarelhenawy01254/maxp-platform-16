from __future__ import annotations

from typing import Any

import structlog
from agent_framework import FunctionTool
from pydantic import BaseModel, Field

import src.db.session as _db_mod
from src.tools.definitions._helpers import _write_result
from src.tools.facebook_client import FacebookGraphClient
from src.tools.repositories.facebook_page_repository import FacebookPageRepository

logger = structlog.get_logger(__name__)


class SchedulerCreateJobInput(BaseModel):
    description: str = Field(description="Natural language description of the scheduled task")
    task_type: str | None = Field(default=None, description="Optional task type")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


class KnowledgeCreateFaqInput(BaseModel):
    question: str = Field(description="FAQ question")
    answer: str = Field(description="FAQ answer")
    category: str | None = Field(default=None, description="Optional category")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


class KnowledgeCreatePolicyInput(BaseModel):
    title: str = Field(description="Policy title")
    content: str = Field(description="Policy content")
    category: str | None = Field(default=None, description="Optional category")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


class FacebookAdCreateDraftInput(BaseModel):
    objective: str = Field(description="Ad objective")
    primary_text: str = Field(description="Primary ad text")
    budget: float | None = Field(default=None, description="Optional budget")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


class MessageBroadcastInput(BaseModel):
    message: str = Field(description="Broadcast message content")
    audience: str = Field(description="Target audience (e.g. 'all', 'vip')")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


async def scheduler_create_job(input_data: SchedulerCreateJobInput) -> dict[str, Any]:
    company_id = input_data.company_id or ""
    if not company_id:
        return {"success": False, "error": "company_id is required"}

    desc = (input_data.description or "").strip()
    if not desc:
        return {"success": False, "error": "description is required"}

    import re
    import json
    import time
    import uuid
    from sqlalchemy import text

    hour = 8
    lower = desc.lower()
    hour_match = re.search(r"الساعة\s+(\d{1,2})", lower)
    if hour_match:
        h = int(hour_match.group(1))
        if 0 <= h <= 23:
            hour = h
    elif "9" in lower:
        hour = 9

    cron_expr = f"0 {hour} * * *"
    task_type = input_data.task_type or "SALES"
    job_id = f"cron_{int(time.time())}_{uuid.uuid4().hex[:6]}"
    metadata = json.dumps({
        "cronExpression": cron_expr,
        "taskType": task_type,
        "runCount": 0,
        "status": "ACTIVE",
        "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
    }, ensure_ascii=False)

    try:
        if _db_mod.async_session is not None:
            async with _db_mod.async_session() as sess:
                await sess.execute(text("""
                    INSERT INTO company_skills (id, "companyId", name, description, instructions, tools, channels, priority, enabled, metadata, "createdAt", "updatedAt")
                    VALUES (:id, :cid, :name, :desc, :inst, '[]', '[]', 0, true, :meta, NOW(), NOW())
                """), {
                    "id": job_id,
                    "cid": company_id,
                    "name": f"[CRON] {desc[:100]}",
                    "desc": desc,
                    "inst": desc,
                    "meta": metadata,
                })
                await sess.commit()

            return {
                "success": True,
                "status": "EXECUTED",
                "job": {
                    "id": job_id,
                    "description": desc,
                    "cronExpression": cron_expr,
                    "taskType": task_type,
                    "status": "ACTIVE",
                },
            }
    except Exception as e:
        logger.error("scheduler_create_job_db_failed", error=str(e))

    return _write_result("scheduler.create_job", {
        "description": input_data.description,
        "taskType": input_data.task_type,
    }, input_data.company_id or "")


async def knowledge_create_faq(input_data: KnowledgeCreateFaqInput) -> dict[str, Any]:
    return _write_result("knowledge.create_faq", {
        "question": input_data.question,
        "answer": input_data.answer,
        "category": input_data.category,
    }, input_data.company_id or "")


async def knowledge_create_policy(input_data: KnowledgeCreatePolicyInput) -> dict[str, Any]:
    return _write_result("knowledge.create_policy", {
        "title": input_data.title,
        "content": input_data.content,
        "category": input_data.category,
    }, input_data.company_id or "")


async def facebook_ad_create_draft(input_data: FacebookAdCreateDraftInput) -> dict[str, Any]:
    return _write_result("facebook_ad.create_draft", {
        "objective": input_data.objective,
        "primaryText": input_data.primary_text,
        "budget": input_data.budget,
    }, input_data.company_id or "")


async def message_broadcast(input_data: MessageBroadcastInput) -> dict[str, Any]:
    return _write_result("message.broadcast", {
        "message": input_data.message,
        "audience": input_data.audience,
    }, input_data.company_id or "")


async def send_facebook_reply(
    company_id: str,
    recipient_id: str,
    message: str,
    page_id: str,
    message_type: str = "TEXT",
    media_url: str | None = None,
) -> dict[str, Any]:
    if not company_id or not recipient_id or not page_id:
        return {"success": False, "error": "Missing required params"}

    sf = _db_mod.async_session
    async with sf() as sess:
        repo = FacebookPageRepository(sess)
        token = await repo.get_page_token(company_id, page_id)

    if not token:
        return {"success": False, "error": "Facebook page not configured or token not found"}

    client = FacebookGraphClient(token)

    try:
        if message_type == "IMAGE" and media_url:
            result = await client._client.request(
                "POST", "/me/messages",
                json={
                    "recipient": {"id": recipient_id},
                    "message": {
                        "attachment": {
                            "type": "image",
                            "payload": {"url": media_url, "is_reusable": True},
                        }
                    },
                    "access_token": token,
                },
            )
            result.raise_for_status()
            data = result.json()
        else:
            data = await client.send_message(recipient_id, message)

        return {"success": True, "result": data, "messageId": data.get("message_id", "")}
    except Exception as exc:
        logger.error("facebook_reply_failed", error=str(exc))
        return {"success": False, "error": str(exc)}


scheduler_create_job_tool = FunctionTool(
    name="scheduler_create_job",
    description="Create a natural-language scheduled routine proposal. REQUIRES MERCHANT APPROVAL.",
    func=scheduler_create_job,
    input_model=SchedulerCreateJobInput,
)

knowledge_create_faq_tool = FunctionTool(
    name="knowledge_create_faq",
    description="Create an approved FAQ entry from a reviewed Agentic RAG learning proposal. REQUIRES MERCHANT APPROVAL.",
    func=knowledge_create_faq,
    input_model=KnowledgeCreateFaqInput,
)

knowledge_create_policy_tool = FunctionTool(
    name="knowledge_create_policy",
    description="Create an approved policy entry from a reviewed Agentic RAG learning proposal. REQUIRES MERCHANT APPROVAL.",
    func=knowledge_create_policy,
    input_model=KnowledgeCreatePolicyInput,
)

facebook_ad_create_draft_tool = FunctionTool(
    name="facebook_ad_create_draft",
    description="Create a Facebook ad draft for merchant review. REQUIRES MERCHANT APPROVAL.",
    func=facebook_ad_create_draft,
    input_model=FacebookAdCreateDraftInput,
)

message_broadcast_tool = FunctionTool(
    name="message_broadcast",
    description="Broadcast a message to customers. REQUIRES MERCHANT APPROVAL.",
    func=message_broadcast,
    input_model=MessageBroadcastInput,
)

__all_tools__ = [
    scheduler_create_job_tool,
    knowledge_create_faq_tool,
    knowledge_create_policy_tool,
    facebook_ad_create_draft_tool,
    message_broadcast_tool,
]
