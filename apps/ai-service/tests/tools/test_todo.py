import pytest
from src.tools.definitions.todo import manage_todo, format_todo_result, ManageTodoInput, TaskItem


@pytest.mark.asyncio
async def test_todo_create_and_get():
    tenant = "test_tenant_todo_1"
    create_input = ManageTodoInput(
        action="create",
        plan_title="خطة إطلاق كوتشي Dash",
        company_id=tenant,
        tasks=[
            TaskItem(id=1, title="فحص المخزون", status="DONE"),
            TaskItem(id=2, title="تحليل المنافسين", status="IN_PROGRESS"),
            TaskItem(id=3, title="صياغة الإعلان", status="PENDING"),
        ],
    )

    result = await manage_todo(create_input)
    assert result["success"] is True
    assert result["plan"]["total_tasks"] == 3
    assert result["plan"]["completed_tasks"] == 1

    # Test format output
    formatted = format_todo_result(result)
    assert "خطة إطلاق كوتشي Dash" in formatted
    assert "✅" in formatted
    assert "⏳" in formatted


@pytest.mark.asyncio
async def test_todo_update():
    tenant = "test_tenant_todo_2"
    await manage_todo(
        ManageTodoInput(
            action="create",
            plan_title="خطة عمل سريعة",
            company_id=tenant,
            tasks=[TaskItem(id=1, title="مهمة 1", status="IN_PROGRESS")],
        )
    )

    update_input = ManageTodoInput(
        action="update",
        company_id=tenant,
        tasks=[TaskItem(id=1, title="مهمة 1", status="DONE")],
    )
    result = await manage_todo(update_input)
    assert result["success"] is True
    assert result["plan"]["completed_tasks"] == 1
