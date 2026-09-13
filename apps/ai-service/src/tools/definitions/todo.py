from __future__ import annotations

from typing import Any, Literal
import structlog
from agent_framework import FunctionTool
from pydantic import BaseModel, Field

logger = structlog.get_logger(__name__)


class TaskItem(BaseModel):
    id: int = Field(description="Sequential 1-based task ID")
    title: str = Field(description="Clear, actionable task description")
    status: Literal["PENDING", "IN_PROGRESS", "DONE", "BLOCKED"] = Field(
        default="PENDING", description="Current execution state of the step"
    )


class ManageTodoInput(BaseModel):
    action: Literal["create", "update", "get"] = Field(
        default="get",
        description="Action to perform on the in-session plan checklist ('create', 'update', 'get')",
    )
    plan_title: str | None = Field(
        default=None,
        description="Overall mission title (e.g. 'خطة إطلاق وتوسيع حملة كوتشي Dash')",
    )
    tasks: list[TaskItem] | None = Field(
        default=None,
        description="Ordered list of tasks in the checklist with their statuses",
    )
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


# In-memory store for active session plans per tenant
_ACTIVE_TODO_PLANS: dict[str, dict[str, Any]] = {}


async def manage_todo(input_data: ManageTodoInput) -> dict[str, Any]:
    """Hermes-grade Dynamic In-Session TODO & Plan Tracker:
    Creates, tracks, and updates multi-step execution plans for complex strategic missions,
    giving the user live progress visibility and preventing the agent from dropping steps.
    """
    company_id = input_data.company_id or "default_tenant"
    action = input_data.action

    if action == "create":
        if not input_data.tasks:
            return {"success": False, "error": "tasks list is required to create a plan"}

        tasks_list = [
            {
                "id": t.id,
                "title": t.title,
                "status": t.status,
            }
            for t in input_data.tasks
        ]

        plan = {
            "title": input_data.plan_title or "خطة العمل التنفيذية",
            "tasks": tasks_list,
            "total_tasks": len(tasks_list),
            "completed_tasks": sum(1 for t in tasks_list if t["status"] == "DONE"),
        }
        _ACTIVE_TODO_PLANS[company_id] = plan

        return {
            "success": True,
            "action": "create",
            "plan": plan,
            "message": f"تم إنشاء خطة العمل ({plan['title']}) بعدد {len(tasks_list)} خطوات بنجاح.",
        }

    elif action == "update":
        existing = _ACTIVE_TODO_PLANS.get(company_id)
        if not existing and not input_data.tasks:
            return {"success": False, "error": "No existing plan found to update"}

        if input_data.tasks:
            tasks_list = [
                {
                    "id": t.id,
                    "title": t.title,
                    "status": t.status,
                }
                for t in input_data.tasks
            ]
            existing_title = input_data.plan_title or (existing["title"] if existing else "خطة العمل")
            plan = {
                "title": existing_title,
                "tasks": tasks_list,
                "total_tasks": len(tasks_list),
                "completed_tasks": sum(1 for t in tasks_list if t["status"] == "DONE"),
            }
            _ACTIVE_TODO_PLANS[company_id] = plan
            return {
                "success": True,
                "action": "update",
                "plan": plan,
                "message": f"تم تحديث خطة العمل: {plan['completed_tasks']}/{plan['total_tasks']} مكتملة.",
            }

        return {"success": True, "action": "update", "plan": existing}

    else:  # get
        plan = _ACTIVE_TODO_PLANS.get(company_id)
        if not plan:
            return {
                "success": True,
                "action": "get",
                "has_active_plan": False,
                "message": "لا توجد خطة عمل نشطة حالياً في هذه الجلسة.",
            }

        return {
            "success": True,
            "action": "get",
            "has_active_plan": True,
            "plan": plan,
        }


def format_todo_result(result: dict[str, Any]) -> str:
    """Format TODO execution cleanly for chat interface."""
    if not result.get("success"):
        return f"تعذر تحديث خطة العمل: {result.get('error')}"

    plan = result.get("plan")
    if not plan or not plan.get("tasks"):
        return result.get("message", "تم تنفيذ عملية الخطة بنجاح.")

    lines = [f"### 📋 {plan.get('title', 'خطة العمل التنفيذية')}:"]
    for t in plan.get("tasks", []):
        icon = "✅" if t["status"] == "DONE" else ("⏳" if t["status"] == "IN_PROGRESS" else ("⚠️" if t["status"] == "BLOCKED" else "⚪"))
        lines.append(f"- {icon} **خطوة {t['id']}:** {t['title']} `[{t['status']}]`")

    lines.append(f"\n*الإنجاز: {plan.get('completed_tasks', 0)} من أصل {plan.get('total_tasks', len(plan.get('tasks', [])))} خطوات مكتملة.*")
    return "\n".join(lines)


todo_tool = FunctionTool(
    name="manage_todo",
    description="Hermes In-Session Dynamic Plan & TODO Tracker: Creates and updates live checklists for complex multi-step execution missions.",
    func=manage_todo,
    input_model=ManageTodoInput,
    format_result=format_todo_result,
)

__all_tools__ = [
    todo_tool,
]
