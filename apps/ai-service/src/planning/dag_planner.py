"""
@module planning.dag_planner
@description DAG Planner & Executor - directed acyclic graph task planning
with topological sort, concurrent execution, and dynamic replanning.

Python counterpart to Node.js DAGPlannerExecutor.js.
Pure algorithmic code - no AI runtime dependency.
"""

from __future__ import annotations

import asyncio
import re
import time
from collections.abc import Awaitable, Callable
from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class TaskStatus(str, Enum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    SKIPPED = "SKIPPED"


class PlanStatus(str, Enum):
    READY = "READY"
    REPLANNED = "REPLANNED"
    SUCCESS = "SUCCESS"
    PARTIAL_FAILURE = "PARTIAL_FAILURE"


@dataclass
class Task:
    id: str
    name: str
    dependencies: list[str] = field(default_factory=list)
    params: dict[str, Any] = field(default_factory=dict)
    handler: Callable[..., Awaitable[Any]] | None = None
    status: TaskStatus = TaskStatus.PENDING
    result: Any = None
    error: str | None = None


@dataclass
class Plan:
    plan_id: str
    tasks: list[Task]
    execution_order: list[list[str]]
    status: PlanStatus = PlanStatus.READY
    created_at: float = field(default_factory=time.time)


@dataclass
class ExecutionResult:
    plan_id: str
    status: PlanStatus
    results: dict[str, Any]
    errors: list[dict[str, str]]


@dataclass
class CheckpointData:
    plan_id: str
    layer_index: int
    tasks: list[dict[str, Any]]
    results: dict[str, Any]
    errors: list[dict[str, str]]


class DAGPlannerExecutor:
    """
    DAG-based task planner and executor.
    Supports topological sorting, concurrent layer execution, and dynamic replanning.
    """

    def __init__(self) -> None:
        self._execution_log: list[dict[str, Any]] = []

    def create_plan(self, tasks: list[dict[str, Any]]) -> Plan:
        """
        Creates a DAG plan from task definitions.

        Args:
            tasks: List of task dicts with id, name, dependencies, params, handler

        Returns:
            Plan with execution order computed via topological sort

        Raises:
            ValueError: If cycle detected in task dependencies
        """
        plan_id = f"plan_{int(time.time() * 1000)}"

        task_objects = [
            Task(
                id=t["id"],
                name=t.get("name", t["id"]),
                dependencies=t.get("dependencies", []),
                params=t.get("params", {}),
                handler=t.get("handler"),
            )
            for t in tasks
        ]

        if self._has_cycle(task_objects):
            raise ValueError("DAG validation failed: cycle detected in task dependencies")

        execution_order = self._topological_sort(task_objects)

        return Plan(
            plan_id=plan_id,
            tasks=task_objects,
            execution_order=execution_order,
            status=PlanStatus.READY,
            created_at=time.time(),
        )

    def _has_cycle(self, tasks: list[Task]) -> bool:
        """Detects cycles in the task graph using DFS."""
        visited: set[str] = set()
        rec_stack: set[str] = set()
        adj: dict[str, list[str]] = {t.id: t.dependencies for t in tasks}

        def dfs(task_id: str) -> bool:
            visited.add(task_id)
            rec_stack.add(task_id)
            for dep in adj.get(task_id, []):
                if dep not in visited:
                    if dfs(dep):
                        return True
                elif dep in rec_stack:
                    return True
            rec_stack.discard(task_id)
            return False

        for task in tasks:
            if task.id not in visited and dfs(task.id):
                return True
        return False

    def _topological_sort(self, tasks: list[Task]) -> list[list[str]]:
        """
        Topological sort using Kahn's algorithm.
        Groups tasks into execution layers - tasks in the same layer can run concurrently.
        """
        task_map: dict[str, Task] = {t.id: t for t in tasks}
        in_degree: dict[str, int] = {t.id: 0 for t in tasks}
        adjacency: dict[str, list[str]] = {t.id: [] for t in tasks}

        for task in tasks:
            for dep in task.dependencies:
                if dep in adjacency:
                    adjacency[dep].append(task.id)
                    in_degree[task.id] = in_degree.get(task.id, 0) + 1

        layers: list[list[str]] = []
        remaining: set[str] = {t.id for t in tasks}

        while remaining:
            layer: list[str] = [tid for tid in remaining if in_degree.get(tid, 0) == 0]

            if not layer:
                break

            layers.append(layer)
            remaining.difference_update(layer)

            for task_id in layer:
                for child in adjacency.get(task_id, []):
                    if child in in_degree:
                        in_degree[child] -= 1

        return layers

    async def execute_plan(
        self,
        plan: Plan,
        initial_context: dict[str, Any] | None = None,
        *,
        db_session: Any = None,
        ai_agent_task_id: str | None = None,
        company_id: str | None = None,
    ) -> ExecutionResult:
        """
        Executes a plan layer by layer with concurrent execution within each layer.

        Args:
            plan: Plan created by create_plan
            initial_context: Initial template variables
            db_session: Optional SQLAlchemy session for checkpointing
            ai_agent_task_id: Optional task ID for persistence
            company_id: Required if ai_agent_task_id is provided

        Returns:
            ExecutionResult with all results and errors
        """
        results: dict[str, Any] = {**(initial_context or {})}
        errors: list[dict[str, str]] = []
        task_map: dict[str, Task] = {t.id: t for t in plan.tasks}

        for layer_index, layer in enumerate(plan.execution_order):
            layer_tasks: list[Awaitable[Any]] = []

            for task_id in layer:
                task = task_map.get(task_id)
                if not task:
                    continue

                if self._has_failed_dependency(task, task_map):
                    task.status = TaskStatus.SKIPPED
                    task.error = "Dependency failed or skipped"
                    errors.append({"taskId": task_id, "error": task.error})
                    continue

                task.status = TaskStatus.RUNNING
                layer_tasks.append(self._execute_task(task, results))

            if layer_tasks:
                await asyncio.gather(*layer_tasks, return_exceptions=True)

            for task_id in layer:
                task = task_map.get(task_id)
                if task:
                    results[task_id] = task.result

            if db_session and ai_agent_task_id and company_id:
                await self._save_checkpoint(
                    db_session=db_session,
                    task_id=ai_agent_task_id,
                    company_id=company_id,
                    checkpoint_data=CheckpointData(
                        plan_id=plan.plan_id,
                        layer_index=layer_index,
                        tasks=[
                            {
                                "id": t.id,
                                "status": t.status.value,
                                "result": t.result,
                                "error": t.error,
                            }
                            for t in plan.tasks
                        ],
                        results=results.copy(),
                        errors=errors.copy(),
                    ),
                )

        all_completed = all(t.status == TaskStatus.COMPLETED for t in plan.tasks)
        if not errors and all_completed:
            plan.status = PlanStatus.SUCCESS
        else:
            plan.status = PlanStatus.PARTIAL_FAILURE

        self._execution_log.append({
            "planId": plan.plan_id,
            "status": plan.status.value,
            "completedTasks": sum(1 for t in plan.tasks if t.status == TaskStatus.COMPLETED),
            "failedTasks": len(errors),
            "timestamp": time.time(),
        })

        return ExecutionResult(
            plan_id=plan.plan_id,
            status=plan.status,
            results=results,
            errors=errors,
        )

    def _has_failed_dependency(self, task: Task, task_map: dict[str, Task]) -> bool:
        """Check if any dependency has failed or been skipped."""
        for dep_id in task.dependencies:
            dep_task = task_map.get(dep_id)
            if dep_task and dep_task.status in (TaskStatus.FAILED, TaskStatus.SKIPPED):
                return True
        return False

    async def _execute_task(self, task: Task, results: dict[str, Any]) -> None:
        """Execute a single task with template resolution."""
        try:
            resolved_params = self._resolve_templates(task.params, results)
            task.status = TaskStatus.RUNNING

            if task.handler:
                task.result = await task.handler(resolved_params, results)
            else:
                task.result = {"success": True}

            task.status = TaskStatus.COMPLETED
        except Exception as exc:
            task.status = TaskStatus.FAILED
            task.error = str(exc)

    def _resolve_templates(
        self, params: dict[str, Any], results: dict[str, Any]
    ) -> dict[str, Any]:
        """
        Resolves template variables like {{taskId.field}} from previous results.

        Example:
            {{fetch_product.price}} -> "99.99" (if fetch_product returned {price: 99.99})
        """
        resolved: dict[str, Any] = {}

        for key, value in params.items():
            if isinstance(value, str):
                resolved[key] = re.sub(
                    r"\{\{(\w+)\.(\w+)\}\}",
                    lambda m: self._get_nested_field(results, m.group(1), m.group(2)),
                    value,
                )
            else:
                resolved[key] = value

        return resolved

    def _get_nested_field(self, results: dict[str, Any], task_id: str, field: str) -> str:
        """Get nested field from task result."""
        task_result = results.get(task_id)
        if task_result and isinstance(task_result, dict):
            value = task_result.get(field)
            if value is not None:
                return str(value)
        return f"{{{{{task_id}.{field}}}}}"  # Return placeholder if not found

    def replan(self, plan: Plan, failed_task_ids: list[str]) -> Plan:
        """
        Attempts replanning when tasks fail by removing failed tasks and re-sorting.

        Args:
            plan: Original plan
            failed_task_ids: List of task IDs that failed

        Returns:
            New plan with failed tasks and their dependencies removed
        """
        remaining = [t for t in plan.tasks if t.id not in failed_task_ids]

        for task in remaining:
            task.dependencies = [d for d in task.dependencies if d not in failed_task_ids]
            task.status = TaskStatus.PENDING

        execution_order = self._topological_sort(remaining)

        return Plan(
            plan_id=f"{plan.plan_id}_replan",
            tasks=remaining,
            execution_order=execution_order,
            status=PlanStatus.REPLANNED,
            created_at=time.time(),
        )

    async def _save_checkpoint(
        self,
        db_session: Any,
        task_id: str,
        company_id: str,
        checkpoint_data: CheckpointData,
    ) -> None:
        """Save checkpoint to database via SQLAlchemy session."""
        try:
            from sqlalchemy import text

            await db_session.execute(
                text("""
                    UPDATE ai.ai_agent_task
                    SET checkpoint = :checkpoint,
                        status = CASE
                            WHEN EXISTS (SELECT 1 FROM unnest(:task_statuses) s WHERE s = 'FAILED')
                                THEN 'FAILED'
                            WHEN EXISTS (SELECT 1 FROM unnest(:task_statuses) s WHERE s != 'COMPLETED')
                                THEN 'IN_PROGRESS'
                            ELSE 'COMPLETED'
                        END,
                        updated_at = NOW()
                    WHERE id = :task_id AND company_id = :company_id
                """),
                {
                    "checkpoint": checkpoint_data.model_dump_json(),
                    "task_statuses": [t["status"] for t in checkpoint_data.tasks],
                    "task_id": task_id,
                    "company_id": company_id,
                },
            )
            await db_session.commit()
        except Exception as exc:
            import logging
            logging.getLogger(__name__).warning(f"[DAG-PLANNER] Failed to save checkpoint: {exc}")

    def get_execution_log(self) -> list[dict[str, Any]]:
        """Returns copy of execution log."""
        return list(self._execution_log)

    def reset(self) -> None:
        """Clears execution log."""
        self._execution_log = []


dag_planner = DAGPlannerExecutor()
