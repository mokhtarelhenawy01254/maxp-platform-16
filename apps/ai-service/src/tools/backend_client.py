from __future__ import annotations

import asyncio
from typing import Any

import httpx
import structlog

from src.config import get_settings

logger = structlog.get_logger(__name__)


class BackendClient:
    """HTTP client for calling Node.js backend REST APIs directly.
    
    Replaces the ai-bridge pattern by calling business APIs directly.
    """

    def __init__(self) -> None:
        settings = get_settings()
        self.base_url = settings.maxp_api_url.rstrip("/")
        self.token = settings.maxp_service_token
        self._client: httpx.AsyncClient | None = None

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(
                base_url=self.base_url,
                headers={
                    "Authorization": f"Bearer {self.token}",
                    "Content-Type": "application/json",
                },
                timeout=30.0,
                trust_env=False,
            )
        return self._client

    async def _request(
        self,
        method: str,
        path: str,
        params: dict[str, Any] | None = None,
        json_body: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Make an HTTP request with retry logic."""
        client = await self._get_client()
        last_error: Exception | None = None
        for attempt in range(3):
            try:
                response = await client.request(method, path, params=params, json=json_body)
                response.raise_for_status()
                return response.json()  # type: ignore[no-any-return]
            except httpx.HTTPStatusError as e:
                last_error = e
                if attempt < 2:
                    await asyncio.sleep(2 ** attempt)
            except httpx.RequestError as e:
                last_error = e
                if attempt < 2:
                    await asyncio.sleep(2 ** attempt)
        raise RuntimeError(f"Request failed: {method} {path}") from last_error

    # ── Product APIs ──

    async def execute_bridge_tool(
        self,
        company_id: str,
        tool_name: str,
        input_data: dict[str, Any],
        thread_id: str | None = None,
    ) -> dict[str, Any]:
        return await self._request("POST", "/api/v1/ai-bridge/tools/execute", json_body={
            "companyId": company_id,
            "toolName": tool_name,
            "input": input_data,
            "threadId": thread_id,
        })

    async def search_products(
        self,
        company_id: str,
        query: str,
        limit: int = 10,
        product_size: str | None = None,
        product_color: str | None = None,
        conversation_id: str | None = None,
        references_previous_product: bool | None = None,
        use_vector: bool = True,
    ) -> list[dict[str, Any]]:
        body: dict[str, Any] = {
            "companyId": company_id,
            "query": query,
            "limit": limit,
            "useVector": use_vector,
        }
        if product_size:
            body["productSize"] = product_size
        if product_color:
            body["productColor"] = product_color
        if conversation_id:
            body["conversationId"] = conversation_id
        if references_previous_product is not None:
            body["referencesPreviousProduct"] = references_previous_product
        result = await self._request("POST", "/api/v1/ai-bridge/product-search", json_body=body)
        return result.get("data", result.get("products", []))

    async def get_product(self, company_id: str, product_id: str) -> dict[str, Any] | None:
        try:
            return await self._request("GET", f"/api/v1/products/{product_id}", params={"companyId": company_id})
        except RuntimeError:
            return None

    async def get_low_stock_products(
        self, company_id: str, threshold: int = 5, limit: int = 10
    ) -> list[dict[str, Any]]:
        result = await self._request("GET", "/api/v1/inventory/alerts", params={
            "threshold": threshold, "limit": limit, "companyId": company_id,
        })
        data = result.get("data", {})
        if isinstance(data, dict):
            return list(data.get("lowStock", [])) + list(data.get("outOfStock", []))
        return data if isinstance(data, list) else []

    async def get_top_selling_products(
        self, company_id: str, period: str = "month", limit: int = 5
    ) -> list[dict[str, Any]]:
        # Use orders v2 stats to determine top sellers
        result = await self._request("GET", "/api/v1/orders-v2/stats/summary", params={
            "period": period, "companyId": company_id,
        })
        return result.get("topProducts", result.get("data", []))

    async def get_product_performance(
        self, company_id: str, product_id: str, period: str = "month"
    ) -> dict[str, Any]:
        """Get per-product conversion and sales metrics."""
        return await self._request(
            "GET", f"/api/v1/analytics/products/{product_id}/conversion",
            params={"period": period, "companyId": company_id},
        )

    # ── Order APIs ──

    async def get_order_by_number(
        self, company_id: str, order_number: str
    ) -> dict[str, Any] | None:
        try:
            return await self._request(
                "GET", f"/api/v1/orders-v2/simple/{order_number}",
                params={"companyId": company_id},
            )
        except RuntimeError:
            return None

    async def list_recent_orders(
        self, company_id: str, limit: int = 5, status: str | None = None
    ) -> list[dict[str, Any]]:
        params: dict[str, Any] = {"limit": limit, "companyId": company_id}
        if status:
            params["status"] = status
        result = await self._request("GET", "/api/v1/orders-v2/simple", params=params)
        return result.get("data", result.get("orders", []))

    async def get_order_summary(
        self, company_id: str, period: str = "today"
    ) -> dict[str, Any]:
        return await self._request("GET", "/api/v1/orders-v2/stats/summary", params={
            "period": period, "companyId": company_id,
        })

    async def create_order(
        self, company_id: str, order_data: dict[str, Any]
    ) -> dict[str, Any]:
        order_data.setdefault("companyId", company_id)
        bridge_response = await self.execute_bridge_tool(
            company_id,
            "order.create_confirmed",
            order_data,
        )
        tool_result = bridge_response.get("result", bridge_response)
        if isinstance(tool_result, dict) and tool_result.get("success") is False:
            raise RuntimeError(str(tool_result.get("error") or "order.create_confirmed failed"))
        if isinstance(tool_result, dict) and isinstance(tool_result.get("output"), dict):
            return tool_result["output"]
        return tool_result if isinstance(tool_result, dict) else {"result": tool_result}

    async def update_order_status(
        self, company_id: str, order_number: str, status: str
    ) -> dict[str, Any]:
        return await self._request(
            "PATCH", f"/api/v1/orders-v2/simple/{order_number}/status",
            json_body={"status": status, "companyId": company_id},
        )

    async def cancel_order(
        self, company_id: str, order_number: str, reason: str | None = None
    ) -> dict[str, Any]:
        return await self._request(
            "POST", f"/api/v1/orders-v2/simple/{order_number}/cancel",
            json_body={"reason": reason, "companyId": company_id},
        )

    async def get_shipping_rate(
        self, company_id: str, governorate: str, city: str | None = None, weight: float | None = None
    ) -> dict[str, Any] | None:
        try:
            return await self._request(
                "GET", "/api/v1/shipping-zones/public/{company_id}/calculate",
                params={"governorate": governorate, "city": city or "", "weight": weight or 0},
            )
        except RuntimeError:
            return None

    # ── Customer APIs ──

    async def search_customers(
        self, company_id: str, query: str, limit: int = 5
    ) -> list[dict[str, Any]]:
        result = await self._request("GET", "/api/v1/customers/search", params={
            "q": query, "limit": limit, "companyId": company_id,
        })
        return result.get("data", result.get("customers", []))

    async def get_customer(
        self, company_id: str, customer_id: str
    ) -> dict[str, Any] | None:
        try:
            return await self._request(
                "GET", f"/api/v1/customers/{customer_id}",
                params={"companyId": company_id},
            )
        except RuntimeError:
            return None

    async def get_customer_orders(
        self, company_id: str, customer_id: str, limit: int = 5
    ) -> list[dict[str, Any]]:
        result = await self._request(
            "GET", f"/api/v1/customers/{customer_id}/orders",
            params={"limit": limit, "companyId": company_id},
        )
        return result.get("data", result.get("orders", []))

    # ── Inventory APIs ──

    async def check_inventory(
        self, company_id: str, product_id: str
    ) -> dict[str, Any] | None:
        try:
            return await self._request(
                "GET", f"/api/v1/inventory/product/{product_id}",
                params={"companyId": company_id},
            )
        except RuntimeError:
            return None

    async def adjust_inventory(
        self, company_id: str, product_id: str, quantity: int, reason: str | None = None
    ) -> dict[str, Any]:
        return await self._request(
            "POST", "/api/v1/inventory/update-stock",
            json_body={
                "productId": product_id,
                "quantity": quantity,
                "reason": reason or "AI agent adjustment",
                "companyId": company_id,
            },
        )

    async def get_inventory_alerts(
        self, company_id: str, threshold: int = 5
    ) -> list[dict[str, Any]]:
        result = await self._request("GET", "/api/v1/inventory/alerts", params={
            "threshold": threshold, "companyId": company_id,
        })
        return result.get("data", result.get("products", []))

    # ── Competitor APIs ──

    async def search_competitors(
        self, company_id: str, query: str, limit: int = 10
    ) -> list[dict[str, Any]]:
        result = await self._request("GET", "/api/v1/competitors", params={
            "search": query, "limit": limit, "companyId": company_id,
        })
        return result.get("data", result.get("competitors", []))

    async def get_competitor_products(
        self, company_id: str, competitor_id: str, limit: int = 20
    ) -> list[dict[str, Any]]:
        result = await self._request(
            "GET", f"/api/v1/competitors/{competitor_id}/products",
            params={"limit": limit, "companyId": company_id},
        )
        return result.get("data", result.get("products", []))

    async def competitor_price_compare(
        self, company_id: str, competitor_id: str
    ) -> dict[str, Any]:
        return await self._request(
            "GET", f"/api/v1/competitors/{competitor_id}/price-compare",
            params={"companyId": company_id},
        )

    async def get_competitor_ads(
        self, company_id: str, competitor_id: str, limit: int = 10
    ) -> list[dict[str, Any]]:
        result = await self._request(
            "GET", f"/api/v1/competitors/{competitor_id}/ads",
            params={"limit": limit, "companyId": company_id},
        )
        return result.get("data", result.get("ads", []))

    # ── WhatsApp APIs ──

    async def send_whatsapp_message(
        self, company_id: str, phone: str, message: str
    ) -> dict[str, Any]:
        return await self._request(
            "POST", "/api/v1/whatsapp/whatsapp",
            json_body={
                "phone": phone,
                "message": message,
                "companyId": company_id,
            },
        )

    # ── Facebook/Messenger APIs ──

    async def send_facebook_message(
        self,
        company_id: str,
        recipient_id: str,
        message: str,
        page_id: str,
        message_type: str = "TEXT",
        media_url: str | None = None,
    ) -> dict[str, Any]:
        payload = {
            "recipientId": recipient_id,
            "message": message,
            "pageId": page_id,
            "companyId": company_id,
            "messageType": message_type,
        }
        if media_url:
            payload["mediaUrl"] = media_url

        result = await self._request(
            "POST", "/api/v1/facebook/status/test-message",
            json_body=payload,
        )
        return result.get("result", result.get("data", result))

    async def generate_competitor_report(
        self, company_id: str, competitor_id: str, report_type: str = "weekly"
    ) -> dict[str, Any]:
        return await self._request(
            "POST", f"/api/v1/competitors/{competitor_id}/reports/generate",
            json_body={"type": report_type, "companyId": company_id},
        )

    # ── Shipping APIs ──

    async def get_shipping_rates(
        self, company_id: str, governorate: str
    ) -> dict[str, Any]:
        return await self._request(
            "GET", f"/api/v1/shipping-zones/public/{company_id}/calculate",
            params={"governorate": governorate},
        )

    # ── Audit APIs ──

    async def get_audit_trail(
        self, company_id: str, limit: int = 5, agent_id: str | None = None
    ) -> dict[str, Any]:
        params: dict[str, Any] = {"limit": limit, "companyId": company_id}
        if agent_id:
            params["agentId"] = agent_id
        return await self._request(
            "GET", "/api/v1/agent/audit-trail",
            params=params,
        )

    # ── Agent Profile APIs ──

    async def update_agent_profile(
        self, company_id: str, agent_id: str, data: dict[str, Any]
    ) -> dict[str, Any]:
        return await self._request(
            "PUT", f"/api/v1/agent/agents/{agent_id}",
            json_body={**data, "companyId": company_id},
        )


    # ── Booking APIs ──

    async def get_booking_branches(self, company_id: str) -> list[dict[str, Any]]:
        result = await self._request("GET", "/api/v1/booking/branches", params={"companyId": company_id})
        return result.get("data", [])

    async def get_booking_doctors(self, company_id: str, branch_id: str | None = None) -> list[dict[str, Any]]:
        params: dict[str, Any] = {"companyId": company_id}
        if branch_id:
            params["branchId"] = branch_id
        result = await self._request("GET", "/api/v1/booking/doctors", params=params)
        return result.get("data", [])

    async def get_booking_services(self, company_id: str, branch_id: str | None = None) -> list[dict[str, Any]]:
        params: dict[str, Any] = {"companyId": company_id}
        if branch_id:
            params["branchId"] = branch_id
        result = await self._request("GET", "/api/v1/booking/services", params=params)
        return result.get("data", [])

    async def get_booking_available_slots(
        self, company_id: str, branch_id: str, date: str,
        doctor_id: str | None = None, service_id: str | None = None,
    ) -> list[str]:
        params: dict[str, Any] = {
            "companyId": company_id, "branchId": branch_id, "date": date,
        }
        if doctor_id:
            params["doctorId"] = doctor_id
        if service_id:
            params["serviceId"] = service_id
        result = await self._request("GET", "/api/v1/booking/appointments/available-slots", params=params)
        return result.get("data", [])

    async def create_booking_appointment(
        self, company_id: str, data: dict[str, Any]
    ) -> dict[str, Any]:
        return await self._request("POST", "/api/v1/booking/appointments", json_body={**data, "companyId": company_id})

    async def confirm_booking_appointment(
        self, company_id: str, appointment_id: str
    ) -> dict[str, Any]:
        return await self._request(
            "PUT", f"/api/v1/booking/appointments/{appointment_id}/confirm",
            json_body={"companyId": company_id},
        )

    async def cancel_booking_appointment(
        self, company_id: str, appointment_id: str, reason: str | None = None
    ) -> dict[str, Any]:
        body: dict[str, Any] = {"companyId": company_id}
        if reason:
            body["reason"] = reason
        return await self._request(
            "PUT", f"/api/v1/booking/appointments/{appointment_id}/status",
            json_body={"status": "cancelled", **body},
        )

    async def get_booking_appointment_details(
        self, company_id: str, appointment_id: str
    ) -> dict[str, Any] | None:
        try:
            return await self._request(
                "GET", f"/api/v1/booking/appointments/{appointment_id}",
                params={"companyId": company_id},
            )
        except RuntimeError:
            return None

    # ── Booking Draft APIs ──

    async def create_booking_draft(self, company_id: str) -> dict[str, Any]:
        return await self._request("POST", "/api/v1/booking/drafts", json_body={"companyId": company_id})

    async def set_booking_draft_field(self, company_id: str, draft_id: str, field: str, value: str) -> dict[str, Any]:
        return await self._request(
            "PUT", f"/api/v1/booking/drafts/{draft_id}/field",
            json_body={"companyId": company_id, "field": field, "value": value},
        )

    async def get_booking_draft(self, company_id: str, draft_id: str) -> dict[str, Any]:
        return await self._request("GET", f"/api/v1/booking/drafts/{draft_id}", params={"companyId": company_id})

    async def finalize_booking_draft(self, company_id: str, draft_id: str) -> dict[str, Any]:
        return await self._request("POST", f"/api/v1/booking/drafts/{draft_id}/finalize", json_body={"companyId": company_id})


_backend_client: BackendClient | None = None


def get_backend_client() -> BackendClient:
    global _backend_client
    if _backend_client is None:
        _backend_client = BackendClient()
    return _backend_client
