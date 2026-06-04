from __future__ import annotations

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.agents.loader import seed_templates
from src.api.admin import router as admin_router
from src.api.chat import router as chat_router
from src.api.health import router as health_router
from src.api.middleware import (
    RateLimitMiddleware,
    ServiceAuthMiddleware,
    TenantMiddleware,
    ThreadConcurrencyMiddleware,
)
from src.api.resume import router as resume_router
from src.config import Settings, get_settings
from src.db.session import async_session, close_db, get_session, init_db
from src.mcp.registry import get_mcp_registry
from src.observability.errors import setup_error_handlers
from src.observability.metrics import setup_metrics
from src.observability.sentry import setup_sentry
from src.observability.tracing import setup_tracing
from src.services.agent_registry import init_registry_from_db
from src.services.redis_client import redis_client


def configure_logging(log_level: str) -> None:
    level = getattr(logging, log_level.upper(), logging.INFO)
    logging.basicConfig(
        level=level,
        format="%(message)s",
        force=True,
        handlers=[logging.StreamHandler()],
    )
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso", utc=True),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(level),
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )


def create_app(settings: Settings | None = None) -> FastAPI:
    if settings is None:
        settings = get_settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        configure_logging(settings.log_level)
        await init_db()

        # Observability
        setup_sentry()
        setup_tracing(app)

        # Redis connection (graceful if unavailable)
        await redis_client.connect()

        # MCP server discovery
        try:
            mcp_registry = get_mcp_registry()
            await mcp_registry.register_from_config()
        except Exception as exc:
            log = structlog.get_logger()
            log.warning("MCP registration skipped", error=str(exc))

        # Seed filesystem templates before rebuilding the runtime registry.
        async for session in get_session():
            await seed_templates(session)

        if async_session:
            await init_registry_from_db(async_session)

        log = structlog.get_logger()
        log.info(
            "Starting maxp-ai-service",
            version=settings.version,
            environment=settings.environment,
        )
        yield
        await redis_client.disconnect()
        await close_db()
        log.info("Shutting down maxp-ai-service", version=settings.version)

    app = FastAPI(
        title="MaxP AI Service",
        version=settings.version,
        debug=settings.debug,
        lifespan=lifespan,
    )

    # Metrics (always enabled)
    setup_metrics(app)

    if settings.cors_origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=settings.cors_origins,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    app.add_middleware(ServiceAuthMiddleware)
    app.add_middleware(TenantMiddleware)
    app.add_middleware(RateLimitMiddleware)
    app.add_middleware(ThreadConcurrencyMiddleware)

    app.include_router(health_router)
    app.include_router(chat_router)
    app.include_router(resume_router)
    app.include_router(admin_router, prefix="/admin")

    setup_error_handlers(app)

    @app.get("/")
    async def root() -> dict[str, str]:
        return {
            "service": settings.app_name,
            "version": settings.version,
            "status": "running",
        }

    return app


app = create_app()
