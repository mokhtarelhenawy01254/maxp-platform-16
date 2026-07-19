from __future__ import annotations

import json
import uuid
from collections.abc import Callable
from datetime import datetime
from typing import Any

import structlog

from src.config import get_settings
from src.services.redis_client import redis_client

logger = structlog.get_logger(__name__)


class QueuePriority:
    LOW = 0
    MEDIUM = 1
    HIGH = 2
    CRITICAL = 3


class QueueService:
    """Simple Redis-backed queue for background agent tasks.

    Replaces BullMQ with a lightweight rq-like pattern.
    Falls back to in-memory if Redis is unavailable.
    """

    def __init__(self) -> None:
        self._in_memory: dict[str, list[dict]] = {}
        self._settings = get_settings()

    async def enqueue(
        self,
        queue_name: str,
        task_type: str,
        payload: dict[str, Any],
        priority: int = QueuePriority.MEDIUM,
        job_id: str | None = None,
    ) -> str:
        job_id = job_id or str(uuid.uuid4())
        job = {
            "id": job_id,
            "type": task_type,
            "payload": payload,
            "priority": priority,
            "status": "queued",
            "created_at": datetime.utcnow().isoformat(),
            "attempts": 0,
            "max_attempts": 3,
        }

        if redis_client.available:
            key = f"queue:{queue_name}"
            score = priority * 1000000 + int(datetime.utcnow().timestamp())
            await redis_client._client.zadd(key, {json.dumps(job): score})
        else:
            if queue_name not in self._in_memory:
                self._in_memory[queue_name] = []
            self._in_memory[queue_name].append(job)

        logger.info("job enqueued", queue=queue_name, type=task_type, job_id=job_id)
        return job_id

    async def dequeue(self, queue_name: str) -> dict[str, Any] | None:
        if redis_client.available:
            key = f"queue:{queue_name}"
            jobs = await redis_client._client.zpopmin(key)
            if jobs:
                job = json.loads(jobs[0][0])
                return job

        if self._in_memory.get(queue_name):
            return self._in_memory[queue_name].pop(0)

        return None

    async def register_worker(
        self,
        queue_name: str,
        handler: Callable[[dict[str, Any]], None],
        poll_interval: float = 1.0,
    ) -> None:
        logger.info("worker registered", queue=queue_name)
        import asyncio

        while True:
            job = await self.dequeue(queue_name)
            if job:
                try:
                    logger.info("processing job", queue=queue_name, job_id=job["id"])
                    await handler(job)
                    logger.info("job completed", queue=queue_name, job_id=job["id"])
                except Exception as exc:
                    job["attempts"] += 1
                    if job["attempts"] < job["max_attempts"]:
                        await self.enqueue(
                            queue_name,
                            job["type"],
                            job["payload"],
                            priority=job["priority"] - 1,
                        )
                        logger.warning(
                            "job requeued",
                            queue=queue_name,
                            job_id=job["id"],
                            attempt=job["attempts"],
                            error=str(exc),
                        )
                    else:
                        logger.error(
                            "job failed permanently",
                            queue=queue_name,
                            job_id=job["id"],
                            error=str(exc),
                        )
            await asyncio.sleep(poll_interval)

    async def get_queue_length(self, queue_name: str) -> int:
        if redis_client.available:
            key = f"queue:{queue_name}"
            return await redis_client._client.zcard(key)
        return len(self._in_memory.get(queue_name, []))


queue_service = QueueService()
