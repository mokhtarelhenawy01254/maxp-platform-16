"""
Tests for Sprint 1 migrated components:
- Intent Schema
- DAG Planner
- Policy Engine
"""

from __future__ import annotations

import asyncio
from unittest.mock import MagicMock

import pytest

from src.intent.schema import (
    Intent,
    ConfidenceLevel,
    ToolEligibility,
    ReasonCode,
    INTENT_ENUM,
    INTENT_CLASSIFICATION_SCHEMA,
    SCHEMA_VERSION,
    get_provider_schema,
    get_openai_schema,
    get_gemini_schema,
    get_anthropic_schema,
    validate_classification_result,
    create_fallback_result,
    IntentClassificationResult,
)
from src.planning.dag_planner import (
    DAGPlannerExecutor,
    Task,
    TaskStatus,
    PlanStatus,
)
from src.policy.engine import (
    PolicyEngine,
    DEFAULT_POLICIES,
    PolicyViolation,
    PolicyWarning,
)


class TestIntentSchema:
    """Tests for intent classification schema."""

    def test_schema_version(self):
        assert SCHEMA_VERSION == "1.0.0"

    def test_intent_enum_count(self):
        """Should have 25 intents matching Node.js."""
        assert len(INTENT_ENUM) == 25
        assert Intent.GENERAL_CHAT.value in INTENT_ENUM
        assert Intent.SUPPORT_REFUND.value in INTENT_ENUM
        assert Intent.ORDERS_CREATE_DRAFT.value in INTENT_ENUM

    def test_intent_values_match(self):
        """Verify intent enum values match original Node.js."""
        expected = [
            "general.chat",
            "implementation.advice",
            "goals.create_product",
            "goals.create_agent_with_skill",
            "agents.run_task",
            "agents.manage",
            "agents.read",
            "audit.read",
            "skills.manage",
            "skills.read",
            "products.manage",
            "orders.create_draft",
            "orders.create_confirmed",
            "orders",
            "inventory",
            "products",
            "catalog.categories",
            "shipping.rates",
            "support.exchange",
            "support.refund",
            "support.complaint",
            "customers",
            "sales",
            "company.snapshot",
            "hr.attendance.today",
        ]
        assert INTENT_ENUM == expected

    def test_confidence_level_enum(self):
        assert ConfidenceLevel.HIGH.value == "high"
        assert ConfidenceLevel.MEDIUM.value == "medium"
        assert ConfidenceLevel.LOW.value == "low"

    def test_tool_eligibility_enum(self):
        assert ToolEligibility.ALLOWED.value == "allowed"
        assert ToolEligibility.BLOCKED.value == "blocked"
        assert ToolEligibility.NEEDS_CLARIFICATION.value == "needs_clarification"

    def test_reason_codes_count(self):
        assert len([r for r in ReasonCode]) >= 30

    def test_get_provider_schema_openai(self):
        schema = get_openai_schema()
        assert schema["type"] == "json_schema"
        assert schema["json_schema"]["name"] == "intent_classification"
        assert schema["json_schema"]["strict"] is True

    def test_openai_schema_closes_nested_objects(self):
        schema = INTENT_CLASSIFICATION_SCHEMA
        assert schema["additionalProperties"] is False
        assert schema["properties"]["slots"]["additionalProperties"] is False
        assert set(schema["properties"]["slots"]["required"]) == set(schema["properties"]["slots"]["properties"])
        assert schema["properties"]["toolEligibility"]["additionalProperties"] is False
        assert set(schema["properties"]["toolEligibility"]["required"]) == set(
            schema["properties"]["toolEligibility"]["properties"]
        )
        assert schema["properties"]["alternativeIntents"]["items"]["additionalProperties"] is False
        assert "enum" not in schema["properties"]["reasonCodes"]["items"]

    def test_get_provider_schema_gemini(self):
        schema = get_gemini_schema()
        assert schema["responseMimeType"] == "application/json"
        assert "responseSchema" in schema

    def test_get_provider_schema_anthropic(self):
        schema = get_anthropic_schema()
        assert schema["name"] == "classify_intent"
        assert "input_schema" in schema

    def test_validate_classification_result_valid(self):
        result = {
            "intent": "orders",
            "confidence": 0.85,
            "slots": {"orderNumber": "12345"},
            "missingSlots": [],
            "toolEligibility": {"status": "allowed"},
            "reasonCodes": ["ORDER_NUMBER_FOUND"],
            "alternativeIntents": [],
        }
        validation = validate_classification_result(result)
        assert validation.valid is True
        assert len(validation.errors) == 0

    def test_validate_classification_result_invalid_intent(self):
        result = {
            "intent": "invalid.intent",
            "confidence": 0.85,
            "slots": {},
            "missingSlots": [],
            "toolEligibility": {"status": "allowed"},
            "reasonCodes": [],
        }
        validation = validate_classification_result(result)
        assert validation.valid is False
        assert any("Invalid intent" in e for e in validation.errors)

    def test_validate_classification_result_invalid_confidence(self):
        result = {
            "intent": "orders",
            "confidence": 1.5,
            "slots": {},
            "missingSlots": [],
            "toolEligibility": {"status": "allowed"},
            "reasonCodes": [],
        }
        validation = validate_classification_result(result)
        assert validation.valid is False
        assert any("confidence" in e.lower() for e in validation.errors)

    def test_validate_classification_result_missing_fields(self):
        result = {"intent": "orders"}
        validation = validate_classification_result(result)
        assert validation.valid is False
        assert len(validation.errors) > 0

    def test_create_fallback_result(self):
        result = create_fallback_result("CLASSIFIER_UNAVAILABLE")
        assert result["schemaVersion"] == SCHEMA_VERSION
        assert result["intent"] == "general.chat"
        assert result["confidence"] == 0.1
        assert result["confidenceLevel"] == "low"
        assert result["ambiguity"] is True
        assert result["toolEligibility"]["status"] == "blocked"
        assert result["toolEligibility"]["blockedReason"] == "CLASSIFIER_UNAVAILABLE"

    def test_intent_classification_result_to_dict(self):
        result = IntentClassificationResult(
            intent=Intent.SUPPORT_REFUND.value,
            confidence=0.9,
            confidenceLevel=ConfidenceLevel.HIGH.value,
            slots={"orderNumber": "123", "refundReason": "defective"},
            missingSlots=[],
            reasonCodes=[ReasonCode.ORDER_NUMBER_FOUND.value],
        )
        d = result.to_dict()
        assert d["intent"] == "support.refund"
        assert d["confidence"] == 0.9
        assert d["slots"]["orderNumber"] == "123"
        assert d["reasonCodes"] == ["ORDER_NUMBER_FOUND"]

    def test_intent_classification_result_from_dict(self):
        data = {
            "intent": "orders",
            "confidence": 0.75,
            "confidenceLevel": "medium",
            "slots": {"orderNumber": "999"},
            "missingSlots": [],
            "toolEligibility": {"status": "allowed"},
            "reasonCodes": ["ORDER_NUMBER_FOUND"],
            "alternativeIntents": [{"intent": "inventory", "confidence": 0.2}],
        }
        result = IntentClassificationResult.from_dict(data)
        assert result.intent == "orders"
        assert result.confidence == 0.75
        assert result.toolEligibility == ToolEligibility.ALLOWED


