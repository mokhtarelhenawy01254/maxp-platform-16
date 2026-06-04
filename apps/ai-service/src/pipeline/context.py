from dataclasses import dataclass, field
from typing import Any


@dataclass
class PipelineContext:
    # Inputs
    message: str
    thread_id: str
    company_id: str
    customer_id: str

    # Agent/Session
    agent: Any = None
    session: Any = None

    # State
    system_prompt: str | None = None
    relevance_plan: Any = None
    native_tools: list[dict[str, Any]] = field(default_factory=list)
    is_customer_channel: bool = False

    # Execution
    execution_plan: dict[str, Any] | None = None
    messages: list[dict[str, Any]] = field(default_factory=list)
    tool_context: str = ""
    executed_tools: list[dict[str, Any]] = field(default_factory=list)
    tool_evidence: list[dict[str, Any]] = field(default_factory=list)

    # Result
    llm_result: Any = None
    llm_response: str = ""
    final_reply: str | None = None

    # Metadata
    rounds: int = 0
    repaired: bool = False
    early_return: dict[str, Any] | None = None

    # Checkpoint tracking
    last_checkpoint_id: str | None = None
    resumed_from_checkpoint: bool = False
