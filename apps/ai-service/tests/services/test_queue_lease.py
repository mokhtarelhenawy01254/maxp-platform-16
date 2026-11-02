from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone
from typing import Any
import unittest
from unittest.mock import AsyncMock, patch

from src.services.queue_service import QueuePriority, QueueService


class MockDBResult:
    def __init__(self, rows: list[Any], first_val: Any = None):
        self._rows = rows
        self._first_val = first_val

    def first(self):
        if self._first_val is not None:
            return (self._first_val,)
        if self._rows:
            if isinstance(self._rows[0], (tuple, list)):
                return self._rows[0]
            if isinstance(self._rows[0], dict):
                return (self._rows[0].get("id"),)
            return (self._rows[0],)
        return None

    def fetchall(self):
        if not self._rows:
            return []
        if isinstance(self._rows[0], (tuple, list)):
            return self._rows
        return [(r.get("id"),) for r in self._rows]

    def scalar(self):
        f = self.first()
        return f[0] if f else None

    def mappings(self):
        class _Mappings:
            def __init__(self, r):
                self._r = r
            def first(self):
                return self._r[0] if self._r else None
            def all(self):
                return self._r
        return _Mappings(self._rows)

    def all(self):
        return self._rows


class MockAsyncSession:
    def __init__(self, db_store: dict[str, dict[str, Any]], company_settings: dict[str, dict[str, Any]] | None = None):
        self.db_store = db_store
        self.company_settings = company_settings if company_settings is not None else {}
        self.committed = False

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        return False

    async def commit(self):
        self.committed = True

    async def execute(self, stmt, params=None):
        sql = str(stmt).strip()
        params = params or {}
        now = datetime.now(timezone.utc)

        # 0. SELECT settings->'agentRuntime'->>'maxParallel'
        if "SELECT settings->'agentRuntime'->>'maxParallel'" in sql:
            cid = params.get("cid")
            c_set = self.company_settings.get(cid, {})
            max_p = c_set.get("maxParallel", 3)
            return MockDBResult([(max_p,)], max_p)

        # 0b. SELECT "companyId", count(*) FROM ai_runtime_queue_jobs WHERE status = 'RUNNING'
        if 'SELECT "companyId", count(*)' in sql:
            counts = {}
            for j in self.db_store.values():
                if j.get("status") == "RUNNING" and j.get("companyId"):
                    cid = j["companyId"]
                    counts[cid] = counts.get(cid, 0) + 1
            rows = [(cid, cnt) for cid, cnt in counts.items()]
            return MockDBResult(rows)

        # 0c. SELECT DISTINCT "companyId" FROM ai_runtime_queue_jobs
        if 'SELECT DISTINCT "companyId"' in sql:
            q_name = params.get("queue_name")
            pending_cids = {
                j.get("companyId") for j in self.db_store.values()
                if j.get("status") in ("PENDING", "RETRY")
                and j.get("companyId")
                and (q_name is None or j.get("channel") == q_name)
            }
            rows = [(cid,) for cid in pending_cids]
            return MockDBResult(rows)

        # 1. INSERT ON CONFLICT
        if "INSERT INTO ai_runtime_queue_jobs" in sql:
            qkey = params.get("queue_key")
            for job in self.db_store.values():
                if job.get("queueKey") == qkey:
                    return MockDBResult([], None)  # ON CONFLICT DO NOTHING
            job_id = params.get("id")
            new_job = {
                "id": job_id,
                "companyId": params.get("company_id"),
                "agentId": params.get("agent_id"),
                "queueKey": qkey,
                "channel": params.get("channel"),
                "status": "PENDING",
                "priority": params.get("priority", 0),
                "attempts": 0,
                "maxAttempts": 3,
                "lockToken": None,
                "lockExpiresAt": None,
                "availableAt": now,
                "inputSnapshot": params.get("input_snapshot", "{}"),
                "metadata": params.get("metadata", "{}"),
            }
            self.db_store[job_id] = new_job
            return MockDBResult([new_job], job_id)

        # 2. SELECT id FROM ... WHERE queueKey
        if "SELECT id FROM ai_runtime_queue_jobs" in sql and "queueKey" in sql:
            qkey = params.get("queue_key")
            for job in self.db_store.values():
                if job.get("queueKey") == qkey:
                    return MockDBResult([job], job["id"])
            return MockDBResult([])

        # 3. RESERVE (UPDATE ... SET status='RUNNING' ... WHERE id = (SELECT ...))
        if "UPDATE ai_runtime_queue_jobs" in sql and "SET status = 'RUNNING'" in sql:
            token = params.get("lock_token")
            allowed = params.get("allowed")
            q_name = params.get("queue_name")
            # Filter candidates: status in (PENDING, RETRY), availableAt <= now
            candidates = [
                j for j in self.db_store.values()
                if j.get("status") in ("PENDING", "RETRY")
                and j.get("availableAt", now) <= now
                and (q_name is None or j.get("channel") == q_name)
            ]
            if allowed is not None:
                candidates = [j for j in candidates if j.get("companyId") in allowed]

            # Check NOT EXISTS running job with same agentId
            running_agent_ids = {
                j.get("agentId") for j in self.db_store.values()
                if j.get("status") == "RUNNING" and j.get("agentId") is not None
            }

            def _company_running_count(cid):
                return sum(1 for j in self.db_store.values() if j.get("status") == "RUNNING" and j.get("companyId") == cid)

            eligible = [
                j for j in candidates
                if (j.get("agentId") is None or j.get("agentId") not in running_agent_ids)
                and _company_running_count(j.get("companyId")) < 25
            ]
            if not eligible:
                return MockDBResult([])

            # Sort by priority desc, availableAt asc
            eligible.sort(key=lambda x: (-x.get("priority", 0), x.get("availableAt", now)))
            chosen = eligible[0]
            chosen["status"] = "RUNNING"
            chosen["lockToken"] = token
            chosen["lockedAt"] = now
            chosen["lockExpiresAt"] = now + timedelta(seconds=300)
            chosen["attempts"] = chosen.get("attempts", 0) + 1
            return MockDBResult([chosen])

        # 4. REAP EXPIRED
        if "UPDATE ai_runtime_queue_jobs" in sql and "SET status = 'RETRY'" in sql and "lockExpiresAt" in sql:
            reaped = []
            for j in self.db_store.values():
                if j.get("status") == "RUNNING" and j.get("lockExpiresAt") and j.get("lockExpiresAt") < now:
                    j["status"] = "RETRY"
                    j["lockToken"] = None
                    j["availableAt"] = now
                    reaped.append(j)
            return MockDBResult(reaped)

        # 5. HEARTBEAT
        if "UPDATE ai_runtime_queue_jobs" in sql and "lockExpiresAt" in sql and "status = 'RUNNING'" in sql:
            jid = params.get("job_id")
            token = params.get("token")
            job = self.db_store.get(jid)
            if job and job.get("status") == "RUNNING" and job.get("lockToken") == token:
                job["lockExpiresAt"] = now + timedelta(seconds=300)
                return MockDBResult([job], jid)
            return MockDBResult([])

        # 6. ACK
        if "UPDATE ai_runtime_queue_jobs" in sql and "status = 'COMPLETED'" in sql:
            jid = params.get("job_id")
            token = params.get("token")
            job = self.db_store.get(jid)
            if job and job.get("lockToken") == token:
                job["status"] = "COMPLETED"
                job["completedAt"] = now
                return MockDBResult([job], jid)
            return MockDBResult([])

        # 7. FAIL
        if "UPDATE ai_runtime_queue_jobs" in sql and "CASE WHEN attempts <" in sql:
            jid = params.get("job_id")
            token = params.get("token")
            job = self.db_store.get(jid)
            if job and job.get("lockToken") == token:
                if job.get("attempts", 1) < job.get("maxAttempts", 3):
                    job["status"] = "RETRY"
                    job["availableAt"] = now + timedelta(seconds=10)
                else:
                    job["status"] = "DEAD"
                job["lockToken"] = None
                return MockDBResult([job], job["status"])
            return MockDBResult([])

        return MockDBResult([])


