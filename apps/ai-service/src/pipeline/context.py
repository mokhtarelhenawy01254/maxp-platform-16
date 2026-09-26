from dataclasses import dataclass, field
from typing import Any

# Default token budget for context window (calibrated for gemini-2.5-flash)
TOKEN_BUDGET_DEFAULT = 12_000
DISABLE_EXTERNAL_EMBEDDING_RETRIEVAL = "disableExternalEmbeddingRetrieval"


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
    llm_client: Any = None

    # State
    system_prompt: str | None = None
    relevance_plan: Any = None
    native_tools: list[dict[str, Any]] = field(default_factory=list)
    channel: str = "chat"
    is_customer_channel: bool = False
    conversation_id: str | None = None
    attachments: list[dict[str, Any]] = field(default_factory=list)

    # Context Assembly (SOTA 2026)
    rag_evidence: str = ""  # RAG evidence from company knowledge base
    episodic_memories: list[dict[str, Any]] = field(default_factory=list)  # Retrieved episodic memories
    token_budget: int = TOKEN_BUDGET_DEFAULT  # Max tokens for context window
    original_history_tokens: int = 0  # Token count before compression
    compressed_history_tokens: int = 0  # Token count after compression
    context_metrics: Any = None  # Computed ContextMetrics after assembly
    session_state: dict[str, Any] = field(default_factory=dict)  # Working memory session state
    external_memory_context: dict[str, Any] = field(default_factory=dict)

    # Execution
    execution_plan: dict[str, Any] | None = None
    messages: list[dict[str, Any]] = field(default_factory=list)
    tool_context: str = ""  # Tool execution context for metrics
    executed_tools: list[dict[str, Any]] = field(default_factory=list)
    tool_evidence: list[dict[str, Any]] = field(default_factory=list)

    # Result
    llm_result: Any = None
    llm_response: str = ""
    final_reply: str | None = None
    response_attachments: list[dict[str, Any]] = field(default_factory=list)
    response_contract: Any = None  # AgentResponse Pydantic contract (SOTA 2026)

    # Metadata
    rounds: int = 0
    repaired: bool = False
    early_return: dict[str, Any] | None = None

    # Silent Escalation (2026 SOTA — suppress error messages, flag for human takeover)
    escalation_requested: bool = False
    escalation_reason: str = ""

    # Checkpoint tracking
    last_checkpoint_id: str | None = None
    resumed_from_checkpoint: bool = False

    # Skill enforcement (per-turn)
    tool_call_index: int = 0
    active_skill_context: dict[str, Any] | None = None

    # Task-scoped model selection (isolated per concurrent request)
    model_selection: dict[str, Any] | None = None
