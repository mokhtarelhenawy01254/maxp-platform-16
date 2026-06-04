from __future__ import annotations

import sentry_sdk
import structlog
from sentry_sdk.integrations.fastapi import FastApiIntegration

from src.config import get_settings

logger = structlog.get_logger(__name__)


def setup_sentry() -> None:
    settings = get_settings()
    dsn = getattr(settings, "sentry_dsn", None)

    if not dsn:
        logger.info("Sentry disabled (no SENTRY_DSN configured)")
        return

    sentry_sdk.init(
        dsn=dsn,
        environment=settings.environment,
        release=settings.version,
        integrations=[
            FastApiIntegration(),
        ],
        traces_sample_rate=0.1,
        send_default_pii=False,
    )

    logger.info("Sentry enabled", environment=settings.environment)
