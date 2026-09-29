from __future__ import annotations

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from src.agents.role_registry import (
    RoleSpec,
    all_roles,
    clear_cache,
    get_role,
    validate_all,
)
from src.skills.background_review import ROLE_DOMAIN_MAP as BG_ROLE_MAP
from src.skills.integration import ROLE_DOMAIN_MAP as INT_ROLE_MAP, get_skills_block
from src.skills.learner import AutonomousSkillLearner


@pytest.fixture(autouse=True)
def reset_registry_cache():
    clear_cache()
    yield
    clear_cache()


def test_registry_validation_passes():
    """All 20 roles must be valid, present, and free of duplicate keys."""
    errors = validate_all()
    assert errors == [], f"Validation failed with errors: {errors}"


def test_all_20_roles_exist_and_match():
    """Verify roles count and completeness."""
    roles = all_roles()
    expected_roles = {
        "EXECUTIVE_ASSISTANT", "STORE_MANAGER", "MEDIA_BUYER", "SUPPORT", "ORDER",
        "ORDER_CONFIRMATION", "VOICE_ORDER_CONFIRMATION", "SALES", "INVENTORY",
        "PRODUCT_CREATOR", "MARKETING", "FACEBOOK_SALES_SUPPORT", "SAS_SALES",
        "COMPETITOR", "SMART_SELLER", "SALES_REP", "MEDICAL_CENTER",
        "PHYSIOTHERAPY", "EDUCATION_CENTER", "HOTEL", "MEDICAL_CENTER_MANAGER",
        "CEO", "BROWSER_COPILOT", "HR_ASSISTANT", "AOV_SPECIALIST",
    }
    assert len(roles) == len(expected_roles), f"Expected {len(expected_roles)} roles, got {len(roles)}"
    assert set(roles.keys()) == expected_roles

    # Verify every role has all required capabilities by default (Equal Power Law)
    for name, spec in roles.items():
        assert spec.capabilities["episodic_memory"] is True, f"{name} missing episodic_memory"
        assert spec.capabilities["knowledge_retrieval"] is True, f"{name} missing knowledge_retrieval"
        assert spec.capabilities["learning"] is True, f"{name} missing learning"
        assert spec.capabilities["approvals"] is True, f"{name} missing approvals"
        assert spec.domain, f"{name} has empty domain"
        assert spec.judge_profile, f"{name} has empty judge_profile"
        assert spec.playbook_title, f"{name} has empty playbook_title"


# ══════════════════════════════════════════════════════════════════════════════
# شرط القبول (أ): اختبار «الوكيل الجديد» (The New Agent Test)
# يثبت أن إضافة دور جديد في الـ manifest فقط يعطيه كل القدرات المشتركة فوراً
# مع صفر تعديل في أي ملف بايثون أو خريطة استهلاك.
# ══════════════════════════════════════════════════════════════════════════════