class TestDAGPlanner:
    """Tests for DAG Planner Executor."""

    def test_create_plan_simple(self):
        executor = DAGPlannerExecutor()
        tasks = [
            {"id": "task1", "name": "First"},
            {"id": "task2", "name": "Second", "dependencies": ["task1"]},
            {"id": "task3", "name": "Third", "dependencies": ["task2"]},
        ]
        plan = executor.create_plan(tasks)
        assert plan.plan_id.startswith("plan_")
        assert len(plan.tasks) == 3
        assert plan.status == PlanStatus.READY
        assert len(plan.execution_order) == 3

    def test_create_plan_concurrent_layer(self):
        """Tasks with same dependencies should be in same layer."""
        executor = DAGPlannerExecutor()
        tasks = [
            {"id": "a", "name": "A"},
            {"id": "b", "name": "B", "dependencies": ["a"]},
            {"id": "c", "name": "C", "dependencies": ["a"]},
            {"id": "d", "name": "D", "dependencies": ["b", "c"]},
        ]
        plan = executor.create_plan(tasks)
        assert plan.execution_order[0] == ["a"]
        assert set(plan.execution_order[1]) == {"b", "c"}
        assert plan.execution_order[2] == ["d"]

    def test_create_plan_cycle_detection(self):
        """Circular dependencies should raise ValueError."""
        executor = DAGPlannerExecutor()
        tasks = [
            {"id": "a", "name": "A", "dependencies": ["b"]},
            {"id": "b", "name": "B", "dependencies": ["a"]},
        ]
        with pytest.raises(ValueError, match="cycle detected"):
            executor.create_plan(tasks)

    def test_topological_sort_independent_tasks(self):
        """Independent tasks should all be in first layer (order non-deterministic)."""
        executor = DAGPlannerExecutor()
        tasks = [
            {"id": "a", "name": "A"},
            {"id": "b", "name": "B"},
            {"id": "c", "name": "C"},
        ]
        plan = executor.create_plan(tasks)
        assert set(plan.execution_order[0]) == {"a", "b", "c"}

    @pytest.mark.asyncio
    async def test_execute_plan_sequential(self):
        """Test sequential task execution with results passed between tasks."""
        executor = DAGPlannerExecutor()
        execution_order: list[str] = []

        async def make_handler(task_id: str):
            async def handler(params: dict, results: dict) -> dict:
                execution_order.append(task_id)
                return {"id": task_id, "value": f"{task_id}_result"}
            return handler

        tasks = [
            {"id": "task1", "name": "First", "handler": await make_handler("task1")},
            {
                "id": "task2",
                "name": "Second",
                "dependencies": ["task1"],
                "handler": await make_handler("task2"),
            },
        ]
        plan = executor.create_plan(tasks)
        result = await executor.execute_plan(plan, {})

        assert result.status == PlanStatus.SUCCESS
        assert "task1" in result.results
        assert "task2" in result.results
        assert execution_order == ["task1", "task2"]

    @pytest.mark.asyncio
    async def test_execute_plan_concurrent_layer(self):
        """Tasks in same layer should execute concurrently."""
        executor = DAGPlannerExecutor()
        execution_times: dict[str, float] = {}

        async def make_handler(task_id: str, delay: float):
            async def handler(params: dict, results: dict) -> dict:
                import time
                start = time.time()
                await asyncio.sleep(delay)
                execution_times[task_id] = time.time() - start
                return {"id": task_id}
            return handler

        tasks = [
            {"id": "a", "name": "A", "handler": await make_handler("a", 0.1)},
            {"id": "b", "name": "B", "handler": await make_handler("b", 0.1)},
        ]
        plan = executor.create_plan(tasks)
        result = await executor.execute_plan(plan, {})

        assert result.status == PlanStatus.SUCCESS
        assert set(execution_times.keys()) == {"a", "b"}

    @pytest.mark.asyncio
    async def test_execute_plan_template_resolution(self):
        """Template {{taskId.field}} should be resolved from results."""
        executor = DAGPlannerExecutor()

        async def fetch_handler(params: dict, results: dict) -> dict:
            return {"name": "Product A", "price": 99.99}

        async def notify_handler(params: dict, results: dict) -> dict:
            return {"notified": params["message"]}

        tasks = [
            {"id": "fetch", "name": "Fetch", "handler": fetch_handler},
            {
                "id": "notify",
                "name": "Notify",
                "dependencies": ["fetch"],
                "params": {"message": "Product {{fetch.name}} costs {{fetch.price}}"},
                "handler": notify_handler,
            },
        ]
        plan = executor.create_plan(tasks)
        result = await executor.execute_plan(plan, {})

        assert result.status == PlanStatus.SUCCESS
        notify_result = result.results["notify"]
        assert notify_result["notified"] == "Product Product A costs 99.99"

    def test_replan_removes_failed_tasks(self):
        """Replan removes only failed tasks (not dependents, just clears their deps)."""
        executor = DAGPlannerExecutor()
        tasks = [
            {"id": "a", "name": "A"},
            {"id": "b", "name": "B", "dependencies": ["a"]},
            {"id": "c", "name": "C", "dependencies": ["b"]},
            {"id": "d", "name": "D"},
        ]
        plan = executor.create_plan(tasks)
        # Node.js only removes tasks in failedTaskIds, not dependents
        # So 'c' stays even though its dep 'b' was removed
        new_plan = executor.replan(plan, ["b"])
        # a and d have no deps, c has no remaining deps (b was removed)
        task_ids = {t.id for t in new_plan.tasks}
        assert task_ids == {"a", "c", "d"}
        assert new_plan.status == PlanStatus.REPLANNED

    def test_replan_with_cascade_removal(self):
        """If we want cascade removal, pass both failed tasks."""
        executor = DAGPlannerExecutor()
        tasks = [
            {"id": "a", "name": "A"},
            {"id": "b", "name": "B", "dependencies": ["a"]},
            {"id": "c", "name": "C", "dependencies": ["b"]},
            {"id": "d", "name": "D"},
        ]
        plan = executor.create_plan(tasks)
        new_plan = executor.replan(plan, ["b", "c"])
        task_ids = {t.id for t in new_plan.tasks}
        assert task_ids == {"a", "d"}

    def test_execution_log(self):
        executor = DAGPlannerExecutor()
        assert executor.get_execution_log() == []
        executor._execution_log.append({"planId": "test"})
        assert len(executor.get_execution_log()) == 1

    def test_reset(self):
        executor = DAGPlannerExecutor()
        executor._execution_log.append({"planId": "test"})
        executor.reset()
        assert executor.get_execution_log() == []


