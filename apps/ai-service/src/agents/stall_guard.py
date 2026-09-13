"""Hermes-grade Tool Loop & Stall Guard with Duplicate Result Stubbing.

Prevents models from entering runaway repetitive tool-call loops (e.g. repeated
failed searches or alternating between 2 tools) and stubs duplicate large results
to conserve context tokens.
"""

from __future__ import annotations

import json
from typing import Any
import structlog

logger = structlog.get_logger(__name__)


class ToolLoopGuard:
    """Monitors per-turn tool calls, detects loops and stalls, and stubs duplicate results."""

    def __init__(self, identical_threshold: int = 2, max_history: int = 16) -> None:
        self.identical_threshold = identical_threshold
        self.max_history = max_history
        self._call_history: list[str] = []  # List of signatures
        self._seen_results: dict[str, str] = {}  # signature -> result hash/summary

    def _normalize_args(self, args: Any) -> str:
        if isinstance(args, str):
            try:
                parsed = json.loads(args)
                return json.dumps(parsed, sort_keys=True)
            except Exception:
                return args.strip()
        if isinstance(args, dict):
            return json.dumps(args, sort_keys=True)
        return str(args)

    def check_call(self, tool_name: str, args: Any) -> tuple[bool, str | None]:
        """Check if calling this tool constitutes an infinite loop or stall.
        Returns: (is_loop, halt_reason)
        """
        signature = f"{tool_name}:{self._normalize_args(args)}"
        self._call_history.append(signature)
        if len(self._call_history) > self.max_history:
            self._call_history.pop(0)

        # 1. Check identical streak (last N calls identical)
        if len(self._call_history) >= self.identical_threshold:
            last_n = self._call_history[-self.identical_threshold:]
            if all(s == signature for s in last_n):
                logger.warning("stall_guard_identical_call_loop_detected", tool=tool_name, streak=self.identical_threshold)
                return True, (
                    f"تنبيه توقف برمجي (Stall Guard): تم استدعاء أداة [{tool_name}] "
                    f"{self.identical_threshold} مرات متتالية بنفس المعطيات تماماً دون إحراز تقدم. "
                    f"توقف عن إعادة استدعاء هذه الأداة فوراً، وقم بصياغة إجابتك وتحليلك النهائي للتاجر بناءً على المعطيات المتوفرة لديك."
                )

        # 2. Check 2-cycle oscillation (A -> B -> A -> B)
        if len(self._call_history) >= 4:
            c1, c2, c3, c4 = self._call_history[-4:]
            if c1 == c3 and c2 == c4 and c1 != c2:
                logger.warning("stall_guard_oscillating_cycle_detected", cycle=[c1, c2])
                return True, (
                    f"تنبيه حلقة ترددية (Oscillation Guard): تم اكتشاف حلقة تبادلية متكررة بين الأدوات. "
                    f"توقف عن استدعاء الأدوات وصغ خلاصة تحليلك للتاجر مباشرة."
                )

        return False, None

    def stub_if_duplicate(self, tool_name: str, args: Any, result: Any) -> Any:
        """Hermes Duplicate Result Stubbing:
        If an identical result was already returned for this tool+args in the same turn,
        stub it with a reference note to save context tokens.
        """
        if not isinstance(result, (dict, list, str)):
            return result

        raw_str = json.dumps(result, ensure_ascii=False) if not isinstance(result, str) else result
        if len(raw_str) < 250:
            return result  # Short results don't waste tokens

        signature = f"{tool_name}:{self._normalize_args(args)}"
        if signature in self._seen_results:
            logger.info("stall_guard_stubbed_duplicate_result", tool=tool_name, original_length=len(raw_str))
            return {
                "notice": f"[Duplicate tool output pruned by Hermes Compactor: identical to earlier call to {tool_name}]",
                "status": "cached_duplicate",
                "item_count": len(result) if isinstance(result, list) else 1,
            }

        self._seen_results[signature] = raw_str[:128]
        return result
