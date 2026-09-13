"""Unit tests for Hermes ToolLoopGuard and Duplicate Result Stubbing."""

import pytest
from src.agents.stall_guard import ToolLoopGuard


def test_normal_calls_not_halted():
    guard = ToolLoopGuard(identical_threshold=2)
    is_loop, reason = guard.check_call("product_search", {"query": "shoes"})
    assert not is_loop
    assert reason is None

    is_loop, reason = guard.check_call("product_search", {"query": "shirts"})
    assert not is_loop
    assert reason is None


def test_identical_call_loop_detected():
    guard = ToolLoopGuard(identical_threshold=2)
    guard.check_call("product_search", {"query": "dash"})
    is_loop, reason = guard.check_call("product_search", {"query": "dash"})
    assert is_loop
    assert "Stall Guard" in reason
    assert "product_search" in reason


def test_oscillating_cycle_loop_detected():
    guard = ToolLoopGuard(identical_threshold=3)
    guard.check_call("tool_a", {"x": 1})
    guard.check_call("tool_b", {"y": 2})
    guard.check_call("tool_a", {"x": 1})
    is_loop, reason = guard.check_call("tool_b", {"y": 2})
    assert is_loop
    assert "Oscillation Guard" in reason


def test_duplicate_large_result_stubbed():
    guard = ToolLoopGuard()
    large_payload = [{"id": i, "name": f"Product {i}" * 10} for i in range(20)]
    
    # First call stores result
    res1 = guard.stub_if_duplicate("catalog_list", {"cat": "all"}, large_payload)
    assert res1 == large_payload  # Unmodified

    # Second call stubs duplicate
    res2 = guard.stub_if_duplicate("catalog_list", {"cat": "all"}, large_payload)
    assert isinstance(res2, dict)
    assert res2.get("status") == "cached_duplicate"
    assert "Hermes Compactor" in res2.get("notice", "")
