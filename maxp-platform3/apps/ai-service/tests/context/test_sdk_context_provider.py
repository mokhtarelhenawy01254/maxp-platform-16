from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import pytest
from agent_framework import AgentSession, Message, SessionContext

from src.context.sdk_provider import MaxPContextProvider


@pytest.mark.asyncio
async def test_context_provider_extends_sdk_instructions_from_assembler():
    assembler = MagicMock()
    assembler.build_system_prompt = AsyncMock(
        return_value="base\n<customer_profile>\nName: Ahmed\n</customer_profile>"
    )
    provider = MaxPContextProvider(
        company_id="comp1",
        customer_id="cust1",
        agent=MagicMock(instructions="base"),
        assembler=assembler,
    )
    session = AgentSession(session_id="thread1")
    context = SessionContext(
        session_id="thread1",
        input_messages=[Message(role="user", contents=["hello"])],
    )

    await provider.before_run(
        agent=object(),
        session=session,
        context=context,
        state={},
    )

    assert context.instructions == [
        "base\n<customer_profile>\nName: Ahmed\n</customer_profile>"
    ]
    assert session.state["maxp_context"]["company_id"] == "comp1"
    assert session.state["maxp_context"]["customer_id"] == "cust1"
    assert session.state["maxp_context"]["thread_id"] == "thread1"
    assert session.state["maxp_context"]["message"] == "hello"


@pytest.mark.asyncio
async def test_context_provider_uses_session_state_over_defaults():
    assembler = MagicMock()
    assembler.build_system_prompt = AsyncMock(return_value="ctx")
    provider = MaxPContextProvider(
        company_id="default_company",
        customer_id="default_customer",
        agent=None,
        assembler=assembler,
    )
    session = AgentSession(session_id="thread1")
    session.state["maxp_context"] = {
        "company_id": "state_company",
        "customer_id": "state_customer",
        "thread_id": "state_thread",
    }
    context = SessionContext(
        session_id="thread1",
        input_messages=[Message(role="user", contents=["run report"])],
    )

    await provider.before_run(
        agent=object(),
        session=session,
        context=context,
        state={},
    )

    pipeline_ctx = assembler.build_system_prompt.await_args.args[0]
    assert pipeline_ctx.company_id == "state_company"
    assert pipeline_ctx.customer_id == "state_customer"
    assert pipeline_ctx.thread_id == "state_thread"
    assert pipeline_ctx.message == "run report"


@pytest.mark.asyncio
async def test_context_provider_extends_sdk_context_messages_from_history():
    assembler = MagicMock()
    assembler.build_system_prompt = AsyncMock(return_value="ctx")
    assembler.fetch_message_history = AsyncMock(
        return_value=[
            {"role": "user", "content": "old question"},
            {"role": "assistant", "content": "old answer"},
        ]
    )
    provider = MaxPContextProvider(
        company_id="comp1",
        customer_id="cust1",
        agent=MagicMock(instructions="base"),
        assembler=assembler,
    )
    session = AgentSession(session_id="thread1")
    session.state["maxp_context"] = {"db_session": object()}
    context = SessionContext(
        session_id="thread1",
        input_messages=[Message(role="user", contents=["new question"])],
    )

    await provider.before_run(
        agent=object(),
        session=session,
        context=context,
        state={},
    )

    messages = context.get_messages(sources={"maxp_context"})
    assert [message.role for message in messages] == ["user", "assistant"]
    assert [message.text for message in messages] == ["old question", "old answer"]
    assert messages[0].additional_properties["_attribution"]["source_id"] == "maxp_context"
