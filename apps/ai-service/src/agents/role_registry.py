from __future__ import annotations

import functools
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import structlog
import yaml

logger = structlog.get_logger(__name__)

MANIFEST_PATH = Path(__file__).parent / "roles.manifest.yaml"
TOOLS_PATH = Path(__file__).parent.parent / "tools" / "role_tools.yaml"

# Domain / Category alias mapping (including common Arabic names)
CATEGORY_DOMAIN_ALIASES: dict[str, str] = {
    "CUSTOMER_SUPPORT": "SUPPORT",
    "خدمة العملاء": "SUPPORT",
    "خدمة العملاء والدعم": "SUPPORT",
    "الدعم الفني": "SUPPORT",
    "خدمة عملاء": "SUPPORT",
    "SALES_CLOSING": "SALES",
    "المبيعات": "SALES",
    "مبيعات": "SALES",
    "إغلاق الصفقات": "SALES",
    "إدارة المخزون": "INVENTORY",
    "المخزون": "INVENTORY",
    "مخزون": "INVENTORY",
    "إعلانات المتجر": "MEDIA_BUYER",
    "الإعلانات": "MEDIA_BUYER",
    "إعلانات": "MEDIA_BUYER",
    "ميديا باير": "MEDIA_BUYER",
    "التسويق": "MARKETING",
    "تسويق": "MARKETING",
    "الطلبات": "OPERATIONS",
    "العمليات": "OPERATIONS",
    "طلبات": "OPERATIONS",
    "تأكيد الطلبات": "OPERATIONS",
    "OPERATIONS": "OPERATIONS",
    "العيادات": "CLINIC",
    "عيادات": "CLINIC",
    "مركز طبي": "CLINIC",
    "طبي": "CLINIC",
    "حجوزات الفنادق": "HOTEL",
    "فنادق": "HOTEL",
    "فندق": "HOTEL",
    "معمل الأسنان": "DENTAL_LAB",
    "DENTAL_LAB": "DENTAL_LAB",
    "القرارات التنفيذية": "EXECUTIVE",
    "تنفيذي": "EXECUTIVE",
    "المساعد التنفيذي": "EXECUTIVE",
    "EXECUTIVE_ASSISTANT": "EXECUTIVE",
    "ماكس": "EXECUTIVE",
    "إدارة المتجر": "STORE_OPS",
    "مدير المتجر": "STORE_OPS",
    "عام": "GENERAL",
    "قواعد عامة": "GENERAL",
    "الموارد البشرية": "HR",
    "شؤون الموظفين": "HR",
    "HR": "HR",
    "HR_ASSISTANT": "HR",
    "AOV_SPECIALIST": "AOV",
    "AOV": "AOV",
    "متوسط قيمة الطلب": "AOV",
    "زيادة متوسط الطلب": "AOV",
    "سلة المشتريات": "AOV",
}


@dataclass(frozen=True)
class RoleSpec:
    name: str
    label: str
    domain: str
    playbook_id: str
    playbook_title: str
    tools: tuple[str, ...]
    judge_profile: str
    capabilities: dict[str, Any]
    approval_policy: dict[str, Any]
    memory_policy: dict[str, Any]


@functools.lru_cache(maxsize=1)
def _load_registry_data() -> tuple[dict[str, Any], dict[str, list[str]]]:
    manifest_data: dict[str, Any] = {}
    if MANIFEST_PATH.exists():
        with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
            parsed = yaml.safe_load(f) or {}
            manifest_data = parsed.get("roles", {})

    tools_data: dict[str, list[str]] = {}
    if TOOLS_PATH.exists():
        with open(TOOLS_PATH, "r", encoding="utf-8") as f:
            parsed = yaml.safe_load(f) or {}
            tools_data = parsed.get("roles", {})

    return manifest_data, tools_data


def clear_cache() -> None:
    """Clear in-memory cached registry data (for testing and hot-reloading)."""
    if hasattr(_load_registry_data, "cache_clear"):
        _load_registry_data.cache_clear()
    if hasattr(all_roles, "cache_clear"):
        all_roles.cache_clear()


