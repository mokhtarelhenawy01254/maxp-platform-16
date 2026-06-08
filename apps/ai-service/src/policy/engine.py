"""
@module policy.engine
@description Policy Engine Guardrails - deterministic policy enforcement
outside the LLM to prevent policy violations.

Loads company-specific overrides from database (AiSetting table or equivalent).
Python counterpart to Node.js policyEnforcementEngine.js.

This module is pure business logic - no AI runtime dependency.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from typing import Any, Literal

DEFAULT_POLICIES: dict[str, Any] = {
    "maxDiscountPercent": 20,
    "maxRefundAmount": 500,
    "minProductPrice": 1,
    "maxPriceChangePercent": 30,
    "blockedActions": ["DELETE_PRODUCT", "DELETE_ORDER", "MODIFY_PAYMENT"],
    "requireApprovalAbove": 100,
    "maxDailyTransactions": 50,
}

BLOCKED_ACTIONS = frozenset(DEFAULT_POLICIES["blockedActions"])


@dataclass
class PolicyViolation:
    rule: str
    message: str
    severity: Literal["CRITICAL", "HIGH", "MEDIUM", "LOW"]
    requested: float | None = None
    limit: float | None = None


@dataclass
class PolicyWarning:
    rule: str
    message: str


@dataclass
class ValidationResult:
    allowed: bool
    violations: list[PolicyViolation]
    warnings: list[PolicyWarning]
    enforced_limits: dict[str, Any]


@dataclass
class DiscountValidation:
    valid: bool
    violation: PolicyViolation | None = None


@dataclass
class PriceChangeValidation:
    valid: bool
    violations: list[PolicyViolation] = field(default_factory=list)


class PolicyEngine:
    """
    Deterministic policy enforcement engine.
    Enforces business rules outside the LLM to prevent policy violations.
    """

    def __init__(self) -> None:
        self._company_policies: dict[str, dict[str, Any]] = {}
        self._daily_counts: dict[str, int] = {}

    async def load_company_policies(
        self, company_id: str, db_session: Any | None = None
    ) -> None:
        """
        Loads company-specific policies from the database.

        Args:
            company_id: Company identifier
            db_session: Optional SQLAlchemy session to query ai_setting table
        """
        overrides: dict[str, Any] = {}

        if db_session is not None:
            try:
                from sqlalchemy import text
                from sqlalchemy.exc import SQLAlchemyError

                result = await db_session.execute(
                    text("""
                        SELECT human_approval_required_for_write,
                               max_replies_per_customer,
                               write_tool_scopes
                        FROM ai.ai_setting
                        WHERE company_id = :company_id
                    """),
                    {"company_id": company_id},
                )
                row = result.fetchone()

                if row:
                    if not row.human_approval_required_for_write:
                        overrides["requireApprovalAbove"] = float("inf")
                    if row.max_replies_per_customer:
                        overrides["maxDailyTransactions"] = row.max_replies_per_customer * 10
                    if row.write_tool_scopes:
                        try:
                            import json
                            scopes = json.loads(row.write_tool_scopes)
                            if "blockedActions" in scopes:
                                overrides["blockedActions"] = scopes["blockedActions"]
                            if "maxDiscountPercent" in scopes:
                                overrides["maxDiscountPercent"] = scopes["maxDiscountPercent"]
                            if "maxRefundAmount" in scopes:
                                overrides["maxRefundAmount"] = scopes["maxRefundAmount"]
                            if "maxPriceChangePercent" in scopes:
                                overrides["maxPriceChangePercent"] = scopes["maxPriceChangePercent"]
                        except (json.JSONDecodeError, TypeError):
                            pass

                self._company_policies[company_id] = overrides

            except (SQLAlchemyError, Exception) as exc:
                import logging
                logging.getLogger(__name__).warning(
                    f"[PolicyEngine] Failed to load policies for {company_id}: {exc}"
                )
        else:
            self._company_policies[company_id] = overrides

    def get_company_policies(self, company_id: str) -> dict[str, Any]:
        """Get merged policies (defaults + company overrides)."""
        overrides = self._company_policies.get(company_id, {})
        return {**DEFAULT_POLICIES, **overrides}

    def set_company_policy(self, company_id: str, policy_overrides: dict[str, Any]) -> None:
        """Set policy overrides for a company (in-memory)."""
        existing = self._company_policies.get(company_id, {})
        self._company_policies[company_id] = {**existing, **policy_overrides}

    def validate_action(self, company_id: str, action: dict[str, Any]) -> ValidationResult:
        """
        Main validation function for an action.

        Args:
            company_id: Company identifier
            action: Action dict with type, params

        Returns:
            ValidationResult with allowed status, violations, warnings
        """
        policies = self.get_company_policies(company_id)
        violations: list[PolicyViolation] = []
        warnings: list[PolicyWarning] = []

        action_type = action.get("type")
        params = action.get("params", {})

        if action_type and action_type in policies.get("blockedActions", []):
            violations.append(PolicyViolation(
                rule="BLOCKED_ACTION",
                message=f'Action "{action_type}" is permanently blocked by policy',
                severity="CRITICAL",
            ))

        if params.get("discountPercent") is not None:
            discount_result = self.validate_discount(company_id, params["discountPercent"])
            if discount_result.violation:
                violations.append(discount_result.violation)

        original_price = params.get("originalPrice")
        new_price = params.get("newPrice")
        if original_price is not None and new_price is not None:
            price_result = self.validate_price_change(company_id, original_price, new_price)
            if price_result.violations:
                violations.extend(price_result.violations)

        if params.get("refundAmount") is not None:
            refund_result = self.validate_refund(company_id, params["refundAmount"])
            if refund_result.violation:
                violations.append(refund_result.violation)

        daily_count = self.get_daily_transaction_count(company_id)
        if daily_count >= policies.get("maxDailyTransactions", 50):
            violations.append(PolicyViolation(
                rule="DAILY_LIMIT_EXCEEDED",
                message=f'Daily transaction limit ({policies["maxDailyTransactions"]}) reached',
                severity="HIGH",
            ))

        tx_value = params.get("value") or params.get("amount") or 0
        if tx_value > policies.get("requireApprovalAbove", 100):
            warnings.append(PolicyWarning(
                rule="REQUIRES_APPROVAL",
                message=f"Transaction value {tx_value} exceeds auto-approval threshold {policies['requireApprovalAbove']}",
            ))

        return ValidationResult(
            allowed=len(violations) == 0,
            violations=violations,
            warnings=warnings,
            enforced_limits=policies,
        )

    def validate_discount(self, company_id: str, discount_percent: float) -> DiscountValidation:
        """Validate discount percentage against company policy."""
        policies = self.get_company_policies(company_id)
        max_discount = policies.get("maxDiscountPercent", 20)

        if discount_percent > max_discount:
            return DiscountValidation(
                valid=False,
                violation=PolicyViolation(
                    rule="MAX_DISCOUNT_EXCEEDED",
                    message=f"Discount {discount_percent}% exceeds max {max_discount}%",
                    severity="HIGH",
                    requested=discount_percent,
                    limit=max_discount,
                ),
            )
        return DiscountValidation(valid=True, violation=None)

    def validate_price_change(
        self, company_id: str, original_price: float, new_price: float
    ) -> PriceChangeValidation:
        """Validate price change against company policy."""
        policies = self.get_company_policies(company_id)
        violations: list[PolicyViolation] = []

        min_price = policies.get("minProductPrice", 1)
        if new_price < min_price:
            violations.append(PolicyViolation(
                rule="BELOW_PRICE_FLOOR",
                message=f"Price {new_price} below minimum {min_price}",
                severity="HIGH",
            ))

        if original_price > 0:
            change_percent = abs((new_price - original_price) / original_price) * 100
            max_change = policies.get("maxPriceChangePercent", 30)
            if change_percent > max_change:
                violations.append(PolicyViolation(
                    rule="MAX_PRICE_CHANGE_EXCEEDED",
                    message=f"Price change {change_percent:.1f}% exceeds max {max_change}%",
                    severity="HIGH",
                ))

        return PriceChangeValidation(valid=len(violations) == 0, violations=violations)

    def validate_refund(self, company_id: str, refund_amount: float) -> DiscountValidation:
        """Validate refund amount against company policy."""
        policies = self.get_company_policies(company_id)
        max_refund = policies.get("maxRefundAmount", 500)

        if refund_amount > max_refund:
            return DiscountValidation(
                valid=False,
                violation=PolicyViolation(
                    rule="MAX_REFUND_EXCEEDED",
                    message=f"Refund {refund_amount} exceeds max {max_refund}",
                    severity="HIGH",
                ),
            )
        return DiscountValidation(valid=True, violation=None)

    def is_blocked_action(self, action_type: str) -> bool:
        """Check if action type is globally blocked."""
        return action_type in BLOCKED_ACTIONS

    def _daily_key(self, company_id: str) -> str:
        """Generate daily count cache key."""
        return f"{company_id}:{date.today().isoformat()}"

    def get_daily_transaction_count(self, company_id: str) -> int:
        """Get current daily transaction count for company."""
        return self._daily_counts.get(self._daily_key(company_id), 0)

    def increment_transaction_count(self, company_id: str) -> int:
        """Increment and return new daily transaction count."""
        key = self._daily_key(company_id)
        current = self._daily_counts.get(key, 0)
        new_count = current + 1
        self._daily_counts[key] = new_count
        return new_count

    def reset(self) -> None:
        """Clear all in-memory policy cache and daily counts."""
        self._company_policies.clear()
        self._daily_counts.clear()


policy_engine = PolicyEngine()
