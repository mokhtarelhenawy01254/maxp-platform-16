from __future__ import annotations

import json
import os
from pathlib import Path

import structlog

from src.config import get_settings

logger = structlog.get_logger(__name__)

_WINDOW_SIZE = 10
_FAILURE_THRESHOLD = 0.05
_STATE_FILE = Path(os.environ.get("PARSER_ROLLBACK_STATE_FILE", "/tmp/parser_rollback_state.json"))

_state: dict[str, dict] = {}


def _key(parser: str, provider: str) -> str:
    return f"{parser}:{provider}"


def _load() -> None:
    if _state:
        return
    try:
        if _STATE_FILE.exists():
            with open(_STATE_FILE) as f:
                data = json.load(f)
            _state.update(data)
    except Exception as exc:
        logger.warning("rollback_state_load_failed", error=str(exc))


def _save() -> None:
    try:
        _STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(_STATE_FILE, "w") as f:
            json.dump(_state, f)
    except Exception as exc:
        logger.warning("rollback_state_save_failed", error=str(exc))


def record_success(parser: str, provider: str) -> None:
    _load()
    k = _key(parser, provider)
    s = _state.setdefault(k, {"attempts": 0, "failures": 0, "disabled": False})
    s["attempts"] += 1
    if s["attempts"] > _WINDOW_SIZE * 2:
        s["attempts"] = _WINDOW_SIZE
    _save()


def record_failure(parser: str, provider: str) -> None:
    _load()
    k = _key(parser, provider)
    s = _state.setdefault(k, {"attempts": 0, "failures": 0, "disabled": False})
    s["attempts"] += 1
    s["failures"] += 1
    if s["attempts"] >= _WINDOW_SIZE:
        rate = s["failures"] / s["attempts"]
        if rate > _FAILURE_THRESHOLD and not s["disabled"]:
            s["disabled"] = True
            logger.error(
                "parser_auto_disabled",
                parser=parser,
                provider=provider,
                failure_rate=round(rate, 3),
                attempts=s["attempts"],
                failures=s["failures"],
            )
    _save()


def is_disabled(parser: str, provider: str) -> bool:
    _load()
    s = _state.get(_key(parser, provider))
    return s["disabled"] if s else False


def reset() -> None:
    _state.clear()
    _save()


def status() -> dict:
    _load()
    return dict(_state)
