from __future__ import annotations

import asyncio
import json
import re
import uuid
from datetime import datetime, timedelta
from typing import Any

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.session import async_session
from src.services.queue_service import QueuePriority, queue_service

logger = structlog.get_logger(__name__)


def _generate_id() -> str:
    return str(uuid.uuid4())


def _parse_metadata(meta: str | dict | None) -> dict:
    if meta is None:
        return {}
    if isinstance(meta, dict):
        return meta
    try:
        return json.loads(meta)
    except (json.JSONDecodeError, TypeError):
        return {}


# ── Deterministic fact extraction (fallback) ────────────────────────────

_EXTRACTORS: list[tuple[re.Pattern, str, str, float]] = [
    (re.compile(r'(?:اسمي|my name is|انا)\s+([^\s,.!?]+)', re.I), "FACT", "name", 0.8),
    (re.compile(r'(?:مقاس|size|مقاسي)\s*(\d{2,3})', re.I), "PREFERENCE", "size", 0.7),
    (re.compile(r'(?:لون|color|اللون)\s+([^\s,.!?]+)', re.I), "PREFERENCE", "color", 0.7),
    (re.compile(r'(?:عايز|ابغى|want|looking for|interested in)\s+(.{3,30})', re.I), "PREFERENCE", "interest", 0.6),
]


def _extract_facts_deterministic(messages: list[dict]) -> list[dict]:
    facts = []
    for msg in messages:
        text = (msg.get("content") or "").lower()
        if not text:
            continue
        for pattern, fact_type, field, confidence in _EXTRACTORS:
            match = pattern.search(text)
            if match:
                facts.append({
                    "type": fact_type,
                    "content": f"{field.title()}: {match.group(1)}",
                    "confidence": confidence,
                    "metadata": {"source": "EXPLICIT_CHAT" if confidence > 0.7 else "INFERRED", "field": field},
                })
    return facts


def _generate_summary_fallback(messages: list[dict]) -> dict:
    if not messages:
        return {"summary": "Empty conversation", "keyTopics": [], "sentiment": "NEUTRAL"}
    all_text = " ".join(m.get("content", "") for m in messages if m.get("content"))
    words = [w for w in all_text.split() if len(w) > 2]
    word_freq: dict[str, int] = {}
    for w in words:
        key = w.lower()
        word_freq[key] = word_freq.get(key, 0) + 1
    key_topics = sorted(word_freq, key=word_freq.__getitem__, reverse=True)[:5]
    sentiment = "NEUTRAL"
    if re.search(r"شكر|thanks|great|ممتاز|حلو|excellent|good", all_text, re.I):
        sentiment = "POSITIVE"
    if re.search(r"مشكل|problem|bad|سيء|غضب|angry|disappointed", all_text, re.I):
        sentiment = "NEGATIVE"
    return {
        "summary": f"Conversation with {len(messages)} messages discussing: {', '.join(key_topics[:3])}",
        "keyTopics": key_topics,
        "sentiment": sentiment,
    }


async def _log_agent_run(
    session: AsyncSession,
    task_id: str,
    company_id: str,
    agent_id: str,
    status: str,
    output: dict[str, Any] | None = None,
    error: str | None = None,
    model_used: str | None = None,
    provider_used: str | None = None,
    latency_ms: int | None = None,
    step_name: str | None = None,
    step_index: int = 0,
) -> None:
    """Log a single agent execution attempt to ai.ai_agent_runs."""
    from src.db.models.task import AiAgentRun
    run = AiAgentRun(
        task_id=task_id,
        company_id=company_id,
        agent_id=agent_id,
        step_name=step_name,
        step_index=step_index,
        status=status,
        output=output,
        error=error,
        model_used=model_used,
        provider_used=provider_used,
        latency_ms=latency_ms,
    )
    session.add(run)


# ── Memory Consolidation (DreamerWorker port) ───────────────────────────


