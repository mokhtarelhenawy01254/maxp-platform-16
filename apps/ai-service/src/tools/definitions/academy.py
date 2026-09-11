from __future__ import annotations

from typing import Any
from agent_framework import FunctionTool
from pydantic import BaseModel, Field

from src.tools.backend_client import api_get


class CurrentLessonScriptInput(BaseModel):
    lesson_id: str = Field(..., description="ID of the current lesson to fetch script and content for")
    company_id: str = Field(default="", description="Tenant ID (auto-injected)")


class CourseOutlineInput(BaseModel):
    course_id: str = Field(..., description="ID of the course to fetch modules and lesson outlines for")
    company_id: str = Field(default="", description="Tenant ID (auto-injected)")


async def get_current_lesson_script(input_data: CurrentLessonScriptInput) -> dict[str, Any]:
    """Fetch current lesson script, transcript, and objectives for grounding the coach."""
    data = await api_get(f"/api/v1/academy/lessons/{input_data.lesson_id}/content")
    if not data or not data.get("success"):
        return {"error": "Failed to fetch lesson content", "lesson": None}
    return {"lesson": data.get("data")}


async def get_course_outline(input_data: CourseOutlineInput) -> dict[str, Any]:
    """Fetch full course structure, modules, and lessons."""
    data = await api_get(f"/api/v1/academy/courses/{input_data.course_id}/outline")
    if not data or not data.get("success"):
        return {"error": "Failed to fetch course outline", "outline": None}
    return {"outline": data.get("data")}


get_current_lesson_script_tool = FunctionTool(
    name="get_current_lesson_script",
    description="جلب نص وسيناريو الدرس الحالي وأهدافه التعليمية للإجابة بدقة على أسئلة الطالب واستناد الإجابة لمحتوى الدرس.",
    func=get_current_lesson_script,
    input_model=CurrentLessonScriptInput,
)

get_course_outline_tool = FunctionTool(
    name="get_course_outline",
    description="جلب المنهج الكامل للدورة التعليمية وقائمة الوحدات والدروس لتوجيه الطالب ومساعدته في التنقل بين المفاهيم.",
    func=get_course_outline,
    input_model=CourseOutlineInput,
)

__all_tools__ = [
    get_current_lesson_script_tool,
    get_course_outline_tool,
]