@functools.lru_cache(maxsize=1)
def all_roles() -> dict[str, RoleSpec]:
    manifest_roles, tools_roles = _load_registry_data()
    all_role_names = set(manifest_roles.keys()) | set(tools_roles.keys())
    result: dict[str, RoleSpec] = {}

    for name in all_role_names:
        m = manifest_roles.get(name, {})
        tools = tuple(tools_roles.get(name, []))
        domain = m.get("domain") or CATEGORY_DOMAIN_ALIASES.get(name.upper()) or name.upper()
        
        # SOTA rule: by default all shared capabilities are True unless explicitly restricted with reason
        raw_caps = m.get("capabilities", {})
        merged_caps = {
            "episodic_memory": raw_caps.get("episodic_memory", True),
            "knowledge_retrieval": raw_caps.get("knowledge_retrieval", True),
            "learning": raw_caps.get("learning", True),
            "approvals": raw_caps.get("approvals", True),
        }
        for k, v in raw_caps.items():
            if k not in merged_caps:
                merged_caps[k] = v

        spec = RoleSpec(
            name=name,
            label=m.get("label", name),
            domain=domain,
            playbook_id=m.get("playbook_id", f"{name.lower()}_playbook"),
            playbook_title=m.get("playbook_title", f"كتيب قواعد {name}"),
            tools=tools,
            judge_profile=m.get("judge_profile", "merchant_ops"),
            capabilities=merged_caps,
            approval_policy=m.get("approval_policy", {
                "allowed_scopes": ["GENERAL"],
                "forbidden_prefixes": ["hr_", "payroll_", "internal_"],
            }),
            memory_policy=m.get("memory_policy", {
                "retain_days": 90,
                "auto_embed": True,
            }),
        )
        result[name] = spec

    return result


def get_role(role_name: str | None) -> RoleSpec:
    if not role_name:
        role_name = "GENERAL"
    cleaned = str(role_name).strip()
    upper_name = cleaned.upper()

    roles = all_roles()
    if upper_name in roles:
        return roles[upper_name]

    # Check alias mapping (e.g. Arabic category names or CUSTOMER_SUPPORT -> SUPPORT)
    alias_target = CATEGORY_DOMAIN_ALIASES.get(cleaned) or CATEGORY_DOMAIN_ALIASES.get(upper_name)
    if alias_target:
        if alias_target in roles:
            return roles[alias_target]
        for candidate in roles.values():
            if candidate.domain.upper() == alias_target.upper():
                return candidate

    # Fallback for dynamic / ad-hoc roles
    return RoleSpec(
        name=upper_name,
        label=cleaned,
        domain="GENERAL",
        playbook_id=f"{cleaned.lower()}_playbook",
        playbook_title=f"كتيب قواعد {cleaned}",
        tools=(),
        judge_profile="merchant_ops",
        capabilities={
            "episodic_memory": True,
            "knowledge_retrieval": True,
            "learning": True,
            "approvals": True,
        },
        approval_policy={
            "allowed_scopes": ["GENERAL"],
            "forbidden_prefixes": ["hr_", "payroll_", "internal_"],
        },
        memory_policy={
            "retain_days": 90,
            "auto_embed": True,
        },
    )


def validate_all() -> list[str]:
    """Validate that role_tools.yaml and roles.manifest.yaml are in sync, complete, and fail-fast."""
    errors: list[str] = []

    # 1. Check duplicate role keys in role_tools.yaml
    if TOOLS_PATH.exists():
        with open(TOOLS_PATH, "r", encoding="utf-8") as f:
            lines = f.readlines()
        import re
        role_keys: list[str] = []
        for line in lines:
            m = re.match(r"^\s\s([A-Za-z0-9_]+):\s*$", line)
            if m:
                role_keys.append(m.group(1))
        seen = set()
        for rk in role_keys:
            if rk in seen:
                errors.append(f"Duplicate role key '{rk}' found in {TOOLS_PATH.name}")
            seen.add(rk)

    manifest_roles, tools_roles = _load_registry_data()

    # 2. Check all roles in role_tools.yaml exist in manifest, and vice versa
    for rk in tools_roles:
        if rk not in manifest_roles:
            errors.append(f"Role '{rk}' in {TOOLS_PATH.name} is missing from {MANIFEST_PATH.name}")
    for rk in manifest_roles:
        if rk not in tools_roles:
            errors.append(f"Role '{rk}' in {MANIFEST_PATH.name} is missing from {TOOLS_PATH.name}")

    # 3. Check all manifest roles have required fields and capabilities
    required_fields = ["domain", "judge_profile", "playbook_title", "capabilities"]
    required_capabilities = ["episodic_memory", "knowledge_retrieval", "learning", "approvals"]
    
    for rk, rmeta in manifest_roles.items():
        for field in required_fields:
            if field not in rmeta or not rmeta[field]:
                errors.append(f"Role '{rk}' in {MANIFEST_PATH.name} is missing required field '{field}'")
        
        caps = rmeta.get("capabilities", {})
        for cap in required_capabilities:
            if cap not in caps:
                errors.append(f"Role '{rk}' in {MANIFEST_PATH.name} is missing capability '{cap}'")
            elif caps[cap] is False and "exception_reason" not in caps:
                errors.append(
                    f"Role '{rk}' has disabled capability '{cap}' without mandatory 'exception_reason'"
                )

    if errors:
        logger.error("role_registry_validation_failed", error_count=len(errors), errors=errors)
    else:
        logger.info("role_registry_validation_passed", total_roles=len(manifest_roles))

    return errors
