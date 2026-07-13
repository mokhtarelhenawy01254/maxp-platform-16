from __future__ import annotations

from src.llm.tool_parsers.rollback import is_disabled, record_failure, record_success, reset, status


def setup_function():
    reset()


def test_starts_enabled():
    assert is_disabled("gemma4", "GOOGLE") is False


def test_success_keeps_enabled():
    for _ in range(20):
        record_success("ds", "DEEPSEEK")
    assert is_disabled("ds", "DEEPSEEK") is False


def test_failure_rate_below_threshold():
    for _ in range(19):
        record_success("p", "PROVIDER")
    record_failure("p", "PROVIDER")
    assert is_disabled("p", "PROVIDER") is False


def test_failure_rate_above_threshold_disables():
    for _ in range(10):
        record_failure("p", "PROVIDER")
    assert is_disabled("p", "PROVIDER") is True


def test_separate_parsers_independent():
    record_failure("bad", "P1")
    record_success("good", "P2")
    for _ in range(10):
        record_failure("bad", "P1")
    assert is_disabled("bad", "P1") is True
    assert is_disabled("good", "P2") is False


def test_reset_clears_state():
    for _ in range(10):
        record_failure("p", "PROVIDER")
    assert is_disabled("p", "PROVIDER") is True
    reset()
    assert is_disabled("p", "PROVIDER") is False


def test_status_returns_state():
    record_failure("p", "PROVIDER")
    s = status()
    assert "p:PROVIDER" in s
