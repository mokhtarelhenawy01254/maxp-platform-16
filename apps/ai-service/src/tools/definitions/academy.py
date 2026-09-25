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


class LessonExerciseInput(BaseModel):
    lesson_id: str = Field(..., description="ID of the lesson to fetch exercise prompt, requirements, and starter data for")
    company_id: str = Field(default="", description="Tenant ID (auto-injected)")


class LessonRubricInput(BaseModel):
    lesson_id: str = Field(..., description="ID of the lesson to fetch grading rubric, criteria, and pass thresholds for")
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


async def get_current_lesson_exercise(input_data: LessonExerciseInput) -> dict[str, Any]:
    """Fetch exercise details and requirements for the current lesson."""
    data = await api_get(f"/api/v1/academy/lessons/{input_data.lesson_id}/exercise")
    if not data or not data.get("success"):
        return {"error": "Failed to fetch lesson exercise", "exercise": None}
    return {"exercise": data.get("data")}


async def get_lesson_rubric(input_data: LessonRubricInput) -> dict[str, Any]:
    """Fetch grading rubric, scoring criteria, and pass conditions for the lesson exercise."""
    data = await api_get(f"/api/v1/academy/lessons/{input_data.lesson_id}/rubric")
    if not data or not data.get("success"):
        return {"error": "Failed to fetch lesson rubric", "rubric": None}
    return {"rubric": data.get("data")}


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

get_current_lesson_exercise_tool = FunctionTool(
    name="get_current_lesson_exercise",
    description="جلب تفاصيل التمرين ومتطلباته للدرس الحالي لمقارنة إجابة الطالب بالمتطلبات المحددة.",
    func=get_current_lesson_exercise,
    input_model=LessonExerciseInput,
)

get_lesson_rubric_tool = FunctionTool(
    name="get_lesson_rubric",
    description="جلب معايير التصحيح والتقييم (Rubric) للدرس الحالي للتأكد من استيفاء الطالب للشروط والدرجات المطلوبة.",
    func=get_lesson_rubric,
    input_model=LessonRubricInput,
)

__all_tools__ = [
    get_current_lesson_script_tool,
    get_course_outline_tool,
    get_current_lesson_exercise_tool,
    get_lesson_rubric_tool,
]
