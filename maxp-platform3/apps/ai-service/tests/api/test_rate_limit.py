from __future__ import annotations

from fastapi import FastAPI
from fastapi.testclient import TestClient
from starlette.middleware.base import BaseHTTPMiddleware

from src.api.middleware import RateLimitMiddleware


class _SetCompanyMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        company_id = request.headers.get("X-Company-Id", "unknown")
        request.state.company_id = company_id
        response = await call_next(request)
        return response


def make_app(max_requests: int, window_seconds: int) -> FastAPI:
    app = FastAPI()
    # Starlette reverses middleware order: last added = outermost
    # RateLimitMiddleware added first = inner, _SetCompanyMiddleware added last = outer
    # Request flow: _SetCompanyMiddleware -> RateLimitMiddleware -> handler
    app.add_middleware(RateLimitMiddleware, max_requests=max_requests, window_seconds=window_seconds)
    app.add_middleware(_SetCompanyMiddleware)

    @app.post("/chat")
    async def chat():
        return {"status": "ok"}

    @app.get("/health")
    async def health():
        return {"status": "ok"}

    return app


class TestRateLimitMiddleware:
    def test_returns_429_after_exceeding_limit(self):
        app = make_app(max_requests=3, window_seconds=60)
        client = TestClient(app)

        headers = {"X-Company-Id": "rate-test-co"}

        for i in range(3):
            resp = client.post("/chat", json={"message": "hi"}, headers=headers)
            assert resp.status_code != 429, f"request {i + 1} was rate limited unexpectedly"

        resp = client.post("/chat", json={"message": "hi"}, headers=headers)
        assert resp.status_code == 429
        data = resp.json()
        assert data["error"] == "rate_limited"

    def test_public_paths_bypass_rate_limit(self):
        app = make_app(max_requests=1, window_seconds=60)
        client = TestClient(app)

        resp = client.get("/health")
        assert resp.status_code == 200

        resp = client.get("/health")
        assert resp.status_code == 200

    def test_different_companies_have_separate_buckets(self):
        app = make_app(max_requests=2, window_seconds=60)
        client = TestClient(app)

        resp1 = client.post("/chat", json={"message": "hi"}, headers={"X-Company-Id": "co-a"})
        assert resp1.status_code == 200

        resp2 = client.post("/chat", json={"message": "hi"}, headers={"X-Company-Id": "co-b"})
        assert resp2.status_code == 200

        # co-a has 1 request, co-b has 1 request
        # 2nd co-a request is allowed (len=2 not > max_requests=2)
        resp3 = client.post("/chat", json={"message": "hi"}, headers={"X-Company-Id": "co-a"})
        assert resp3.status_code == 200

        # 3rd co-a request should be blocked (len=3 > 2)
        resp4 = client.post("/chat", json={"message": "hi"}, headers={"X-Company-Id": "co-a"})
        assert resp4.status_code == 429

        # co-b still has only 1 request, so it passes
        resp5 = client.post("/chat", json={"message": "hi"}, headers={"X-Company-Id": "co-b"})
        assert resp5.status_code == 200
