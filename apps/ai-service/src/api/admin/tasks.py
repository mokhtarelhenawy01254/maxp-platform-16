from __future__ import annotations

from typing import Annotated, Any

import structlog
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.admin.agents_schemas import (
    DepartmentRead,
    TaskActionRequest,
    TaskCreate,
    TaskRead,
)
from src.db.models.agent import Agent as AgentModel, AgentDepartment
from src.db.models.task import AiAgentTask
from src.db.repo.task_repo import TaskRepository
from src.db.session import get_session

logger = structlog.get_logger(__name__)
router = APIRouter()

SessionDep = Annotated[AsyncSession, Depends(get_session)]


def _task_to_read(task: AiAgentTask) -> TaskRead:
    return TaskRead(
        id=task.id,
        company_id=task.company_id,
        agent_id=task.agent_id,
        title=task.title,
        description=task.description,
        status=task.status,
        priority=task.priority,
        checked_out_by=task.checked_out_by,
        checked_out_at=task.checked_out_at,
        completed_at=task.completed_at,
        created_by=task.created_by,
        parent_task_id=task.parent_task_id,
        trace_id=task.trace_id,
        task_metadata=task.task_metadata,
        created_at=task.created_at,
        updated_at=task.updated_at,
    )


# ── Tasks ──────────────────────────────────────────────────────────────────


@router.get("/tasks", response_model=list[TaskRead])
async def list_tasks(
    session: SessionDep,
    company_id: str = Query(..., min_length=1),
    status: str | None = Query(default=None),
    agent_id: str | None = Query(default=None),
    assign_to: str | None = Query(default=None),
    active_only: bool = Query(default=False),
    limit: int = Query(default=100, ge=1, le=500),
) -> list[TaskRead]:
    """List agent tasks with optional filters."""
    repo = TaskRepository(session)
    tasks = await repo.list_tasks(
        company_id=company_id,
        status=status,
        agent_id=agent_id,
        checked_out_by=assign_to,
        active_only=active_only,
        limit=limit,
    )
    return [_task_to_read(t) for t in tasks]


@router.post("/tasks", response_model=TaskRead, status_code=201)
async def create_task(body: TaskCreate, session: SessionDep) -> TaskRead:
    """Create a new agent task (delegate)."""
    agent_id = body.agent_id or ""
    repo = TaskRepository(session)
    task = await repo.create_task({
        "company_id": body.company_id,
        "agent_id": agent_id,
        "title": body.title,
        "description": body.description or "",
        "status": "PENDING",
        "priority": body.priority or "medium",
        "created_by": body.created_by,
        "parent_task_id": body.parent_task_id,
        "trace_id": body.trace_id,
        "task_metadata": body.metadata or {},
    })
    await session.commit()
    await session.refresh(task)
    logger.info("task created", task_id=task.id, company_id=body.company_id)
    return _task_to_read(task)


@router.post("/tasks/{task_id}/checkout", response_model=TaskRead)
async def checkout_task(
    task_id: str,
    body: TaskActionRequest,
    session: SessionDep,
    company_id: str = Query(..., min_length=1),
) -> TaskRead:
    """Checkout a PENDING task."""
    repo = TaskRepository(session)
    result = await repo.checkout_task(task_id, company_id, body.agent_id)
    if not result:
        raise HTTPException(status_code=409, detail="Task not found or not in PENDING state")
    await session.commit()
    return _task_to_read(result)


@router.post("/tasks/{task_id}/complete", response_model=TaskRead)
async def complete_task(
    task_id: str,
    body: TaskActionRequest,
    session: SessionDep,
    company_id: str = Query(..., min_length=1),
) -> TaskRead:
    """Mark a task as COMPLETED."""
    repo = TaskRepository(session)
    result = await repo.complete_task(task_id, company_id, body.agent_id, body.result)
    if not result:
        raise HTTPException(status_code=404, detail="Task not found")
    await session.commit()
    return _task_to_read(result)


@router.post("/tasks/{task_id}/fail", response_model=TaskRead)
async def fail_task(
    task_id: str,
    body: TaskActionRequest,
    session: SessionDep,
    company_id: str = Query(..., min_length=1),
) -> TaskRead:
    """Mark a task as FAILED."""
    repo = TaskRepository(session)
    result = await repo.fail_task(task_id, company_id, body.agent_id, body.error or "")
    if not result:
        raise HTTPException(status_code=404, detail="Task not found")
    await session.commit()
    return _task_to_read(result)


# ── Departments ────────────────────────────────────────────────────────────


@router.get("/departments", response_model=list[DepartmentRead])
async def list_departments(
    session: SessionDep,
    company_id: str = Query(..., min_length=1),
) -> list[DepartmentRead]:
    """List all agent departments for a company."""
    stmt = (
        select(AgentDepartment)
        .where(AgentDepartment.company_id == company_id)
        .order_by(AgentDepartment.sort_order)
    )
    result = await session.execute(stmt)
    departments = result.scalars().all()
    return [
        DepartmentRead(
            id=d.id,
            company_id=d.company_id,
            key=d.key,
            name=d.name,
            description=d.description,
            icon=d.icon,
            sort_order=d.sort_order,
        )
        for d in departments
    ]


# ── Archive Agent ──────────────────────────────────────────────────────────


@router.post("/agents/{agent_id}/archive")
async def archive_agent(
    agent_id: str,
    session: SessionDep,
    company_id: str = Query(..., min_length=1),
) -> dict[str, bool]:
    """Archive (soft-delete) an agent."""
    result = await session.execute(
        select(AgentModel).where(
            AgentModel.id == agent_id,
            AgentModel.company_id == company_id,
            AgentModel.status != "ARCHIVED",
        )
    )
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    if agent.role == "CEO":
        raise HTTPException(status_code=400, detail="Cannot archive the CEO agent")
    agent.status = "ARCHIVED"
    await session.commit()
    logger.info("agent archived", agent_id=agent_id, company_id=company_id)
    return {"success": True}
