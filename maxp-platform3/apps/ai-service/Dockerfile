# syntax=docker/dockerfile:1.7

FROM python:3.12-slim AS builder

ENV UV_PROJECT_ENVIRONMENT=/app/.venv \
    UV_LINK_MODE=copy \
    UV_COMPILE_BYTECODE=1

RUN pip install --no-cache-dir uv

WORKDIR /app

COPY pyproject.toml README.md ./

RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --no-dev --prerelease=allow --extra agents


FROM python:3.12-slim AS runtime

ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        curl \
        tini && \
    rm -rf /var/lib/apt/lists/* && \
    groupadd --system --gid 1000 app && \
    useradd  --system --uid 1000 --gid app --home /app --shell /sbin/nologin app && \
    mkdir -p /app && chown app:app /app

WORKDIR /app

COPY --from=builder --chown=app:app /app/.venv /app/.venv
COPY --chown=app:app src        /app/src
COPY --chown=app:app migrations /app/migrations
COPY --chown=app:app alembic.ini /app/alembic.ini
COPY --chown=app:app pyproject.toml uv.lock /app/

USER app

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl --fail --silent http://localhost:8000/health || exit 1

ENTRYPOINT ["tini", "--"]
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
