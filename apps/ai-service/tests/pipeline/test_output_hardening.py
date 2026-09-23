"""2026 P2 hardening tests: output risk scrubbing, hierarchical history
compaction, and provider-safe reasoning_content handling."""

from __future__ import annotations

from types import SimpleNamespace

from src.llm.client import LLMClient
from src.pipeline.stages.skills_pipeline import _compact_history_for_budget
from src.pipeline.stages.validate_reply import _scrub_output_risks


# ── Output risk scrubbing ─────────────────────────────────────────────

def test_api_keys_and_tokens_are_masked():
    text = "المفتاح بتاعك sk-ABCDEF1234567890abcdef غلط، وده التوكن Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload"
    scrubbed, risks = _scrub_output_risks(text)
    assert "sk-ABCDEF" not in scrubbed
    assert "••••••" in scrubbed
    assert "api_key" in risks or "bearer_token" in risks


def test_db_connection_string_masked():
    text = "جرّبت أوصل بقاعدة postgres://admin:S3cretPass@db.internal:5432/maxp وفشل"
    scrubbed, risks = _scrub_output_risks(text)
    assert "S3cretPass" not in scrubbed
    assert "db_connection_string" in risks
    # host/db kept for debugging context
    assert "db.internal" in scrubbed


def test_traceback_and_internal_exceptions_replaced():
    text = (
        "تمام! راجعت الطلب.\n"
        "Traceback (most recent call last):\n"
        '  File "/var/www/app.py", line 42, in handler\n'
        "    raise ValueError('boom')\n"
        "sqlalchemy.exc.OperationalError: connection refused"
    )
    scrubbed, risks = _scrub_output_risks(text)
    assert "Traceback" not in scrubbed
    assert "boom" not in scrubbed
    assert "OperationalError" not in scrubbed
    assert "عطل داخلي" in scrubbed
    assert "traceback" in risks  # greedy block swallows the trailing exception line too


def test_normal_arabic_reply_with_phone_is_untouched():
    text = "طلبك 38124937 اتشحن وهيوصل بكرة، ورقم المندوب 01012345678."
    scrubbed, risks = _scrub_output_risks(text)
    assert scrubbed == text
    assert risks == []


# ── Hierarchical history compaction ──────────────────────────────────

def _history_with_filler(n: int) -> list[dict]:
    msgs = [{"role": "system", "content": "أنت مساعد المتجر."}]
    for i in range(n):
        msgs.append({"role": "user", "content": f"رسالة عميل رقم {i} " + "تفاصيل " * 30})
        msgs.append({"role": "assistant", "content": f"رد المساعد على {i} " + "شرح " * 30})
    msgs.append({"role": "user", "content": "الرسالة الأخيرة"})
    return msgs


def test_compaction_keeps_summary_and_last_turn():
    messages = _history_with_filler(12)
    budget = len("أنت مساعد المتجر.") // 4 + 40  # force heavy compaction
    compacted, tokens = _compact_history_for_budget(messages, budget, 10_000)

    contents = [m.get("content", "") for m in compacted]
    assert any("<conversation_summary>" in c for c in contents), "summary block missing"
    assert contents[-1] == "الرسالة الأخيرة", "latest user turn must survive"
    assert contents[0].startswith("أنت مساعد المتجر"), "system prompt must survive"
    # dropped turns live inside the summary, not vanished
    summary = next(c for c in contents if "<conversation_summary>" in c)
    assert "العميل" in summary and "المساعد" in summary


def test_compaction_noop_under_budget():
    messages = [
        {"role": "system", "content": "sys"},
        {"role": "user", "content": "أهلاً"},
    ]
    compacted, tokens = _compact_history_for_budget([list(m.items()) and dict(m) for m in messages], 10_000, 10)
    assert compacted == messages
    assert tokens == 10


# ── Provider-safe reasoning_content ──────────────────────────────────

def _msg_with_reasoning() -> list[dict]:
    return [
        {"role": "assistant", "content": "", "reasoning_content": "سلسلة تفكير داخلية", "tool_calls": None},
    ]


def test_reasoning_content_kept_for_deepseek():
    normalized = LLMClient._normalize_openai_messages(
        SimpleNamespace(provider="deepseek", model="deepseek-v4-flash"),
        _msg_with_reasoning(),
    )
    assert normalized[0].get("reasoning_content") == "سلسلة تفكير داخلية"


def test_reasoning_content_stripped_for_other_providers():
    for provider in ("groq", "openai", "ollama"):
        normalized = LLMClient._normalize_openai_messages(
            SimpleNamespace(provider=provider, model="llama-3.3-70b-versatile"),
            _msg_with_reasoning(),
        )
        assert "reasoning_content" not in normalized[0], provider
        assert normalized[0]["content"] == ""
