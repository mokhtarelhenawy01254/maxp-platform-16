from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from src.deps import get_company_id
from src.services.a2a_bridge import build_agent_cards, handle_a2a_task
from src.services.agent_registry import get_agent_registry

router = APIRouter(prefix="/a2a", tags=["a2a"])


class A2ATaskRequest(BaseModel):
    jsonrpc: str = "2.0"
    method: str = "tasks/send"
    params: dict[str, Any] | None = None
    id: str | int | None = None


class A2ATaskParams(BaseModel):
    id: str = ""
    sessionId: str = ""
    message: dict[str, Any] = {}


@router.get("/agent-cards")
async def list_agent_cards(
    request: Request,
    company_id: str = Depends(get_company_id),
) -> dict[str, Any]:
    """List A2A Agent Cards for all agents in the company."""
    registry = get_agent_registry()
    cards = build_agent_cards(company_id, registry)
    return {
        "jsonrpc": "2.0",
        "result": {
            "agentCards": cards,
        },
    }


@router.get("/agents/{agent_id}/card")
async def get_agent_card(
    agent_id: str,
    request: Request,
    company_id: str = Depends(get_company_id),
) -> dict[str, Any]:
    """Get the A2A Agent Card for a specific agent."""
    registry = get_agent_registry()
    cards = build_agent_cards(company_id, registry)
    for card in cards:
        if card["agent_id"] == agent_id:
            return {
                "jsonrpc": "2.0",
                "result": {"agentCard": card},
            }
    raise HTTPException(status_code=404, detail="Agent not found")


@router.post("/agents/{agent_id}/tasks/send")
async def send_task(
    agent_id: str,
    body: dict[str, Any],
    request: Request,
    company_id: str = Depends(get_company_id),
) -> dict[str, Any]:
    """A2A tasks/send endpoint for routing tasks to a specialist agent."""
    params = body.get("params", {})
    message_parts = params.get("message", {}).get("parts", [])
    message_text = " ".join(
        p.get("text", "") for p in message_parts if p.get("type") == "text"
    )
    thread_id = params.get("id", "")
    session_id = params.get("sessionId", "")

    if not message_text:
        raise HTTPException(status_code=400, detail="No text content in message")

    result = await handle_a2a_task(
        company_id=company_id,
        agent_id=agent_id,
        message=message_text,
        thread_id=thread_id,
        session_id=session_id,
    )

    return result


@router.post("/tasks/send")
async def send_task_any(
    body: dict[str, Any],
    request: Request,
    company_id: str = Depends(get_company_id),
) -> dict[str, Any]:
    """A2A tasks/send endpoint — discovers target agent from message context."""
    params = body.get("params", {})
    message_parts = params.get("message", {}).get("parts", [])
    message_text = " ".join(
        p.get("text", "") for p in message_parts if p.get("type") == "text"
    )

    metadata = params.get("message", {}).get("metadata", {})
    agent_id = metadata.get("agent_id", "")

    if not agent_id:
        return {
            "jsonrpc": "2.0",
            "result": {
                "agentCards": build_agent_cards(company_id),
            },
        }

    return await send_task(agent_id, body, request, company_id)