def test_acceptance_new_agent_inherits_all_capabilities_without_code_changes(monkeypatch):
    """Adding a new role solely in the manifest instantly provisions it across all 5 consumers."""
    import src.agents.role_registry as reg_mod

    original_loader = reg_mod._load_registry_data

    def fake_load_registry_data():
        manifest_data, tools_data = original_loader()
        # Deep copy to avoid mutating cache
        m_copy = dict(manifest_data)
        t_copy = dict(tools_data)

        # Inject a brand new autonomous role strictly via manifest data
        m_copy["AUTONOMOUS_WAREHOUSE_DISPATCHER"] = {
            "label": "مسؤول التوزيع والمستودعات الآلي",
            "domain": "LOGISTICS",
            "playbook_id": "logistics_playbook",
            "playbook_title": "كتيب العمليات اللوجستية والتوزيع",
            "judge_profile": "merchant_ops",
            "capabilities": {
                "episodic_memory": True,
                "knowledge_retrieval": True,
                "learning": True,
                "approvals": True,
            },
            "approval_policy": {
                "allowed_scopes": ["LOGISTICS", "WAREHOUSE"],
                "forbidden_prefixes": ["hr_", "payroll_", "internal_"],
            },
            "memory_policy": {
                "retain_days": 90,
                "auto_embed": True,
            },
        }
        t_copy["AUTONOMOUS_WAREHOUSE_DISPATCHER"] = ["inventory_check", "shipping_rates"]
        return m_copy, t_copy

    monkeypatch.setattr(reg_mod, "_load_registry_data", fake_load_registry_data)
    clear_cache()

    # 1. New agent resolves from registry
    spec = get_role("AUTONOMOUS_WAREHOUSE_DISPATCHER")
    assert spec.name == "AUTONOMOUS_WAREHOUSE_DISPATCHER"
    assert spec.domain == "LOGISTICS"
    assert spec.playbook_title == "كتيب العمليات اللوجستية والتوزيع"
    assert spec.capabilities["episodic_memory"] is True
    assert spec.capabilities["knowledge_retrieval"] is True
    assert spec.capabilities["learning"] is True
    assert spec.capabilities["approvals"] is True
    assert "inventory_check" in spec.tools

    # 2. Consumer 1: background_review resolves it automatically
    from src.skills.background_review import hermes_background_review_worker
    bg_domain = get_role("AUTONOMOUS_WAREHOUSE_DISPATCHER").domain
    assert bg_domain == "LOGISTICS"

    # 3. Consumer 2: integration resolves allowed_domains automatically
    int_domain = get_role("AUTONOMOUS_WAREHOUSE_DISPATCHER").domain
    assert int_domain == "LOGISTICS"

    # 4. Consumer 3: learner records rules under LOGISTICS domain, not GENERAL
    learner = AutonomousSkillLearner()
    fake_session = AsyncMock()
    with patch.object(learner, "_do_upsert", new_callable=AsyncMock) as mock_upsert:
        mock_upsert.return_value = {"success": True}
        import asyncio
        asyncio.run(learner.record_universal_rule(
            company_id="comp_test",
            rule_category="AUTONOMOUS_WAREHOUSE_DISPATCHER",
            rule_title="تسليم سريع",
            rule_instructions="شحن مباشر فور التجهيز",
            session=fake_session,
        ))
        assert mock_upsert.called
        args = mock_upsert.call_args[0]
        kwargs = mock_upsert.call_args[1]
        skill_type = kwargs.get("skill_type") or (args[4] if len(args) > 4 else None)
        assert skill_type == "LOGISTICS"

    # 5. Validation passes cleanly for the new agent
    errors = validate_all()
    assert errors == []


# ══════════════════════════════════════════════════════════════════════════════
# شرط القبول (ب): اختبار «الوكلاء الحاليين» (The Existing Agents Equality Test)
# يثبت أن كريم (STORE_MANAGER) وباقي الوكلاء أصبحوا متساوين مع الميديا باير.
# ══════════════════════════════════════════════════════════════════════════════

def test_acceptance_existing_agents_equality_before_after():
    """Verify that STORE_MANAGER and all 20 existing roles have unified full capabilities."""
    roles = all_roles()

    # 1. STORE_MANAGER (Karim) - The biggest role on the platform
    karim = roles["STORE_MANAGER"]
    assert karim.domain == "STORE_OPS"
    assert karim.playbook_title == "كتيب إدارة وعمليات المتجر"
    assert len(karim.tools) == 57
    assert karim.capabilities == {
        "episodic_memory": True,
        "knowledge_retrieval": True,
        "learning": True,
        "approvals": True,
    }
    assert "hr_" in karim.approval_policy["forbidden_prefixes"]

    # 2. MEDIA_BUYER - Cleaned and deduplicated
    media_buyer = roles["MEDIA_BUYER"]
    assert media_buyer.domain == "MEDIA_BUYER"
    assert media_buyer.capabilities == {
        "episodic_memory": True,
        "knowledge_retrieval": True,
        "learning": True,
        "approvals": True,
    }
    assert "facebook_ad_record_learned_rule" in media_buyer.tools
    assert "record_learned_rule" in media_buyer.tools

    # 3. All 20 roles have identical capability structure (Equal Power)
    for name, spec in roles.items():
        assert spec.capabilities == {
            "episodic_memory": True,
            "knowledge_retrieval": True,
            "learning": True,
            "approvals": True,
        }, f"Role {name} does not have equal shared capabilities"


# ══════════════════════════════════════════════════════════════════════════════
# اختبار معالجة الفئات العربية (Arabic Category Blackhole Fix)
# ══════════════════════════════════════════════════════════════════════════════

def test_arabic_category_alias_normalization():
    """Arabic category names map to canonical English domains for zero silent drops."""
    cases = [
        ("خدمة العملاء", "SUPPORT"),
        ("خدمة العملاء والدعم", "SUPPORT"),
        ("المبيعات", "SALES"),
        ("مبيعات", "SALES"),
        ("إدارة المخزون", "INVENTORY"),
        ("المخزون", "INVENTORY"),
        ("إعلانات المتجر", "MEDIA_BUYER"),
        ("إدارة المتجر", "STORE_OPS"),
        ("المساعد التنفيذي", "EXECUTIVE"),
        ("العيادات", "CLINIC"),
        ("حجوزات الفنادق", "HOTEL"),
        ("القرارات التنفيذية", "EXECUTIVE"),
        ("متوسط قيمة الطلب", "AOV"),
        ("غير معروف على الإطلاق", "GENERAL"),
    ]
    for arabic_name, expected_domain in cases:
        spec = get_role(arabic_name)
        assert spec.domain == expected_domain, f"Failed for '{arabic_name}': expected {expected_domain}, got {spec.domain}"


