from __future__ import annotations

import asyncio
import json
import os
import time
import uuid
from collections.abc import Callable
from datetime import datetime, timezone
from typing import Any

try:
    import structlog
    logger = structlog.get_logger(__name__)
except ImportError:
    import logging
    logger = logging.getLogger(__name__)

try:
    from sqlalchemy import text
except ImportError:
    class _TextClause:
        def __init__(self, text_str: str):
            self.text = text_str
        def __str__(self):
            return self.text
    text = _TextClause

try:
    from src.services.redis_client import redis_client
except Exception:
    class _MockRedis:
        available = False
        _client = None
    redis_client = _MockRedis()


class QueuePriority:
    LOW = 0
    MEDIUM = 1
    HIGH = 2
    CRITICAL = 3


class QueueService:
    """PostgreSQL-backed queue with lease management, atomic reservation,
    per-agent concurrency serialization, and Redis wake notifications.
    """

    def __init__(self) -> None:
        self._in_memory: dict[str, list[dict[str, Any]]] = {}
        self._company_max_parallel_cache: dict[str, tuple[int, float]] = {}

    async def get_company_max_parallel(self, company_id: str) -> int:
        """Read company maxParallel setting with 60-second in-memory cache."""
        now = time.time()
        cached = self._company_max_parallel_cache.get(company_id)
        if cached and cached[1] > now:
            return cached[0]

        max_p = 3  # default
        try:
            session = await self._ensure_session()
            async with session:
                stmt = text("""
                    SELECT settings->'agentRuntime'->>'maxParallel'
                    FROM companies
                    WHERE id = :cid
                """)
                res = await session.execute(stmt, {"cid": company_id})
                if hasattr(res, "scalar"):
                    val = res.scalar()
                else:
                    first_row = res.first()
                    val = first_row[0] if first_row else None

                if val is not None:
                    try:
                        parsed = int(val)
                        if 1 <= parsed <= 10:
                            max_p = parsed
                    except (ValueError, TypeError):
                        pass
        except Exception as exc:
            logger.debug("get_company_max_parallel_failed", company_id=company_id, error=str(exc))

        self._company_max_parallel_cache[company_id] = (max_p, now + 60.0)
        return max_p

    async def get_allowed_companies(self, queue_name: str | None = None) -> list[str] | None:
        """Find companyIds allowed to reserve jobs based on maxParallel limit."""
        try:
            session = await self._ensure_session()
            async with session:
                stmt_running = text("""
                    SELECT "companyId", count(*)
                    FROM ai_runtime_queue_jobs
                    WHERE status = 'RUNNING' AND "companyId" IS NOT NULL
                    GROUP BY 1
                """)
                res_running = await session.execute(stmt_running)
                running_rows = res_running.fetchall() if hasattr(res_running, "fetchall") else (res_running.all() if hasattr(res_running, "all") else [])
                running_counts: dict[str, int] = {}
                for r in (running_rows or []):
                    cid = str(r[0]) if r and r[0] is not None else None
                    if cid:
                        running_counts[cid] = int(r[1]) if len(r) > 1 else 0

                if not running_counts:
                    return None

                capped_companies: set[str] = set()
                for cid, count in running_counts.items():
                    max_p = await self.get_company_max_parallel(cid)
                    if count >= max_p:
                        capped_companies.add(cid)

                if not capped_companies:
                    return None

                stmt_pending = text("""
                    SELECT DISTINCT "companyId"
                    FROM ai_runtime_queue_jobs
                    WHERE status IN ('PENDING', 'RETRY')
                      AND "companyId" IS NOT NULL
                      AND (:queue_name IS NULL OR channel = :queue_name)
                """)
                res_pending = await session.execute(stmt_pending, {"queue_name": queue_name})
                pending_rows = res_pending.fetchall() if hasattr(res_pending, "fetchall") else (res_pending.all() if hasattr(res_pending, "all") else [])
                pending_companies = [str(r[0]) for r in (pending_rows or []) if r and r[0] is not None]

                allowed = [cid for cid in pending_companies if cid not in capped_companies]
                return allowed
        except Exception as exc:
            logger.debug("get_allowed_companies_failed", error=str(exc))
            return None

    async def _ensure_session(self):
        try:
            from src.db.session import async_session, init_db
            if async_session is None:
                await init_db()
                from src.db.session import async_session
            return async_session()
        except Exception as err:
            raise RuntimeError(f"Database session unavailable: {err}") from err

    async def enqueue(
        self,
        queue_name: str,
        task_type: str,
        payload: dict[str, Any],
        priority: int = QueuePriority.MEDIUM,
        job_id: str | None = None,
        dedupe_key: str | None = None,
        agent_id: str | None = None,
        company_id: str | None = None,
    ) -> str:
        """Enqueue task into ai_runtime_queue_jobs with dedupeKey protection."""
        job_id = job_id or f"job_{uuid.uuid4().hex[:16]}"
        company_id = company_id or payload.get("company_id") or "SYSTEM"
        agent_id = agent_id or payload.get("agent_id")
        queue_key = dedupe_key or f"{queue_name}:{job_id}"
        input_snapshot = json.dumps(payload)
        metadata = json.dumps({"task_type": task_type, "queue_name": queue_name})

        stmt = text("""
            INSERT INTO ai_runtime_queue_jobs (
                id, "companyId", "agentId", "queueKey", channel, status, priority,
                attempts, "maxAttempts", "availableAt", "inputSnapshot", metadata, "createdAt", "updatedAt"
            ) VALUES (
                :id, :company_id, :agent_id, :queue_key, :channel, 'PENDING', :priority,
                0, 3, now(), :input_snapshot, :metadata, now(), now()
            )
            ON CONFLICT ("queueKey") DO NOTHING
            RETURNING id;
        """)
        params = {
            "id": job_id,
            "company_id": company_id,
            "agent_id": agent_id,
            "queue_key": queue_key,
            "channel": queue_name,
            "priority": priority,
            "input_snapshot": input_snapshot,
            "metadata": metadata,
        }

        try:
            session = await self._ensure_session()
            async with session:
                res = await session.execute(stmt, params)
                row = res.first()
                if row:
                    final_id = row[0]
                else:
                    sel = text('SELECT id FROM ai_runtime_queue_jobs WHERE "queueKey" = :queue_key LIMIT 1')
                    existing = (await session.execute(sel, {"queue_key": queue_key})).first()
                    final_id = existing[0] if existing else job_id
                await session.commit()
        except Exception as exc:
            if queue_name == "agent-tasks":
                logger.error("queue_enqueue_db_failed", queue=queue_name, error=str(exc))
                raise RuntimeError(f"Database queue unavailable for {queue_name}: {exc}") from exc
            logger.warning("queue_fallback_in_memory", queue=queue_name, error=str(exc))
            if queue_name not in self._in_memory:
                self._in_memory[queue_name] = []
            self._in_memory[queue_name].append({
                "id": job_id,
                "type": task_type,
                "payload": payload,
                "priority": priority,
                "status": "queued",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "attempts": 0,
                "max_attempts": 3,
            })
            return job_id

        # Redis wake notification
        if redis_client.available:
            try:
                rkey = f"queue:{queue_name}"
                score = priority * 1000000 + int(datetime.now(timezone.utc).timestamp())
                await redis_client._client.zadd(rkey, {json.dumps({"id": final_id, "type": task_type}): score})
            except Exception as r_err:
                logger.debug("redis_wake_notification_failed", error=str(r_err))

        logger.info("job enqueued", queue=queue_name, type=task_type, job_id=final_id, dedupe_key=queue_key)
        return final_id

    async def reserve(
        self,
        queue_name: str | None = None,
        lease_seconds: int = 300,
        allowed_companies: list[str] | None = None,
    ) -> dict[str, Any] | None:
        """Atomically reserve a due job with lease lock and per-agent concurrency isolation."""
        if allowed_companies is not None and len(allowed_companies) == 0:
            return None

        token = str(uuid.uuid4())
        lease_interval = f"{int(lease_seconds)} seconds"

        stmt = text("""
            UPDATE ai_runtime_queue_jobs
            SET status = 'RUNNING',
                "lockToken" = :lock_token,
                "lockedAt" = now(),
                "lockExpiresAt" = now() + (:lease_interval)::interval,
                "startedAt" = COALESCE("startedAt", now()),
                attempts = attempts + 1,
                "updatedAt" = now()
            WHERE id = (
              SELECT j.id
              FROM ai_runtime_queue_jobs j
              WHERE j.status IN ('PENDING', 'RETRY')
                AND j."availableAt" <= now()
                AND (:queue_name IS NULL OR j.channel = :queue_name)
                AND (:allowed IS NULL OR j."companyId" = ANY(:allowed))
                AND NOT EXISTS (
                  SELECT 1 FROM ai_runtime_queue_jobs r
                  WHERE r.status = 'RUNNING'
                    AND r."agentId" = j."agentId"
                    AND r."agentId" IS NOT NULL
                )
                AND (
                  SELECT count(*) FROM ai_runtime_queue_jobs c
                  WHERE c.status = 'RUNNING' AND c."companyId" = j."companyId"
                ) < 25
              ORDER BY j.priority DESC, j."availableAt" ASC
              LIMIT 1
              FOR UPDATE SKIP LOCKED
            )
            RETURNING *;
        """)

        try:
            session = await self._ensure_session()
            async with session:
                res = await session.execute(stmt, {
                    "lock_token": token,
                    "lease_interval": lease_interval,
                    "queue_name": queue_name,
                    "allowed": allowed_companies if allowed_companies is not None else None,
                })
                row = res.mappings().first()
                if not row:
                    return None
                await session.commit()
        except Exception as exc:
            if queue_name == "agent-tasks":
                logger.error("queue_reserve_db_failed", queue=queue_name, error=str(exc))
                raise
            return None

        raw_snapshot = row.get("inputSnapshot") or "{}"
        try:
            payload = json.loads(raw_snapshot) if isinstance(raw_snapshot, str) else raw_snapshot
        except Exception:
            payload = {}

        raw_meta = row.get("metadata") or "{}"
        try:
            meta = json.loads(raw_meta) if isinstance(raw_meta, str) else raw_meta
        except Exception:
            meta = {}

        task_type = meta.get("task_type") or payload.get("type", "GENERAL")

        return {
            "id": row.get("id"),
            "type": task_type,
            "payload": payload,
            "lock_token": token,
            "attempts": row.get("attempts", 1),
            "max_attempts": row.get("maxAttempts", 3),
            "agent_id": row.get("agentId"),
            "company_id": row.get("companyId"),
            "priority": row.get("priority", 0),
            "status": "RUNNING",
        }

    async def heartbeat(
        self,
        job_id: str,
        token: str,
        extend_seconds: int = 300,
    ) -> bool:
        """Extend lockExpiresAt by extend_seconds for a running job."""
        extend_interval = f"{int(extend_seconds)} seconds"
        stmt = text("""
            UPDATE ai_runtime_queue_jobs
            SET "lockExpiresAt" = now() + (:extend_interval)::interval,
                "updatedAt" = now()
            WHERE id = :job_id AND "lockToken" = :token AND status = 'RUNNING'
            RETURNING id;
        """)
        try:
            session = await self._ensure_session()
            async with session:
                res = await session.execute(stmt, {
                    "job_id": job_id,
                    "token": token,
                    "extend_interval": extend_interval,
                })
                row = res.first()
                await session.commit()
                return bool(row)
        except Exception as exc:
            logger.warning("queue_heartbeat_failed", job_id=job_id, error=str(exc))
            return False

    async def ack(
        self,
        job_id: str,
        token: str,
        result: Any = None,
    ) -> bool:
        """Mark job as COMPLETED and save resultSnapshot."""
        res_snapshot = json.dumps(result) if result is not None else None
        stmt = text("""
            UPDATE ai_runtime_queue_jobs
            SET status = 'COMPLETED',
                "completedAt" = now(),
                "resultSnapshot" = :res_snapshot,
                "updatedAt" = now()
            WHERE id = :job_id AND "lockToken" = :token
            RETURNING id;
        """)
        try:
            session = await self._ensure_session()
            async with session:
                res = await session.execute(stmt, {
                    "job_id": job_id,
                    "token": token,
                    "res_snapshot": res_snapshot,
                })
                row = res.first()
                await session.commit()
                return bool(row)
        except Exception as exc:
            logger.error("queue_ack_failed", job_id=job_id, error=str(exc))
            return False

    async def fail(
        self,
        job_id: str,
        token: str,
        error: str = "",
    ) -> str:
        """Mark job as RETRY (if attempts < maxAttempts) or DEAD, with exponential backoff."""
        stmt = text("""
            UPDATE ai_runtime_queue_jobs
            SET status = CASE WHEN attempts < "maxAttempts" THEN 'RETRY' ELSE 'DEAD' END,
                "availableAt" = CASE
                    WHEN attempts < "maxAttempts" THEN now() + (LEAST(300, POWER(2, attempts) * 10) || ' seconds')::interval
                    ELSE "availableAt"
                END,
                "lockToken" = NULL,
                "lastError" = :error,
                "completedAt" = CASE WHEN attempts >= "maxAttempts" THEN now() ELSE NULL END,
                "updatedAt" = now()
            WHERE id = :job_id AND "lockToken" = :token
            RETURNING status;
        """)
        try:
            session = await self._ensure_session()
            async with session:
                res = await session.execute(stmt, {
                    "job_id": job_id,
                    "token": token,
                    "error": str(error)[:1000],
                })
                row = res.first()
                await session.commit()
                return row[0] if row else "UNKNOWN"
        except Exception as exc:
            logger.error("queue_fail_failed", job_id=job_id, error=str(exc))
            return "ERROR"

    async def reap_expired(self) -> list[str]:
        """Reset running jobs whose lock expired back to RETRY."""
        stmt = text("""
            UPDATE ai_runtime_queue_jobs
            SET status = 'RETRY',
                "availableAt" = now(),
                "lockToken" = NULL,
                "updatedAt" = now()
            WHERE status = 'RUNNING' AND "lockExpiresAt" < now()
            RETURNING id;
        """)
        try:
            session = await self._ensure_session()
            async with session:
                res = await session.execute(stmt)
                rows = res.fetchall()
                await session.commit()
                return [r[0] for r in rows]
        except Exception as exc:
            logger.warning("queue_reap_expired_failed", error=str(exc))
            return []

    async def dequeue(self, queue_name: str) -> dict[str, Any] | None:
        """Legacy dequeue adapter: calls reserve."""
        return await self.reserve(queue_name)

    async def register_worker(
        self,
        queue_name: str,
        handler: Callable[[dict[str, Any]], None],
        poll_interval: float = 0.5,
        pool_size: int | None = None,
    ) -> None:
        """Background worker pool loop with atomic lease, concurrent heartbeat, and ack/fail."""
        if pool_size is None:
            pool_size = int(os.getenv("AGENT_WORKER_POOL_SIZE", "4"))

        logger.info("worker registered", queue=queue_name, pool_size=pool_size)

        async def _worker_loop(worker_idx: int) -> None:
            while True:
                try:
                    allowed = await self.get_allowed_companies(queue_name)
                    if allowed is not None and len(allowed) == 0:
                        await asyncio.sleep(poll_interval)
                        continue

                    job = await self.reserve(queue_name, allowed_companies=allowed)
                    if not job:
                        await asyncio.sleep(poll_interval)
                        continue

                    job_id = job["id"]
                    token = job.get("lock_token")
                    logger.info("processing job", queue=queue_name, worker_idx=worker_idx, job_id=job_id)

                    stop_heartbeat = asyncio.Event()

                    async def _heartbeat_loop():
                        while not stop_heartbeat.is_set():
                            try:
                                await asyncio.wait_for(stop_heartbeat.wait(), timeout=60.0)
                            except asyncio.TimeoutError:
                                await self.heartbeat(job_id, token)

                    hb_task = asyncio.create_task(_heartbeat_loop())
                    try:
                        res = await handler(job)
                        await self.ack(job_id, token, result=res)
                        logger.info("job completed", queue=queue_name, worker_idx=worker_idx, job_id=job_id)
                    except Exception as exc:
                        logger.error("job handler failed", queue=queue_name, worker_idx=worker_idx, job_id=job_id, error=str(exc))
                        await self.fail(job_id, token, error=str(exc))
                    finally:
                        stop_heartbeat.set()
                        hb_task.cancel()
                        try:
                            await hb_task
                        except asyncio.CancelledError:
                            pass
                except asyncio.CancelledError:
                    break
                except Exception as loop_err:
                    logger.error("worker_loop_error", worker_idx=worker_idx, error=str(loop_err))
                    await asyncio.sleep(poll_interval)

        await asyncio.gather(*[_worker_loop(i) for i in range(pool_size)])

    async def get_queue_length(self, queue_name: str) -> int:
        stmt = text("""
            SELECT COUNT(*) FROM ai_runtime_queue_jobs
            WHERE channel = :channel AND status IN ('PENDING', 'RETRY')
        """)
        try:
            session = await self._ensure_session()
            async with session:
                res = await session.execute(stmt, {"channel": queue_name})
                row = res.first()
                return row[0] if row else 0
        except Exception:
            return len(self._in_memory.get(queue_name, []))


queue_service = QueueService()
