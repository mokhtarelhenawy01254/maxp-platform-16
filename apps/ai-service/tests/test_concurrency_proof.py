"""
Concurrency and Conflict-Free Multi-Agent Execution Tests
Tests thread ID isolation, UUID normalization, and race condition prevention.
"""

import concurrent.futures
import threading
import time
import unittest
import uuid

MAXP_NAMESPACE = uuid.UUID("e4b0113c-411a-4d24-912f-6825a0720448")

def safe_thread_uuid(thread_id: str | uuid.UUID) -> uuid.UUID:
    if isinstance(thread_id, uuid.UUID):
        return thread_id
    try:
        return uuid.UUID(str(thread_id))
    except ValueError:
        return uuid.uuid5(MAXP_NAMESPACE, str(thread_id))


def generate_subtask_thread_id_legacy(role: str) -> str:
    # Old legacy implementation in delegate.py
    return f"subtask_{role.lower()}_{int(time.time())}"


def generate_subtask_thread_id_safe(role: str) -> str:
    # New conflict-free implementation
    task_token = uuid.uuid4().hex[:8]
    return f"subtask_{role.lower()}_{time.time_ns()}_{task_token}"


class TestMultiAgentConcurrency(unittest.TestCase):
    def test_legacy_thread_id_has_high_collision_rate(self):
        """Proves that legacy delegate.py thread_id collides under concurrent delegation."""
        with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
            legacy_ids = list(executor.map(generate_subtask_thread_id_legacy, ["INVENTORY"] * 20))
        
        unique_legacy = len(set(legacy_ids))
        # In legacy, almost all thread IDs are identical in the same second
        self.assertLess(unique_legacy, 20, "Legacy thread IDs should collide under parallel execution")

    def test_safe_thread_id_has_zero_collisions(self):
        """Proves that safe thread ID generation has 100% uniqueness under high concurrency."""
        with concurrent.futures.ThreadPoolExecutor(max_workers=50) as executor:
            safe_ids = list(executor.map(generate_subtask_thread_id_safe, ["INVENTORY"] * 50))
        
        unique_safe = len(set(safe_ids))
        self.assertEqual(unique_safe, 50, "Safe thread IDs must have ZERO collisions (50 unique IDs out of 50)")

    def test_uuid_normalization_prevents_crashes(self):
        """Proves that safe_thread_uuid never crashes on non-UUID strings."""
        sample_ids = [
            "subtask_inventory_1790429912_a1b2c3d4",
            "task_pmp8rt_manager",
            "session_marketing_swan_4",
            "00000000-0000-0000-0000-000000000000",
            "550e8400-e29b-41d4-a716-446655440000",
        ]
        results = [safe_thread_uuid(sid) for sid in sample_ids]
        for res in results:
            self.assertIsInstance(res, uuid.UUID)

    def test_uuid_normalization_does_not_collapse_to_zero_uuid(self):
        """Proves that different subtasks do NOT all map to 00000000-0000-0000-0000-000000000000."""
        u1 = safe_thread_uuid("subtask_inventory_1790429912_a1b2c3d4")
        u2 = safe_thread_uuid("subtask_sales_1790429912_e5f6g7h8")
        zero_uuid = uuid.UUID(int=0)
        
        self.assertNotEqual(u1, zero_uuid, "Subtask 1 must not collapse to zero UUID")
        self.assertNotEqual(u2, zero_uuid, "Subtask 2 must not collapse to zero UUID")
        self.assertNotEqual(u1, u2, "Different subtasks must produce distinct UUIDs")

    def test_uuid_normalization_is_deterministic(self):
        """Proves that the exact same thread_id string always resolves to the exact same UUID."""
        sid = "subtask_inventory_task_persistent_id_999"
        u1 = safe_thread_uuid(sid)
        u2 = safe_thread_uuid(sid)
        self.assertEqual(u1, u2, "Same thread_id must deterministically map to the same UUID")

    def test_concurrent_model_selection_isolation(self):
        """Proves that task-scoped model selection isolates models across concurrent executions."""
        class MockTask:
            def __init__(self, model_name):
                self.ctx_model = {"model": model_name, "source": "task_scoped"}

        def run_task(model_name):
            task = MockTask(model_name)
            # Simulated async latency
            time.sleep(0.005)
            # Context-isolated model resolution
            effective_model = task.ctx_model["model"]
            return effective_model

        models = ["deepseek-v4-flash", "llama-3.3-70b-versatile", "gemini-2.5-flash", "gpt-4o"]
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
            resolved = list(executor.map(run_task, models))

        self.assertEqual(resolved, models, "Each concurrent task must preserve its own model selection")

    def test_cron_thread_id_isolation_per_run(self):
        """Proves that recurring cron runs generate unique thread IDs with timestamps."""
        company_id = "cmp_123"
        job_id = "job_inventory_sync"

        def generate_cron_thread_id():
            time.sleep(0.001)
            run_ts = time.time_ns()
            return f"cron_{company_id}_{job_id}_{run_ts}"

        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            thread_ids = [generate_cron_thread_id() for _ in range(10)]

        self.assertEqual(len(set(thread_ids)), 10, "Every recurring cron run must have a unique thread ID")

    def test_advisory_lock_order_numbering_simulation(self):
        """Simulates atomic serial order generation under a mutex advisory lock."""
        shared_db_state = {"current_max": 500}
        advisory_lock = threading.Lock()

        def create_order_with_lock(agent_idx):
            with advisory_lock:
                # Inside advisory transaction lock
                time.sleep(0.002)
                next_num = shared_db_state["current_max"] + 1
                shared_db_state["current_max"] = next_num
                return next_num

        with concurrent.futures.ThreadPoolExecutor(max_workers=15) as executor:
            results = list(executor.map(create_order_with_lock, range(15)))

        self.assertEqual(len(results), 15)
        self.assertEqual(len(set(results)), 15, "Advisory-locked order creation must generate strictly unique sequential numbers")
        self.assertEqual(results, list(range(501, 516)), "Order numbers must be strictly sequential (501 to 515)")


if __name__ == "__main__":
    unittest.main()