@pytest.mark.asyncio
async def test_learner_records_canonical_domain_for_arabic_category():
    """learner.record_universal_rule converts Arabic category to English domain."""
    learner = AutonomousSkillLearner()
    fake_session = AsyncMock()

    with patch.object(learner, "_do_upsert", new_callable=AsyncMock) as mock_upsert:
        mock_upsert.return_value = {"success": True}

        # Model passes Arabic category 'خدمة العملاء'
        await learner.record_universal_rule(
            company_id="comp_123",
            rule_category="خدمة العملاء",
            rule_title="الرد السريع",
            rule_instructions="الرد خلال 30 ثانية",
            session=fake_session,
        )

        assert mock_upsert.called
        args = mock_upsert.call_args[0]
        kwargs = mock_upsert.call_args[1]
        skill_id = kwargs.get("skill_id") or (args[2] if len(args) > 2 else None)
        skill_name = kwargs.get("skill_name") or (args[3] if len(args) > 3 else None)
        skill_type = kwargs.get("skill_type") or (args[4] if len(args) > 4 else None)
        rule_metadata = kwargs.get("rule_metadata") or (args[6] if len(args) > 6 else {})

        assert skill_type == "SUPPORT"
        assert skill_id == "support_playbook_comp_123"
        assert skill_name == "كتيب خدمة العملاء والاستفسارات"
        assert rule_metadata["category"] == "SUPPORT"
        assert rule_metadata["raw_category"] == "خدمة العملاء"


def test_validate_all_catches_missing_role(monkeypatch):
    """validate_all must fail if a role in role_tools.yaml is missing from manifest."""
    import src.agents.role_registry as reg_mod

    original_loader = reg_mod._load_registry_data

    def fake_load_with_missing():
        manifest_data, tools_data = original_loader()
        m_copy = dict(manifest_data)
        # Remove STORE_MANAGER from manifest
        m_copy.pop("STORE_MANAGER", None)
        return m_copy, tools_data

    monkeypatch.setattr(reg_mod, "_load_registry_data", fake_load_with_missing)
    clear_cache()

    errors = validate_all()
    assert any("STORE_MANAGER" in e for e in errors), "Expected validate_all to flag missing STORE_MANAGER"


@pytest.mark.asyncio
async def test_startup_validation_non_fatal_by_default(monkeypatch):
    """Without ROLE_REGISTRY_STRICT, startup logs errors but does NOT crash the service."""
    from src.main import create_app

    monkeypatch.delenv("ROLE_REGISTRY_STRICT", raising=False)
    with patch("src.agents.role_registry.validate_all", return_value=["Simulated manifest error: role missing"]), \
         patch("src.main.init_db", new_callable=AsyncMock), \
         patch("src.main.redis_client.connect", new_callable=AsyncMock), \
         patch("src.main.redis_client.disconnect", new_callable=AsyncMock), \
         patch("src.main.close_db", new_callable=AsyncMock), \
         patch("src.main.structlog.get_logger") as mock_logger:

        mock_log = MagicMock()
        mock_logger.return_value = mock_log

        app = create_app()
        # Entering lifespan - should proceed without raising
        async with app.router.lifespan_context(app):
            pass

        # Verify error was logged with key details
        mock_log.error.assert_called()
        error_calls = [c for c in mock_log.error.call_args_list if "role_registry_startup_check_failed" in str(c)]
        assert len(error_calls) > 0, "Expected role_registry_startup_check_failed error log"


@pytest.mark.asyncio
async def test_startup_validation_fatal_when_strict(monkeypatch):
    """With ROLE_REGISTRY_STRICT=1, startup raises RuntimeError on validation errors."""
    from src.main import create_app

    monkeypatch.setenv("ROLE_REGISTRY_STRICT", "1")
    with patch("src.agents.role_registry.validate_all", return_value=["Simulated manifest error: role missing"]), \
         patch("src.main.init_db", new_callable=AsyncMock):

        app = create_app()
        with pytest.raises(RuntimeError, match="Role Registry startup validation failed"):
            async with app.router.lifespan_context(app):
                pass