async def handle_memory_consolidation(job: dict[str, Any]) -> None:
    """Port of Node.js DreamerWorker: consolidate episodic memory from chat history."""
    payload = job.get("payload", {})
    company_id = payload.get("company_id")
    if not company_id:
        logger.warning("memory consolidation skipped: no company_id")
        return

    logger.info("consolidating memory", company_id=company_id, job_id=job["id"])
    result = {"processed": 0, "factsCreated": 0, "errors": []}

    async with async_session() as session:
        since = datetime.utcnow() - timedelta(hours=24)

        conv_rows = await session.execute(
            "SELECT id, customer_id, company_id, metadata, updated_at "
            "FROM conversations "
            "WHERE company_id = :company_id AND updated_at >= :since "
            "AND (metadata IS NULL OR metadata::jsonb ->> 'dreamerProcessed' IS NULL OR metadata::jsonb ->> 'dreamerProcessed' = 'false') "
            "ORDER BY updated_at DESC LIMIT 10",
            {"company_id": company_id, "since": since},
        )
        conversations = conv_rows.fetchall()

        if not conversations:
            logger.info("no conversations to consolidate", company_id=company_id)
            return

        from src.llm.client import LLMClient
        from src.config import get_settings

        settings = get_settings()
        api_key = settings.google_api_key
        provider = LLMClient(provider="GOOGLE", model="gemini-2.5-flash", api_key=api_key) if api_key else None

        for conv in conversations:
            conv_id, customer_id, _conv_company_id, metadata_raw, _updated_at = conv

            msg_rows = await session.execute(
                "SELECT content, is_from_customer, created_at FROM messages WHERE conversation_id = :conv_id ORDER BY created_at ASC",
                {"conv_id": conv_id},
            )
            messages = [
                {"content": r[0], "isFromCustomer": r[1], "createdAt": r[2]}
                for r in msg_rows.fetchall()
            ]

            if not messages:
                existing_meta = _parse_metadata(metadata_raw)
                existing_meta["dreamerProcessed"] = True
                existing_meta["dreamerAt"] = datetime.utcnow().isoformat()
                existing_meta["summary"] = "Empty conversation"
                await session.execute(
                    "UPDATE conversations SET metadata = :meta WHERE id = :id",
                    {"meta": json.dumps(existing_meta), "id": conv_id},
                )
                result["processed"] += 1
                continue

            facts = []
            summary_data = None
            used_llm = False

            if provider:
                try:
                    messages_text = "\n".join(
                        f"{'Customer' if m['isFromCustomer'] else 'Agent'}: {m['content']}"
                        for m in messages
                    )
                    prompt = f"""You are the Dreamer background consolidation worker for an AI storefront agent.
Review the following conversation history between the Customer and the Agent:
---
{messages_text}
---

Your task is to:
1. Extract any concrete, explicit facts or long-term preferences about the customer (e.g. name, location, sizing preferences, preferred colors, interests, allergies).
2. Generate a concise summary of the conversation (max 2 sentences).
3. Identify the key topics discussed.
4. Classify the customer's sentiment (POSITIVE, NEGATIVE, or NEUTRAL).

Provide your output in valid JSON format only, matching this schema:
{{
  "facts": [
    {{
      "type": "FACT" | "PREFERENCE",
      "content": "Specific factual detail (e.g. Customer name is Mokhtar)",
      "confidence": 0.0 to 1.0,
      "metadata": {{
        "source": "EXPLICIT_CHAT",
        "field": "name" | "size" | "color" | "interest" | "other"
      }}
    }}
  ],
  "summary": "Short 1-2 sentence summary of interaction",
  "keyTopics": ["topic1", "topic2"],
  "sentiment": "POSITIVE" | "NEGATIVE" | "NEUTRAL"
}}
Do not return any extra text, only the raw JSON."""

                    response = await provider.generate(
                        messages=[{"role": "user", "content": prompt}],
                        temperature=0.2,
                        max_tokens=500,
                    )

                    reply = response.text or ""
                    json_text = reply.strip()
                    if "```" in json_text:
                        m = re.search(r"```(?:json)?([\s\S]+?)```", json_text)
                        if m:
                            json_text = m.group(1).strip()

                    parsed = json.loads(json_text)
                    facts = parsed.get("facts", [])
                    summary_data = {
                        "summary": parsed.get("summary", ""),
                        "keyTopics": parsed.get("keyTopics", []),
                        "sentiment": parsed.get("sentiment", "NEUTRAL"),
                    }
                    used_llm = True

                except Exception as exc:
                    logger.warning("llm consolidation failed, falling back", error=str(exc))

            if not used_llm:
                facts = _extract_facts_deterministic(messages)
                summary_data = _generate_summary_fallback(messages)

            for fact in facts:
                try:
                    fact_id = _generate_id()
                    await session.execute(
                        "INSERT INTO ai.agentic_memory_fact "
                        "(id, company_id, customer_id, type, content, confidence, importance, metadata_json, created_at, updated_at) "
                        "VALUES (:id, :company_id, :customer_id, :type, :content, :confidence, :importance, :metadata_json::jsonb, NOW(), NOW()) "
                        "ON CONFLICT (id) DO NOTHING",
                        {
                            "id": fact_id,
                            "company_id": company_id,
                            "customer_id": customer_id or "",
                            "type": fact.get("type", "FACT"),
                            "content": fact.get("content", ""),
                            "confidence": fact.get("confidence", 0.8),
                            "importance": 3,
                            "metadata_json": json.dumps({
                                **(fact.get("metadata", {}) or {}),
                                "conversationId": conv_id,
                                "consolidatedAt": datetime.utcnow().isoformat(),
                            }),
                        },
                    )
                    result["factsCreated"] += 1
                except Exception as e:
                    result["errors"].append(f"Fact save error: {e}")

            existing_meta = _parse_metadata(metadata_raw)
            existing_meta["dreamerProcessed"] = True
            existing_meta["dreamerAt"] = datetime.utcnow().isoformat()
            if summary_data:
                existing_meta["summary"] = summary_data.get("summary", "")
                existing_meta["keyTopics"] = summary_data.get("keyTopics", [])
                existing_meta["sentiment"] = summary_data.get("sentiment", "NEUTRAL")

            await session.execute(
                "UPDATE conversations SET metadata = :meta WHERE id = :id",
                {"meta": json.dumps(existing_meta), "id": conv_id},
            )
            result["processed"] += 1

        await session.commit()

    logger.info(
        "memory consolidation complete",
        company_id=company_id,
        processed=result["processed"],
        facts_created=result["factsCreated"],
        errors=len(result["errors"]),
    )


