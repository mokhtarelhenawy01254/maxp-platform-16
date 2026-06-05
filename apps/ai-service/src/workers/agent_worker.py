from __future__ import annotations

import asyncio
import json
import re
import uuid
from datetime import datetime, timedelta
from typing import Any

import structlog

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

        from src.llm.providers import get_provider_factory
        factory = get_provider_factory()
        provider = await factory.get_active_provider()

        for conv in conversations:
            conv_id, customer_id, conv_company_id, metadata_raw, updated_at = conv

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

                    response = await provider.generate_response(
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


# ── Scheduled Agent Task (RoutineExecutorService port) ───────────────────


async def handle_scheduled_agent_task(job: dict[str, Any]) -> None:
    """Port of Node.js RoutineExecutorService: execute a scheduled agent routine."""
    payload = job.get("payload", {})
    company_id = payload.get("company_id")
    task_type = payload.get("type", "GENERAL")
    agent_id = payload.get("agent_id")
    task_context = payload.get("context", {})

    logger.info("executing scheduled agent task", company_id=company_id, type=task_type, job_id=job["id"])

    from src.agents.base import BaseAgent, BaseAgentConfig

    agent = BaseAgent(BaseAgentConfig(
        id=agent_id or f"routine_{_generate_id()[:8]}",
        name=f"Routine-{task_type}",
        role="SALES" if task_type == "GENERAL" else task_type,
        company_id=company_id,
        allowed_tools=payload.get("tools", []),
        model=payload.get("model"),
    ))

    task_obj = {
        "description": f"Routine scheduled execution of type: {task_type}",
        "job_id": job["id"],
        "context": task_context,
    }

    try:
        task_result = await agent.process_task(task_obj)
        status = "SUCCESS" if task_result.get("status") == "SUCCESS" else "FAILED"

        action_map = {
            "FOLLOW_UP": "FOLLOW_UP_SENT",
            "INVENTORY_CHECK": "INVENTORY_AUDITED",
            "REPORT": "REPORT_GENERATED",
        }
        action = action_map.get(task_type, f"{task_type}_COMPLETED")

        async with async_session() as session:
            await session.execute(
                "INSERT INTO ai.provider_logs "
                "(id, provider, company_id, scope, action, status, message, metadata, created_at) "
                "VALUES (:id, :provider, :company_id, :scope, :action, :status, :message, :metadata::jsonb, NOW())",
                {
                    "id": _generate_id(),
                    "provider": "ROUTINE_EXECUTOR",
                    "company_id": company_id,
                    "scope": "routine",
                    "action": task_type,
                    "status": status,
                    "message": task_result.get("result", {}).get("summary", ""),
                    "metadata": json.dumps({
                        "jobId": job["id"],
                        "budgetUsed": 0.001,
                        "action": action,
                    }),
                },
            )
            await session.commit()

        logger.info("scheduled agent task completed", company_id=company_id, type=task_type, status=status)

    except Exception as exc:
        logger.error("scheduled agent task failed", company_id=company_id, type=task_type, error=str(exc))

        async with async_session() as session:
            await session.execute(
                "INSERT INTO ai.provider_logs "
                "(id, provider, company_id, scope, action, status, message, metadata, created_at) "
                "VALUES (:id, :provider, :company_id, :scope, :action, :status, :message, :metadata::jsonb, NOW())",
                {
                    "id": _generate_id(),
                    "provider": "ROUTINE_EXECUTOR",
                    "company_id": company_id,
                    "scope": "routine",
                    "action": task_type,
                    "status": "FAILED",
                    "message": str(exc),
                    "metadata": json.dumps({"jobId": job["id"]}),
                },
            )
            await session.commit()


TASK_HANDLERS = {
    "memory.consolidate": handle_memory_consolidation,
    "rag.backfill": handle_rag_backfill,
    "agent.scheduled_task": handle_scheduled_agent_task,
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
    from src.db.session import init_db, close_db
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