class TestQueueLease(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.db_store: dict[str, dict[str, Any]] = {}
        self.company_settings: dict[str, dict[str, Any]] = {}
        self.queue_svc = QueueService()

    async def _mock_session_factory(self):
        return MockAsyncSession(self.db_store, self.company_settings)

    async def test_01_enqueue_same_dedupe_key_twice_inserts_only_once(self):
        """Test 1: enqueue with same dedupe_key twice -> count(*) == 1 (ON CONFLICT DO NOTHING)."""
        with patch.object(self.queue_svc, "_ensure_session", side_effect=self._mock_session_factory):
            id1 = await self.queue_svc.enqueue(
                queue_name="agent-tasks",
                task_type="agent.scheduled_task",
                payload={"order_id": 100},
                dedupe_key="test:dedupe:key:1",
            )
            id2 = await self.queue_svc.enqueue(
                queue_name="agent-tasks",
                task_type="agent.scheduled_task",
                payload={"order_id": 100},
                dedupe_key="test:dedupe:key:1",
            )
            self.assertEqual(id1, id2)
            matching = [j for j in self.db_store.values() if j["queueKey"] == "test:dedupe:key:1"]
            self.assertEqual(len(matching), 1)

    async def test_02_parallel_reserve_claims_exactly_once(self):
        """Test 2: asyncio.gather(reserve(), reserve()) on 1 job -> only one succeeds, the other returns None."""
        with patch.object(self.queue_svc, "_ensure_session", side_effect=self._mock_session_factory):
            await self.queue_svc.enqueue(
                queue_name="agent-tasks",
                task_type="agent.scheduled_task",
                payload={"msg": "single"},
                dedupe_key="test:single:job",
            )
            res1, res2 = await asyncio.gather(
                self.queue_svc.reserve("agent-tasks"),
                self.queue_svc.reserve("agent-tasks"),
            )
            claimed = [r for r in (res1, res2) if r is not None]
            none_results = [r for r in (res1, res2) if r is None]
            self.assertEqual(len(claimed), 1)
            self.assertEqual(len(none_results), 1)
            self.assertEqual(claimed[0]["status"], "RUNNING")

    async def test_03_reap_expired_resets_dead_worker_job_to_retry(self):
        """Test 3: reserve then reap_expired after lockExpiresAt in past -> status='RETRY' then reserve succeeds."""
        with patch.object(self.queue_svc, "_ensure_session", side_effect=self._mock_session_factory):
            job_id = await self.queue_svc.enqueue(
                queue_name="agent-tasks",
                task_type="agent.scheduled_task",
                payload={"data": "retry-test"},
                dedupe_key="test:retry:job",
            )
            job = await self.queue_svc.reserve("agent-tasks")
            self.assertIsNotNone(job)
            self.assertEqual(job["status"], "RUNNING")

            # Simulate worker death: set lockExpiresAt to the past
            self.db_store[job_id]["lockExpiresAt"] = datetime.now(timezone.utc) - timedelta(seconds=10)

            # Reaper runs
            reaped = await self.queue_svc.reap_expired()
            self.assertIn(job_id, reaped)
            self.assertEqual(self.db_store[job_id]["status"], "RETRY")

            # Subsequent reserve picks it back up
            re_reserved = await self.queue_svc.reserve("agent-tasks")
            self.assertIsNotNone(re_reserved)
            self.assertEqual(re_reserved["id"], job_id)
            self.assertEqual(re_reserved["attempts"], 2)

    async def test_04_per_agent_concurrency_serialization(self):
        """Test 4: reserve twice for the same agentId -> second returns None (per-agent serialization)."""
        with patch.object(self.queue_svc, "_ensure_session", side_effect=self._mock_session_factory):
            await self.queue_svc.enqueue(
                queue_name="agent-tasks",
                task_type="agent.scheduled_task",
                payload={"task": 1},
                agent_id="agent-shipping-1",
                dedupe_key="test:agent:1",
            )
            await self.queue_svc.enqueue(
                queue_name="agent-tasks",
                task_type="agent.scheduled_task",
                payload={"task": 2},
                agent_id="agent-shipping-1",
                dedupe_key="test:agent:2",
            )
            res1 = await self.queue_svc.reserve("agent-tasks")
            self.assertIsNotNone(res1)
            self.assertEqual(res1["agent_id"], "agent-shipping-1")

            # Second reserve for the same agent while first is RUNNING must return None
            res2 = await self.queue_svc.reserve("agent-tasks")
            self.assertIsNone(res2)

            # Ack the first job
            await self.queue_svc.ack(res1["id"], res1["lock_token"])

            # Now second job for this agent can be reserved
            res3 = await self.queue_svc.reserve("agent-tasks")
            self.assertIsNotNone(res3)
            self.assertEqual(res3["agent_id"], "agent-shipping-1")

    async def test_05_enqueue_persists_in_db_when_redis_is_down(self):
        """Test 5: enqueue when Redis is down -> job is preserved in DB and can be reserved."""
        from src.services.queue_service import redis_client

        with patch.object(redis_client, "available", False), \
             patch.object(self.queue_svc, "_ensure_session", side_effect=self._mock_session_factory):
            job_id = await self.queue_svc.enqueue(
                queue_name="agent-tasks",
                task_type="agent.scheduled_task",
                payload={"offline": True},
                dedupe_key="test:redis:down",
            )
            self.assertIn(job_id, self.db_store)
            reserved = await self.queue_svc.reserve("agent-tasks")
            self.assertIsNotNone(reserved)
            self.assertEqual(reserved["id"], job_id)
            self.assertEqual(reserved["payload"]["offline"], True)

    async def test_06_parallel_execution_three_agents_max_parallel_3(self):
        """Test 6: 3 jobs for 3 different agents with maxParallel=3 execute concurrently (< sum of runtimes)."""
        import time

        self.company_settings["comp-par"] = {"maxParallel": 3}
        with patch.object(self.queue_svc, "_ensure_session", side_effect=self._mock_session_factory):
            for i in range(1, 4):
                await self.queue_svc.enqueue(
                    queue_name="agent-tasks",
                    task_type="agent.scheduled_task",
                    payload={"idx": i},
                    company_id="comp-par",
                    agent_id=f"agent-{i}",
                    dedupe_key=f"test:par:{i}",
                )

            completed_jobs = []

            async def handler(job):
                await asyncio.sleep(0.15)
                completed_jobs.append(job["id"])

            worker_task = asyncio.create_task(
                self.queue_svc.register_worker("agent-tasks", handler, poll_interval=0.02, pool_size=3)
            )

            start = time.time()
            while len(completed_jobs) < 3 and time.time() - start < 2.0:
                await asyncio.sleep(0.02)
            elapsed = time.time() - start

            worker_task.cancel()
            try:
                await worker_task
            except asyncio.CancelledError:
                pass

            self.assertEqual(len(completed_jobs), 3)
            # Parallel execution: 3 x 0.15s finishes in ~0.2s, definitely under 0.35s (serial would be >= 0.45s)
            self.assertLess(elapsed, 0.40)

    async def test_07_serialized_execution_max_parallel_1(self):
        """Test 7: maxParallel=1 with 3 jobs -> serialized execution (max concurrency == 1)."""
        import time

        self.company_settings["comp-ser"] = {"maxParallel": 1}
        with patch.object(self.queue_svc, "_ensure_session", side_effect=self._mock_session_factory):
            for i in range(1, 4):
                await self.queue_svc.enqueue(
                    queue_name="agent-tasks",
                    task_type="agent.scheduled_task",
                    payload={"idx": i},
                    company_id="comp-ser",
                    agent_id=f"agent-ser-{i}",
                    dedupe_key=f"test:ser:{i}",
                )

            concurrent_counts = []
            active_counter = 0

            async def handler(job):
                nonlocal active_counter
                active_counter += 1
                concurrent_counts.append(active_counter)
                await asyncio.sleep(0.08)
                active_counter -= 1

            worker_task = asyncio.create_task(
                self.queue_svc.register_worker("agent-tasks", handler, poll_interval=0.02, pool_size=3)
            )

            start = time.time()
            while any(j["status"] != "COMPLETED" for j in self.db_store.values() if j.get("companyId") == "comp-ser") and time.time() - start < 2.0:
                await asyncio.sleep(0.02)

            worker_task.cancel()
            try:
                await worker_task
            except asyncio.CancelledError:
                pass

            # Peak concurrency must never exceed maxParallel=1
            self.assertTrue(all(c <= 1 for c in concurrent_counts))
            self.assertEqual(max(concurrent_counts), 1)

    async def test_08_max_parallel_2_concurrency_ceiling(self):
        """Test 8: maxParallel=2 with 3 jobs -> peak running count <= 2 at any instant."""
        import time

        self.company_settings["comp-2p"] = {"maxParallel": 2}
        with patch.object(self.queue_svc, "_ensure_session", side_effect=self._mock_session_factory):
            for i in range(1, 4):
                await self.queue_svc.enqueue(
                    queue_name="agent-tasks",
                    task_type="agent.scheduled_task",
                    payload={"idx": i},
                    company_id="comp-2p",
                    agent_id=f"agent-2p-{i}",
                    dedupe_key=f"test:2p:{i}",
                )

            running_samples = []
            completed = []

            async def handler(job):
                await asyncio.sleep(0.1)
                completed.append(job["id"])

            worker_task = asyncio.create_task(
                self.queue_svc.register_worker("agent-tasks", handler, poll_interval=0.02, pool_size=3)
            )

            start = time.time()
            while len(completed) < 3 and time.time() - start < 2.0:
                running_now = sum(1 for j in self.db_store.values() if j.get("status") == "RUNNING" and j.get("companyId") == "comp-2p")
                running_samples.append(running_now)
                await asyncio.sleep(0.02)

            worker_task.cancel()
            try:
                await worker_task
            except asyncio.CancelledError:
                pass

            self.assertEqual(len(completed), 3)
            # Max running jobs sampled at 20ms intervals must be <= 2
            self.assertTrue(all(s <= 2 for s in running_samples))

    async def test_09_company_max_parallel_caching_60s(self):
        """Test 9: get_company_max_parallel caches value for 60 seconds."""
        import time

        self.company_settings["comp-cache"] = {"maxParallel": 4}
        with patch.object(self.queue_svc, "_ensure_session", side_effect=self._mock_session_factory):
            val1 = await self.queue_svc.get_company_max_parallel("comp-cache")
            self.assertEqual(val1, 4)

            # Change in DB/settings store without cache invalidation
            self.company_settings["comp-cache"] = {"maxParallel": 7}
            val2 = await self.queue_svc.get_company_max_parallel("comp-cache")
            self.assertEqual(val2, 4)  # returned from cache!

            # Simulate passage of 61 seconds
            cached_val, _ = self.queue_svc._company_max_parallel_cache["comp-cache"]
            self.queue_svc._company_max_parallel_cache["comp-cache"] = (cached_val, time.time() - 1.0)

            val3 = await self.queue_svc.get_company_max_parallel("comp-cache")
            self.assertEqual(val3, 7)  # refreshed from DB!

    async def test_10_hard_ceiling_at_25(self):
        """Test 10: hard ceiling of 25 running jobs prevents reserve even if allowed_companies is None."""
        now = datetime.now(timezone.utc)
        with patch.object(self.queue_svc, "_ensure_session", side_effect=self._mock_session_factory):
            # Seed 25 RUNNING jobs for comp-hard
            for i in range(25):
                self.db_store[f"hard-running-{i}"] = {
                    "id": f"hard-running-{i}",
                    "companyId": "comp-hard",
                    "agentId": f"agent-hard-run-{i}",
                    "channel": "agent-tasks",
                    "status": "RUNNING",
                    "priority": 0,
                    "availableAt": now,
                }

            # Enqueue a 26th pending job
            await self.queue_svc.enqueue(
                queue_name="agent-tasks",
                task_type="agent.scheduled_task",
                payload={"overflow": True},
                company_id="comp-hard",
                agent_id="agent-hard-26",
                dedupe_key="test:hard:overflow",
            )

            # Attempt reserve -> must return None due to hard ceiling < 25
            res = await self.queue_svc.reserve("agent-tasks")
            self.assertIsNone(res)