# ── RAG Backfill ────────────────────────────────────────────────────────


async def handle_rag_backfill(job: dict[str, Any]) -> None:
    """Background task: backfill RAG knowledge embeddings."""
    payload = job.get("payload", {})
    company_id = payload.get("company_id")
    knowledge_id = payload.get("knowledge_id")
    logger.info("backfilling RAG knowledge", company_id=company_id, knowledge_id=knowledge_id)


async def handle_facebook_message(job: dict[str, Any]) -> None:
    """Background task: process an incoming Facebook message."""
    payload = job.get("payload", {})
    sender_id = payload.get("sender_id")
    page_id = payload.get("page_id")
    message_text = payload.get("text")
    company_id = payload.get("company_id")
    mid = payload.get("mid")

    if not all([sender_id, page_id, message_text, company_id]):
        logger.warning("facebook message skipped: missing required fields", payload=payload)
        return

    logger.info("processing facebook message", sender_id=sender_id, company_id=company_id)

    async with async_session() as session:
        # 1. Get Page Token
        page_row = await session.execute(
            "SELECT page_access_token FROM facebook_pages WHERE page_id = :page_id AND company_id = :company_id",
            {"page_id": page_id, "company_id": company_id},
        )
        page_res = page_row.scalar_one_or_none()
        if not page_res:
            logger.error("facebook page not found", page_id=page_id, company_id=company_id)
            return
        token = page_res

        # 2. Customer Lookup/Creation
        cust_row = await session.execute(
            "SELECT id FROM customers WHERE facebook_id = :sid AND company_id = :cid",
            {"sid": sender_id, "cid": company_id},
        )
        customer_id = cust_row.scalar_one_or_none()
        if not customer_id:
            # Simplified: just create a new customer
            cust_id = _generate_id()
            await session.execute(
                "INSERT INTO customers (id, company_id, facebook_id, name) VALUES (:id, :cid, :sid, :name)",
                {"id": cust_id, "cid": company_id, "sid": sender_id, "name": f"FB User {sender_id}"},
            )
            customer_id = cust_id

        # 3. Check Blocked
        blocked_row = await session.execute(
            "SELECT 1 FROM blocked_customers_on_pages WHERE customer_id = :cid AND page_id = :pid",
            {"cid": customer_id, "pid": page_id},
        )
        if blocked_row.scalar():
            logger.info("customer blocked on page", customer_id=customer_id, page_id=page_id)
            return

        # 4. Manage Conversation (Thread)
        thread_row = await session.execute(
            "SELECT id FROM ai.threads WHERE customer_id = :cid AND company_id = :coid AND channel = 'facebook' AND status = 'active'",
            {"cid": customer_id, "coid": company_id},
        )
        thread_id = thread_row.scalar_one_or_none()
        if not thread_id:
            thread_id = _generate_id()
            await session.execute(
                "INSERT INTO ai.threads (id, company_id, customer_id, channel, status) VALUES (:id, :coid, :cid, 'facebook', 'active')",
                {"id": thread_id, "coid": company_id, "cid": customer_id},
            )

        # 5. Save Message (deduplicated)
        try:
            await session.execute(
                "INSERT INTO messages (id, conversation_id, content, is_from_customer, created_at) VALUES (:id, :conv_id, :content, true, NOW())",
                {"id": mid, "conv_id": thread_id, "content": message_text},
            )
        except Exception:
            logger.debug("message already exists", mid=mid)

        await session.commit()

        # 6. AI Process — try DB channel agent first, fall back to template
        from src.agents.base import BaseAgent
        from src.workflows.orchestration_flow import _resolve_channel_agent
        from src.skills.registry import get_skill_registry
        agent = None
        try:
            _id, channel_agent, _src = await _resolve_channel_agent(
                company_id=company_id, channel="facebook",
                registry=get_skill_registry(), session=session,
            )
            if channel_agent:
                agent = channel_agent
        except Exception:
            logger.warning("channel_agent_resolution_failed", exc_info=True)
        if not agent:
            agent = await BaseAgent.from_template(
                template_slug="facebook-sales-support-agent",
                company_id=company_id,
                overrides={
                    "id": f"fb_agent_{page_id[:8]}",
                    "name": f"FB Agent {page_id[:8]}",
                    "persona": {"channel": "facebook"},
                },
                session=session,
            )

        start_time = datetime.utcnow()
        task_result = await agent.process_task({
            "description": message_text,
            "session_id": thread_id,
            "user_id": customer_id,
            "company_id": company_id,
            "channel": "facebook",
        })
        latency = int((datetime.utcnow() - start_time).total_seconds() * 1000)

        status = "SUCCESS" if task_result.get("status") == "SUCCESS" else "FAILED"
        result_data = task_result.get("result", {})

        async with async_session() as run_session:
            task_id = _generate_id()
            await run_session.execute(
                "INSERT INTO ai.ai_agent_tasks (id, company_id, agent_id, title, description, status) "
                "VALUES (:id, :cid, :aid, :title, :desc, :status)",
                {"id": task_id, "cid": company_id, "aid": agent.config.id, "title": "FB Message", "desc": message_text, "status": status}
            )
            await _log_agent_run(
                session=run_session,
                task_id=task_id,
                company_id=company_id,
                agent_id=agent.config.id,
                status=status,
                output=result_data,
                model_used=agent.config.model,
                provider_used="facebook_worker",
                latency_ms=latency,
                step_name="chat_reply",
            )
            await run_session.commit()

        reply = result_data.get("reply")
        if reply:
            from src.tools.facebook_client import FacebookGraphClient
            async with FacebookGraphClient(token) as fb:
                await fb.send_message(sender_id, reply)
            logger.info("facebook reply sent", sender_id=sender_id, reply=reply)

