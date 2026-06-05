from __future__ import annotations

import json
from pathlib import Path

_TRANSLATIONS: dict[str, dict[str, str]] = {}
_LOADED = False


def _load_translations() -> None:
    global _LOADED
    i18n_dir = Path(__file__).parent
    for file_path in sorted(i18n_dir.glob("*.json")):
        locale = file_path.stem
        with open(file_path, encoding="utf-8") as f:
            _TRANSLATIONS[locale] = json.load(f)
    _LOADED = True


def t(key: str, locale: str = "ar", **kwargs: str) -> str:
    if not _LOADED:
        _load_translations()
    translation = _TRANSLATIONS.get(locale, {}).get(key)
    if translation is None:
        translation = _TRANSLATIONS.get("en", {}).get(key, key)
    if kwargs:
        translation = translation.format(**kwargs)
    return translation
