from __future__ import annotations

from typing import Any

import structlog

from src.services.queue_service import QueuePriority, queue_service

logger = structlog.get_logger(__name__)


async def handle_memory_consolidation(job: dict[str, Any]) -> None:
    """Background task: consolidate episodic memory from conversation history."""
    payload = job.get("payload", {})
    company_id = payload.get("company_id")
    logger.info("consolidating memory", company_id=company_id, job_id=job["id"])


async def handle_rag_backfill(job: dict[str, Any]) -> None:
    """Background task: backfill RAG knowledge embeddings."""
    payload = job.get("payload", {})
    company_id = payload.get("company_id")
    logger.info("backfilling RAG knowledge", company_id=company_id, job_id=job["id"])


async def handle_scheduled_agent_task(job: dict[str, Any]) -> None:
    """Background task: execute a scheduled agent routine."""
    payload = job.get("payload", {})
    logger.info("executing scheduled agent task", job_id=job["id"], type=payload.get("type"))


TASK_HANDLERS = {
    "memory.consolidate": handle_memory_consolidation,
    "rag.backfill": handle_rag_backfill,
    "agent.scheduled_task": handle_scheduled_agent_task,
}


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