async def handle_facebook_comment(job: dict[str, Any]) -> None:
    """Background task: process a Facebook comment."""
    payload = job.get("payload", {})
    comment_id = payload.get("comment_id")
    comment_text = payload.get("text")
    page_id = payload.get("page_id")
    company_id = payload.get("company_id")
    sender_id = payload.get("sender_id")

    if not all([comment_id, comment_text, page_id, company_id]):
        return

    # 1. Filter Negative Keywords
    from src.observability.pii import PII_PATTERNS
    is_negative = False
    for pattern, _ in PII_PATTERNS: # Using PII patterns as a proxy for negative keywords for now
        if pattern.search(comment_text):
            is_negative = True
            break

    async with async_session() as session:
        page_row = await session.execute(
            "SELECT page_access_token FROM facebook_pages WHERE page_id = :page_id",
            {"page_id": page_id},
        )
        token = page_row.scalar_one_or_none()
        if not token: return

        if is_negative:
            from src.tools.facebook_client import FacebookGraphClient
            async with FacebookGraphClient(token) as fb:
                await fb.hide_comment(comment_id)
            return

        # Store comment
        await session.execute(
            "INSERT INTO facebook_comments (id, page_id, comment_id, text, sender_id) VALUES (:id, :pid, :cid, :text, :sid) ON CONFLICT (comment_id) DO UPDATE SET text = :text",
            {"id": _generate_id(), "pid": page_id, "cid": comment_id, "text": comment_text, "sid": sender_id},
        )
        await session.commit()

    # AI Reply to comment — try DB channel agent first, fall back to template
    from src.agents.base import BaseAgent
    from src.workflows.orchestration_flow import _resolve_channel_agent
    from src.skills.registry import get_skill_registry
    agent = None
    try:
        _id, channel_agent, _src = await _resolve_channel_agent(
            company_id=company_id, channel="facebook",
            registry=get_skill_registry(), session=session,
        )
        if channel_agent:
            agent = channel_agent
    except Exception:
        logger.warning("channel_agent_resolution_failed", exc_info=True)
    if not agent:
        agent = await BaseAgent.from_template(
            template_slug="facebook-sales-support-agent",
            company_id=company_id,
            overrides={
                "id": f"fb_comment_agent_{page_id[:8]}",
                "name": "FB Comment Agent",
                "persona": {"channel": "facebook"},
            },
            session=session,
        )
    task_result = await agent.process_task({
        "description": comment_text,
        "company_id": company_id,
        "channel": "facebook",
    })
    reply = task_result.get("result", {}).get("reply")
    if reply:
        from src.tools.facebook_client import FacebookGraphClient
        async with FacebookGraphClient(token) as fb:
            await fb.reply_to_comment(comment_id, reply)

