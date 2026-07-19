from __future__ import annotations

import uuid
from datetime import UTC

from sqlalchemy import UniqueConstraint

from src.db.base import Base
from src.db.models import Approval, Checkpoint, Thread, ToolCall


def _get_schema(model) -> str:
    args = model.__table_args__
    if isinstance(args, dict):
        return args.get("schema", "public")
    return args[-1].get("schema", "public") if args else "public"


class TestThread:
    def test_table_name(self) -> None:
        assert Thread.__tablename__ == "threads"

    def test_schema(self) -> None:
        assert _get_schema(Thread) == "ai"

    def test_unique_constraint(self) -> None:
        constraints = [
            t for t in Thread.__table_args__
            if isinstance(t, (UniqueConstraint,))
        ]
        assert len(constraints) == 1
        uc = constraints[0]
        assert [c.name for c in uc.columns] == ["company_id", "customer_id", "channel"]

    def test_column_defaults_configured(self) -> None:
        status_col = Thread.__table__.columns["status"]
        assert status_col.default.arg == "active"

    def test_instantiation(self) -> None:
        t = Thread(
            company_id="c1",
            customer_id="cust1",
            channel="whatsapp",
        )
        assert t.company_id == "c1"
        assert t.customer_id == "cust1"
        assert t.channel == "whatsapp"


class TestCheckpoint:
    def test_table_name(self) -> None:
        assert Checkpoint.__tablename__ == "checkpoints"

    def test_schema(self) -> None:
        assert _get_schema(Checkpoint) == "ai"

    def test_composite_pk(self) -> None:
        cp = Checkpoint(
            thread_id=uuid.uuid4(),
            checkpoint_id="cp1",
            state={"key": "value"},
        )
        assert cp.checkpoint_id == "cp1"
        assert cp.state == {"key": "value"}

    def test_pk_columns(self) -> None:
        pk = Checkpoint.__table__.primary_key
        assert [c.name for c in pk.columns] == ["thread_id", "checkpoint_id"]


class TestToolCall:
    def test_table_name(self) -> None:
        assert ToolCall.__tablename__ == "tool_calls"

    def test_schema(self) -> None:
        assert _get_schema(ToolCall) == "ai"

    def test_instantiation(self) -> None:
        tc = ToolCall(
            id=uuid.uuid4(),
            thread_id=uuid.uuid4(),
            company_id="c1",
            tool_name="get_product",
            input={"product_id": "123"},
            status="success",
        )
        assert tc.tool_name == "get_product"
        assert tc.status == "success"
        assert tc.output is None
        assert tc.error_message is None
        assert tc.latency_ms is None

    def test_optional_fields(self) -> None:
        tc = ToolCall(
            id=uuid.uuid4(),
            thread_id=uuid.uuid4(),
            company_id="c1",
            tool_name="search",
            input={"q": "shirt"},
            status="error",
            output={"error": "timeout"},
            error_message="Request timed out",
            latency_ms=5000,
        )
        assert tc.output == {"error": "timeout"}
        assert tc.error_message == "Request timed out"
        assert tc.latency_ms == 5000


class TestApproval:
    def test_table_name(self) -> None:
        assert Approval.__tablename__ == "approvals"

    def test_schema(self) -> None:
        assert _get_schema(Approval) == "ai"

    def test_column_defaults_configured(self) -> None:
        status_col = Approval.__table__.columns["status"]
        assert status_col.default.arg == "pending"

    def test_instantiation(self) -> None:
        a = Approval(
            id=uuid.uuid4(),
            thread_id=uuid.uuid4(),
            company_id="c1",
            draft_id="d1",
            action_type="place_order",
            action_args={"order_id": "123"},
        )
        assert a.status is None  # default applied at INSERT, not Python instantiation
        assert a.decided_by is None
        assert a.decided_at is None

    def test_full_instantiation(self) -> None:
        from datetime import datetime

        now = datetime.now(UTC)
        a = Approval(
            id=uuid.uuid4(),
            thread_id=uuid.uuid4(),
            company_id="c1",
            draft_id="d1",
            action_type="cancel_order",
            action_args={"reason": "customer request"},
            status="approved",
            decided_by="admin",
            decided_at=now,
        )
        assert a.status == "approved"
        assert a.decided_by == "admin"
        assert a.decided_at == now


class TestBase:
    def test_all_tables_registered(self) -> None:
        tables = Base.metadata.tables
        assert "ai.threads" in tables
        assert "ai.checkpoints" in tables
        assert "ai.tool_calls" in tables
        assert "ai.approvals" in tables
