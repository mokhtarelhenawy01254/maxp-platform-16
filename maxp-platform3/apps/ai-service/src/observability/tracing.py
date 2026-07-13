from __future__ import annotations

import structlog
from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor

from src.config import get_settings
from src.observability.agent_runtime import setup_agent_runtime_observability

logger = structlog.get_logger(__name__)


def setup_tracing(app, engine=None) -> None:
    settings = get_settings()
    otlp_endpoint = getattr(settings, "otlp_endpoint", None)
    setup_agent_runtime_observability()

    if not otlp_endpoint:
        logger.info("OpenTelemetry disabled (no OTLP_ENDPOINT configured)")
        return

    resource = Resource.create({
        "service.name": "maxp-ai-service",
        "service.version": settings.version,
        "deployment.environment": settings.environment,
    })

    provider = TracerProvider(resource=resource)
    exporter = OTLPSpanExporter(endpoint=otlp_endpoint)
    processor = BatchSpanProcessor(exporter)
    provider.add_span_processor(processor)
    trace.set_tracer_provider(provider)

    FastAPIInstrumentor.instrument_app(app)

    HTTPXClientInstrumentor().instrument()

    if engine:
        SQLAlchemyInstrumentor().instrument(engine=engine.sync_engine)

    logger.info("OpenTelemetry tracing enabled", endpoint=otlp_endpoint)