async def handle_facebook_read_receipt(job: dict[str, Any]) -> None:
    """Background task: process a Facebook read receipt."""
    payload = job.get("payload", {})
    sender_id = payload.get("sender_id")
    watermark = payload.get("watermark")
    company_id = payload.get("company_id")

    if not all([sender_id, watermark, company_id]):
        return

    async with async_session() as session:
        # Find conversation for this sender
        thread_row = await session.execute(
            "SELECT id FROM ai.threads WHERE customer_id = (SELECT id FROM customers WHERE facebook_id = :sid AND company_id = :cid) AND company_id = :cid",
            {"sid": sender_id, "cid": company_id},
        )
        thread_id = thread_row.scalar_one_or_none()
        if not thread_id: return

        await session.execute(
            "UPDATE messages SET is_read = true WHERE conversation_id = :tid AND is_from_customer = false AND created_at <= :watermark",
            {"tid": thread_id, "watermark": watermark},
        )
        await session.commit()


async def handle_whatsapp_message(job: dict[str, Any]) -> None:
    """Background task: process an incoming WhatsApp message."""
    payload = job.get("payload", {})
    sender_id = payload.get("sender_id")
    phone_number_id = payload.get("phone_number_id")
    message_text = payload.get("text")
    company_id = payload.get("company_id")
    mid = payload.get("mid")

    if not all([sender_id, phone_number_id, message_text, company_id]):
        logger.warning("whatsapp message skipped: missing required fields", payload=payload)
        return

    logger.info("processing whatsapp message", sender_id=sender_id, company_id=company_id)

    async with async_session() as session:
        # 1. Get Page/Phone Token
        page_row = await session.execute(
            "SELECT page_access_token FROM facebook_pages WHERE page_id = :pid AND company_id = :cid",
            {"pid": phone_number_id, "cid": company_id},
        )
        page_res = page_row.scalar_one_or_none()
        if not page_res:
            logger.error("whatsapp phone not found", pid=phone_number_id, cid=company_id)
            return
        token = page_res

        # 2. Customer Lookup/Creation
        cust_row = await session.execute(
            "SELECT id FROM customers WHERE whatsapp_id = :sid AND company_id = :cid",
            {"sid": sender_id, "cid": company_id},
        )
        customer_id = cust_row.scalar_one_or_none()
        if not customer_id:
            cust_id = _generate_id()
            await session.execute(
                "INSERT INTO customers (id, company_id, whatsapp_id, name) VALUES (:id, :cid, :sid, :name)",
                {"id": cust_id, "cid": company_id, "sid": sender_id, "name": f"WA User {sender_id}"},
            )
            customer_id = cust_id

        # 3. Manage Conversation (Thread)
        thread_row = await session.execute(
            "SELECT id FROM ai.threads WHERE customer_id = :cid AND company_id = :coid AND channel = 'whatsapp' AND status = 'active'",
            {"cid": customer_id, "coid": company_id},
        )
        thread_id = thread_row.scalar_one_or_none()
        if not thread_id:
            thread_id = _generate_id()
            await session.execute(
                "INSERT INTO ai.threads (id, company_id, customer_id, channel, status) VALUES (:id, :coid, :cid, 'whatsapp', 'active')",
                {"id": thread_id, "coid": company_id, "cid": customer_id},
            )

        # 4. Save Message (deduplicated)
        try:
            await session.execute(
                "INSERT INTO messages (id, conversation_id, content, is_from_customer, created_at) VALUES (:id, :conv_id, :content, true, NOW())",
                {"id": mid, "conv_id": thread_id, "content": message_text},
            )
        except Exception:
            logger.debug("message already exists", mid=mid)

        await session.commit()

        # 5. AI Process — load from template (2026 system-prompt-driven pattern)
        from src.agents.base import BaseAgent
        agent = await BaseAgent.from_template(
            "sales-agent",
            company_id,
            overrides={
                "id": f"wa_agent_{phone_number_id[:8]}",
                "name": f"WA Agent {phone_number_id[:8]}",
                "persona": {"channel": "whatsapp"},
            },
            session=session,
        )

        task_result = await agent.process_task({
            "description": message_text,
            "session_id": thread_id,
            "user_id": customer_id,
            "company_id": company_id,
            "channel": "whatsapp",
        })

        reply = task_result.get("result", {}).get("reply")
        if reply:
            from src.tools.whatsapp_client import WhatsAppClient
            async with WhatsAppClient(token, phone_number_id) as wa:
                await wa.send_text(sender_id, reply)
            logger.info("whatsapp reply sent", sender_id=sender_id, reply=reply)