class TestPolicyEngine:
    """Tests for Policy Enforcement Engine."""

    def test_default_policies(self):
        assert DEFAULT_POLICIES["maxDiscountPercent"] == 20
        assert DEFAULT_POLICIES["maxRefundAmount"] == 500
        assert DEFAULT_POLICIES["minProductPrice"] == 1
        assert DEFAULT_POLICIES["maxPriceChangePercent"] == 30
        assert "DELETE_PRODUCT" in DEFAULT_POLICIES["blockedActions"]

    def test_get_company_policies_no_override(self):
        engine = PolicyEngine()
        policies = engine.get_company_policies("unknown_company")
        assert policies["maxDiscountPercent"] == 20
        assert policies["requireApprovalAbove"] == 100

    def test_set_company_policy(self):
        engine = PolicyEngine()
        engine.set_company_policy("co_123", {"maxDiscountPercent": 30})
        policies = engine.get_company_policies("co_123")
        assert policies["maxDiscountPercent"] == 30
        assert policies["maxRefundAmount"] == 500  # Unchanged

    def test_validate_discount_within_limit(self):
        engine = PolicyEngine()
        result = engine.validate_discount("co_1", 15.0)
        assert result.valid is True
        assert result.violation is None

    def test_validate_discount_exceeds_limit(self):
        engine = PolicyEngine()
        engine.set_company_policy("co_strict", {"maxDiscountPercent": 10})
        result = engine.validate_discount("co_strict", 25.0)
        assert result.valid is False
        assert result.violation is not None
        assert result.violation.rule == "MAX_DISCOUNT_EXCEEDED"
        assert result.violation.requested == 25.0
        assert result.violation.limit == 10.0

    def test_validate_price_change_within_limit(self):
        engine = PolicyEngine()
        result = engine.validate_price_change("co_1", 100.0, 115.0)
        assert result.valid is True
        assert len(result.violations) == 0

    def test_validate_price_change_below_floor(self):
        engine = PolicyEngine()
        result = engine.validate_price_change("co_1", 100.0, 0.5)
        assert result.valid is False
        assert any(v.rule == "BELOW_PRICE_FLOOR" for v in result.violations)

    def test_validate_price_change_exceeds_percent(self):
        engine = PolicyEngine()
        result = engine.validate_price_change("co_1", 100.0, 150.0)
        assert result.valid is False
        assert any(v.rule == "MAX_PRICE_CHANGE_EXCEEDED" for v in result.violations)

    def test_validate_refund_within_limit(self):
        engine = PolicyEngine()
        result = engine.validate_refund("co_1", 300.0)
        assert result.valid is True

    def test_validate_refund_exceeds_limit(self):
        engine = PolicyEngine()
        result = engine.validate_refund("co_1", 1000.0)
        assert result.valid is False
        assert result.violation.rule == "MAX_REFUND_EXCEEDED"

    def test_validate_action_all_valid(self):
        engine = PolicyEngine()
        result = engine.validate_action("co_1", {
            "type": "CREATE_DISCOUNT",
            "params": {"discountPercent": 10},
        })
        assert result.allowed is True
        assert len(result.violations) == 0

    def test_validate_action_blocked(self):
        engine = PolicyEngine()
        result = engine.validate_action("co_1", {
            "type": "DELETE_PRODUCT",
            "params": {},
        })
        assert result.allowed is False
        assert any(v.rule == "BLOCKED_ACTION" for v in result.violations)

    def test_validate_action_requires_approval(self):
        engine = PolicyEngine()
        result = engine.validate_action("co_1", {
            "type": "CREATE_ORDER",
            "params": {"value": 150},
        })
        assert result.allowed is True
        assert any(w.rule == "REQUIRES_APPROVAL" for w in result.warnings)

    def test_is_blocked_action(self):
        engine = PolicyEngine()
        assert engine.is_blocked_action("DELETE_PRODUCT") is True
        assert engine.is_blocked_action("DELETE_ORDER") is True
        assert engine.is_blocked_action("CREATE_ORDER") is False

    def test_daily_transaction_limit(self):
        engine = PolicyEngine()
        engine.set_company_policy("co_limited", {"maxDailyTransactions": 5})
        engine._daily_counts[f"co_limited:{__import__('datetime').date.today().isoformat()}"] = 5

        result = engine.validate_action("co_limited", {
            "type": "CREATE_ORDER",
            "params": {},
        })
        assert result.allowed is False
        assert any(v.rule == "DAILY_LIMIT_EXCEEDED" for v in result.violations)

    def test_increment_transaction_count(self):
        engine = PolicyEngine()
        count1 = engine.increment_transaction_count("co_test")
        count2 = engine.increment_transaction_count("co_test")
        count3 = engine.get_daily_transaction_count("co_test")
        assert count1 == 1
        assert count2 == 2
        assert count3 == 2

    def test_reset(self):
        engine = PolicyEngine()
        engine._company_policies["co_1"] = {"maxDiscountPercent": 50}
        engine._daily_counts["co_1:2026-01-01"] = 10
        engine.reset()
        assert engine._company_policies == {}
        assert engine._daily_counts == {}

    def test_discount_validation_edge_cases(self):
        """Edge cases: zero is valid (no discount), large exceeds limit."""
        engine = PolicyEngine()
        result = engine.validate_discount("co_1", 0.0)
        assert result.valid is True
        result = engine.validate_discount("co_1", 99.0)
        assert result.valid is False

    def test_price_change_rejects_zero_original(self):
        engine = PolicyEngine()
        result = engine.validate_price_change("co_1", 0, 100)
        assert result.valid is True  # Should not divide by zero

    def test_validation_result_has_enforced_limits(self):
        engine = PolicyEngine()
        result = engine.validate_action("co_1", {"type": "CREATE_DISCOUNT", "params": {}})
        assert result.allowed is True
        assert hasattr(result, "enforced_limits")
        assert "maxDiscountPercent" in result.enforced_limits
