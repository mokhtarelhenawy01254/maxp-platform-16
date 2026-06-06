from __future__ import annotations

import json
from pathlib import Path

from src.intent.schema import INTENT_CONFIGURED_TOOLS, INTENT_ENUM, get_policy


def test_intent_eval_suite_targets_valid_policies_and_tools():
    cases = json.loads((Path(__file__).with_name("intent_golden_cases.json")).read_text())

    assert cases
    for case in cases:
        expected_intent = case["expected_intent"]
        expected_tool = case["expected_primary_tool"]
        config = INTENT_CONFIGURED_TOOLS.get(expected_intent)

        assert expected_intent in INTENT_ENUM
        assert get_policy(expected_intent)["actionType"]
        assert config is not None
        assert config["primaryTool"] == expected_tool
        assert expected_tool in config["allowedTools"]