async def handle_telegram_message(job: dict[str, Any]) -> None:
    """Background task: process an incoming Telegram message."""
    payload = job.get("payload", {})
    sender_id = payload.get("sender_id")
    message_text = payload.get("text")
    company_id = payload.get("company_id")
    mid = payload.get("mid")

    if not all([sender_id, message_text, company_id]):
        logger.warning("telegram message skipped: missing required fields", payload=payload)
        return

    logger.info("processing telegram message", sender_id=sender_id, company_id=company_id)

    async with async_session() as session:
        # 1. Customer Lookup/Creation
        cust_row = await session.execute(
            "SELECT id FROM customers WHERE telegram_id = :sid AND company_id = :cid",
            {"sid": sender_id, "cid": company_id},
        )
        customer_id = cust_row.scalar_one_or_none()
        if not customer_id:
            cust_id = _generate_id()
            await session.execute(
                "INSERT INTO customers (id, company_id, telegram_id, name) VALUES (:id, :cid, :sid, :name)",
                {"id": cust_id, "cid": company_id, "sid": sender_id, "name": f"TG User {sender_id}"},
            )
            customer_id = cust_id

        # 2. Manage Conversation (Thread)
        thread_row = await session.execute(
            "SELECT id FROM ai.threads WHERE customer_id = :cid AND company_id = :coid AND channel = 'telegram' AND status = 'active'",
            {"cid": customer_id, "coid": company_id},
        )
        thread_id = thread_row.scalar_one_or_none()
        if not thread_id:
            thread_id = _generate_id()
            await session.execute(
                "INSERT INTO ai.threads (id, company_id, customer_id, channel, status) VALUES (:id, :coid, :cid, 'telegram', 'active')",
                {"id": thread_id, "coid": company_id, "cid": customer_id},
            )

        # 3. Save Message (deduplicated)
        try:
            await session.execute(
                "INSERT INTO messages (id, conversation_id, content, is_from_customer, created_at) VALUES (:id, :conv_id, :content, true, NOW())",
                {"id": mid, "conv_id": thread_id, "content": message_text},
            )
        except Exception:
            logger.debug("message already exists", mid=mid)

        await session.commit()

        # 4. AI Process — load from template (2026 system-prompt-driven pattern)
        from src.agents.base import BaseAgent
        agent = await BaseAgent.from_template(
            "sales-agent",
            company_id,
            overrides={
                "id": f"tg_agent_{company_id[:8]}",
                "name": "TG Agent",
                "persona": {"channel": "telegram"},
            },
            session=session,
        )

        start_time = datetime.utcnow()
        task_result = await agent.process_task({
            "description": message_text,
            "session_id": thread_id,
            "user_id": customer_id,
            "company_id": company_id,
            "channel": "telegram",
        })
        latency = int((datetime.utcnow() - start_time).total_seconds() * 1000)

        status = "SUCCESS" if task_result.get("status") == "SUCCESS" else "FAILED"
        result_data = task_result.get("result", {})

        async with async_session() as run_session:
            task_id = _generate_id()
            await run_session.execute(
                "INSERT INTO ai.ai_agent_tasks (id, company_id, agent_id, title, description, status) "
                "VALUES (:id, :cid, :aid, :title, :desc, :status)",
                {"id": task_id, "cid": company_id, "aid": agent.config.id, "title": "TG Message", "desc": message_text, "status": status}
            )
            await _log_agent_run(
                session=run_session,
                task_id=task_id,
                company_id=company_id,
                agent_id=agent.config.id,
                status=status,
                output=result_data,
                model_used=agent.config.model,
                provider_used="telegram_worker",
                latency_ms=latency,
                step_name="chat_reply",
            )
            await run_session.commit()

        reply = result_data.get("reply")
        if reply:
            from src.db.repo.telegram_config_repo import TelegramConfigRepository
            async with async_session() as config_session:
                repo = TelegramConfigRepository(config_session)
                config = await repo.get_active_config(company_id)

            if not config:
                logger.error("no active telegram config for company", company_id=company_id)
                return

            from src.tools.telegram_client import TelegramUserbotClient
            client = TelegramUserbotClient(
                api_id=int(config.api_id) if config.api_id else 0,
                api_hash=config.api_hash or "",
                session_str=config.session_string
            )
            await client.connect()
            await client.send_message(sender_id, reply)
            await client.close()
            logger.info("telegram reply sent", sender_id=sender_id, reply=reply)


