from __future__ import annotations

import pytest
from src.guardrails.merchant_rules import compute_cosine_similarity, MerchantRuleGuardrail
from src.guardrails.translator import GuardrailTranslator


def test_compute_cosine_similarity():
    # 1. Identical vectors
    vec_a = [1.0, 2.0, 3.0]
    vec_b = [1.0, 2.0, 3.0]
    assert abs(compute_cosine_similarity(vec_a, vec_b) - 1.0) < 1e-6

    # 2. Orthogonal vectors
    vec_c = [1.0, 0.0]
    vec_d = [0.0, 1.0]
    assert abs(compute_cosine_similarity(vec_c, vec_d) - 0.0) < 1e-6

    # 3. Empty or size mismatch
    assert compute_cosine_similarity([], [1.0]) == 0.0
    assert compute_cosine_similarity([1.0, 2.0], [1.0]) == 0.0


def test_merchant_rules_format_prompt():
    guardrail = MerchantRuleGuardrail()
    
    # Empty rules list
    assert guardrail.format_as_prompt_block([]) == ""

    # Formatted markdown table
    rules = [
        {
            "id": "1",
            "excuse": "طلب العميل خصماً إضافياً يوم الجمعة",
            "rebuttal": "يوم الجمعة هو يوم العروض الثابتة",
            "action": "وضح للعميل أن الجمعة يوم العروض الثابتة"
        }
    ]
    block = guardrail.format_as_prompt_block(rules)
    assert "MANDATORY BUSINESS RULES & CONSTRAINTS" in block
    assert "طلب العميل خصماً إضافياً يوم الجمعة" in block
    assert "يوم الجمعة هو يوم العروض الثابتة" in block


@pytest.mark.asyncio
async def test_guardrail_conflict_checking():
    translator = GuardrailTranslator()
    
    # 1. Rule with highly similar embedding (cosine sim = 1.0)
    new_embedding = [0.5, 0.5, 0.5]
    existing_rules = [
        {
            "id": "rule_1",
            "excuse": "Existing Excuse",
            "rebuttal": "Existing Rebuttal",
            "action": "Existing Action",
            "embedding": [0.5, 0.5, 0.5]
        }
    ]
    conflict = await translator.check_conflict(new_embedding, existing_rules, threshold=0.85)
    assert conflict is not None
    assert conflict["id"] == "rule_1"

    # 2. Rule with different embedding (orthogonal, cosine sim = 0.0)
    different_embedding = [1.0, 0.0]
    existing_rules_diff = [
        {
            "id": "rule_2",
            "excuse": "Different Excuse",
            "rebuttal": "Different Rebuttal",
            "action": "Different Action",
            "embedding": [0.0, 1.0]
        }
    ]
    no_conflict = await translator.check_conflict(different_embedding, existing_rules_diff, threshold=0.85)
    assert no_conflict is None
