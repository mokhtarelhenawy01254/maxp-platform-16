from __future__ import annotations

import asyncio
import logging
import os
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.agents.loader import seed_templates
from src.api.a2a import router as a2a_router
from src.api.admin import router as admin_router
from src.api.approvals import router as approvals_router
from src.api.billing import router as billing_router
from src.api.knowledge_questions import router as knowledge_questions_router
from src.api.channels.whatsapp import router as whatsapp_router
from src.api.chat import router as chat_router
from src.api.health import router as health_router
from src.api.mcp import router as mcp_router
from src.api.middleware import (
    RateLimitMiddleware,
    ServiceAuthMiddleware,
    TenantMiddleware,
    ThreadConcurrencyMiddleware,
)
from src.api.resume import router as resume_router
from src.config import Settings, get_settings
from src.db import session as db_session
from src.db.session import close_db, get_session, init_db
from src.mcp_integration.registry import get_mcp_registry
from src.observability.errors import setup_error_handlers
from src.observability.metrics import setup_metrics
from src.observability.sentry import setup_sentry
from src.observability.tracing import setup_tracing
from src.services.agent_registry import init_registry_from_db
from src.services.redis_client import redis_client
from src.skills import seed_skills


def configure_logging(log_level: str) -> None:
    level = getattr(logging, log_level.upper(), logging.INFO)
    logging.basicConfig(
        level=level,
        format="%(message)s",
        force=True,
        handlers=[logging.StreamHandler()],
    )
    log_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "logs")
    os.makedirs(log_dir, exist_ok=True)
    log_file = open(os.path.join(log_dir, "structlog.log"), "a", encoding="utf-8")
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
        logger_factory=structlog.WriteLoggerFactory(file=log_file),
        cache_logger_on_first_use=True,
    )


def create_app(settings: Settings | None = None) -> FastAPI:
    if settings is None:
        settings = get_settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        configure_logging(settings.log_level)
        from src.agents.role_registry import validate_all
        validation_errors = validate_all()
        if validation_errors:
            structlog.get_logger().error("role_registry_startup_check_failed", errors=validation_errors)
            if not os.getenv("PYTEST_CURRENT_TEST"):
                raise RuntimeError(f"Role Registry startup validation failed: {validation_errors}")
        await init_db()

        # Observability
        setup_sentry()
        setup_tracing(app)

        # Redis connection (graceful if unavailable)
        await redis_client.connect()

        # Background working-memory session cleanup (every 30 minutes)
        from src.memory.working_memory import working_memory_service
        _cleanup_task: asyncio.Task | None = None

        async def _run_cleanup():
            while True:
                await asyncio.sleep(1800)
                try:
                    n = await working_memory_service.cleanup_expired_sessions()
                    if n:
                        structlog.get_logger().info("cleaned_expired_sessions", count=n)
                except Exception as exc:
                    structlog.get_logger().warning("cleanup_failed", error=str(exc))
        _cleanup_task = asyncio.create_task(_run_cleanup())

        # MCP server discovery
        try:
            mcp_registry = get_mcp_registry()
            await mcp_registry.register_from_config()
        except Exception as exc:
            log = structlog.get_logger()
            log.warning("MCP registration skipped", error=str(exc))

        if os.getenv("PYTEST_CURRENT_TEST"):
            log = structlog.get_logger()
            log.info("Skipping startup template/skill seeding during pytest")
        else:
            # Seed filesystem templates and skills before rebuilding the runtime registry.
            async for session in get_session():
                await seed_templates(session)
                await seed_skills(session)

            if db_session.async_session:
                await init_registry_from_db(db_session.async_session)

        # Register skills for the new skill-based pipeline
        from src.skills.register_all import register_all_skills
        register_all_skills()

        log = structlog.get_logger()
        log.info(
            "Starting maxp-ai-service",
            version=settings.version,
            environment=settings.environment,
        )
        yield
        if _cleanup_task:
            _cleanup_task.cancel()
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
    app.include_router(billing_router)
    app.include_router(chat_router)
    app.include_router(resume_router)
    app.include_router(mcp_router)
    app.include_router(approvals_router)
    app.include_router(knowledge_questions_router)
    app.include_router(whatsapp_router)
    app.include_router(a2a_router)
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
