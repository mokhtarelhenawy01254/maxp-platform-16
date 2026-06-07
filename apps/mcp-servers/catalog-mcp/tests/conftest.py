from __future__ import annotations

import os
import socket
import threading
import time
from collections.abc import Iterator

import pytest

os.environ.setdefault("MAXP_API_URL", "http://localhost:3007")
os.environ.setdefault("MAXP_SERVICE_TOKEN", "test-service-token")

import logging

from maxp_mcp_catalog.backend_client import MaxPBackendClient
from maxp_mcp_catalog.server import _build_server


@pytest.fixture(autouse=True)
def _silence_uvicorn() -> Iterator[None]:
    for name in ("uvicorn", "uvicorn.error", "uvicorn.access", "mcp.server.streamable_http"):
        logging.getLogger(name).setLevel(logging.ERROR)
    yield
    for name in ("uvicorn", "uvicorn.error", "uvicorn.access", "mcp.server.streamable_http"):
        logging.getLogger(name).setLevel(logging.INFO)


@pytest.fixture
def backend_client() -> MaxPBackendClient:
    return MaxPBackendClient(
        base_url="http://maxp-backend.test",
        service_token="test-service-token",
    )


@pytest.fixture
def mcp_server(backend_client: MaxPBackendClient):
    return _build_server(client=backend_client, company_id="company-1")


def _free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        return int(sock.getsockname()[1])


@pytest.fixture
def live_mcp_url(backend_client: MaxPBackendClient) -> Iterator[str]:
    port = _free_port()
    server = _build_server(client=backend_client, company_id="company-1")
    server.settings.port = port
    server.settings.host = "127.0.0.1"

    thread = threading.Thread(target=server.run, kwargs={"transport": "streamable-http"}, daemon=True)
    thread.start()

    for _ in range(50):
        time.sleep(0.1)
        try:
            with socket.create_connection(("127.0.0.1", port), timeout=0.5):
                break
        except OSError:
            continue
    else:
        raise RuntimeError("catalog-mcp did not start listening on the test port")

    url = f"http://127.0.0.1:{port}/mcp"
    try:
        yield url
    finally:
        server.settings.host = "127.0.0.1"
        thread.join(timeout=2.0)