# ── Scheduled Agent Task (RoutineExecutorService port) ───────────────────


# ── Scheduled Agent Task (RoutineExecutorService port) ───────────────────


async def handle_scheduled_agent_task(job: dict[str, Any]) -> None:
    """Port of Node.js RoutineExecutorService: execute a scheduled agent routine."""
    payload = job.get("payload", {})
    company_id = payload.get("company_id")
    task_type = payload.get("type", "GENERAL")
    agent_id = payload.get("agent_id")
    task_context = payload.get("context", {})
    job_id = job["id"]

    logger.info("executing scheduled agent task", company_id=company_id, type=task_type, job_id=job_id)

    from sqlalchemy import select

    from src.agents.base import BaseAgent
    from src.db.models.agent import AgentTemplate

    role = "SALES" if task_type == "GENERAL" else task_type
    async with async_session() as session:
        trow = await session.execute(
            select(AgentTemplate).where(AgentTemplate.role == role).limit(1)
        )
        tpl = trow.scalar_one_or_none()
        slug = tpl.slug if tpl else "sales-agent"

        agent = await BaseAgent.from_template(
            slug,
            company_id,
            overrides={
                "id": agent_id or f"routine_{_generate_id()[:8]}",
                "name": f"Routine-{task_type}",
                "role": role,
                "model": payload.get("model"),
                "allowed_tools": payload.get("tools", []),
            },
            session=session,
        )

    task_obj = {
        "description": f"Routine scheduled execution of type: {task_type}",
        "job_id": job_id,
        "context": task_context,
    }

    try:
        start_time = datetime.utcnow()
        task_result = await agent.process_task(task_obj)
        latency = int((datetime.utcnow() - start_time).total_seconds() * 1000)

        status = "SUCCESS" if task_result.get("status") == "SUCCESS" else "FAILED"
        result_data = task_result.get("result", {})

        async with async_session() as session:
            # 1. Create/Ensure the high-level task exists
            task_id = _generate_id()
            await session.execute(
                "INSERT INTO ai.ai_agent_tasks (id, company_id, agent_id, title, description, status, priority) "
                "VALUES (:id, :cid, :aid, :title, :desc, :status, :prio)",
                {
                    "id": task_id,
                    "cid": company_id,
                    "aid": agent.config.id,
                    "title": f"Scheduled {task_type}",
                    "desc": task_obj["description"],
                    "status": status,
                    "prio": "medium",
                }
            )

            # 2. Log the run
            await _log_agent_run(
                session=session,
                task_id=task_id,
                company_id=company_id,
                agent_id=agent.config.id,
                status=status,
                output=result_data,
                model_used=agent.config.model,
                provider_used="scheduled_worker",
                latency_ms=latency,
                step_name=task_type,
            )

            # 3. Legacy provider log
            action_map = {"FOLLOW_UP": "FOLLOW_UP_SENT", "INVENTORY_CHECK": "INVENTORY_AUDITED", "REPORT": "REPORT_GENERATED"}
            action = action_map.get(task_type, f"{task_type}_COMPLETED")
            await session.execute(
                "INSERT INTO ai.provider_logs (id, provider, company_id, scope, action, status, message, metadata, created_at) "
                "VALUES (:id, :provider, :company_id, :scope, :action, :status, :message, :metadata::jsonb, NOW())",
                {
                    "id": _generate_id(),
                    "provider": "ROUTINE_EXECUTOR",
                    "company_id": company_id,
                    "scope": "routine",
                    "action": task_type,
                    "status": status,
                    "message": result_data.get("summary", ""),
                    "metadata": json.dumps({"jobId": job_id, "action": action}),
                },
            )
            await session.commit()

        logger.info("scheduled agent task completed", company_id=company_id, type=task_type, status=status)

    except Exception as exc:
        logger.error("scheduled agent task failed", company_id=company_id, type=task_type, error=str(exc))
        async with async_session() as session:
            # Log failure run
            task_id = _generate_id()
            await session.execute(
                "INSERT INTO ai.ai_agent_tasks (id, company_id, agent_id, title, description, status) "
                "VALUES (:id, :cid, :aid, :title, :desc, 'FAILED')",
                {"id": task_id, "cid": company_id, "aid": agent.config.id, "title": f"Scheduled {task_type}", "desc": "Failed routine"}
            )
            await _log_agent_run(
                session=session,
                task_id=task_id,
                company_id=company_id,
                agent_id=agent.config.id,
                status="FAILED",
                error=str(exc),
                provider_used="scheduled_worker",
            )
            await session.commit()



TASK_HANDLERS = {
    "memory.consolidate": handle_memory_consolidation,
    "rag.backfill": handle_rag_backfill,
    "agent.scheduled_task": handle_scheduled_agent_task,
    "facebook.message": handle_facebook_message,
    "facebook.comment": handle_facebook_comment,
    "facebook.read_receipt": handle_facebook_read_receipt,
    "whatsapp.message": handle_whatsapp_message,
    "telegram.message": handle_telegram_message,
}


# ── Worker lifecycle ────────────────────────────────────────────────────


async def start_worker(queue_name: str = "agent-tasks", poll_interval: float = 0.5) -> None:
    """Start the background worker loop."""
    logger.info("worker started", queue=queue_name)

    async def dispatcher(job: dict[str, Any]) -> None:
        task_type = job.get("type", "")
        handler = TASK_HANDLERS.get(task_type)
        if handler:
            await handler(job)
        else:
            logger.warning("no handler for task type", type=task_type)

    await queue_service.register_worker(queue_name, dispatcher, poll_interval=poll_interval)


async def enqueue_agent_task(
    task_type: str,
    payload: dict[str, Any],
    priority: int = QueuePriority.MEDIUM,
) -> str:
    """Enqueue a background task for the agent worker."""
    return await queue_service.enqueue(
        queue_name="agent-tasks",
        task_type=task_type,
        payload=payload,
        priority=priority,
    )


# ── CLI entry point ─────────────────────────────────────────────────────


def run_worker_sync():
    """Synchronous entry point for `python -m src.workers.agent_worker`."""
    asyncio.run(_run_worker_async())


async def _run_worker_async():
    from src.db.session import close_db, init_db
    from src.services.redis_client import redis_client

    await init_db()
    await redis_client.connect()
    logger.info("database and redis initialized")

    try:
        await start_worker()
    except KeyboardInterrupt:
        logger.info("worker shutting down")
    finally:
        await close_db()
        await redis_client.disconnect()
