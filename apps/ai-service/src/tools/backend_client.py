from __future__ import annotations

import asyncio
from typing import Any

import httpx
import structlog

from src.config import get_settings

logger = structlog.get_logger(__name__)


class BackendAPIError(Exception):
    """Structured exception for backend API errors carrying human-readable message and error code."""

    def __init__(
        self,
        message: str,
        status_code: int = 500,
        error_code: str | None = None,
        field: str | None = None,
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.error_code = error_code
        self.field = field
        self.details = details or {}


class BackendClient:
    """HTTP client for calling Node.js backend REST APIs directly.
    
    Replaces the ai-bridge pattern by calling business APIs directly.
    """

    def __init__(self) -> None:
        settings = get_settings()
        api_url = settings.maxp_api_url.rstrip("/")
        if "maxp.online" in api_url or "mokhtarelhenawy.online" in api_url or "localhost" in api_url or "127.0.0.1" in api_url:
            api_url = "http://127.0.0.1:3007"
        self.base_url = api_url
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
                timeout=60.0,
                trust_env=False,
                verify=False,
            )
        return self._client

    async def _request(
        self,
        method: str,
        path: str,
        params: dict[str, Any] | None = None,
        json_body: dict[str, Any] | None = None,
        headers: dict[str, str] | None = None,
    ) -> dict[str, Any]:
        """Make an HTTP request with error extraction and retry logic."""
        client = await self._get_client()
        last_error: Exception | None = None
        for attempt in range(3):
            try:
                response = await client.request(
                    method,
                    path,
                    params=params,
                    json=json_body,
                    headers=headers,
                )
                if response.is_success:
                    return response.json()  # type: ignore[no-any-return]

                # Parse error response body
                err_data: dict[str, Any] = {}
                try:
                    err_data = response.json()
                except Exception:
                    pass

                err_msg = (
                    err_data.get("error")
                    or err_data.get("message")
                    or f"HTTP error {response.status_code}"
                )
                err_code = err_data.get("errorCode")
                err_field = err_data.get("field")

                # Client errors (4xx) should not be retried blindly
                if 400 <= response.status_code < 500:
                    raise BackendAPIError(
                        message=str(err_msg),
                        status_code=response.status_code,
                        error_code=err_code,
                        field=err_field,
                        details=err_data,
                    )

                last_error = BackendAPIError(
                    message=str(err_msg),
                    status_code=response.status_code,
                    error_code=err_code,
                    field=err_field,
                    details=err_data,
                )
                if attempt < 2:
                    await asyncio.sleep(2 ** attempt)
            except BackendAPIError:
                raise
            except httpx.HTTPStatusError as e:
                last_error = e
                if attempt < 2:
                    await asyncio.sleep(2 ** attempt)
            except httpx.RequestError as e:
                last_error = e
                if attempt < 2:
                    await asyncio.sleep(2 ** attempt)

        if isinstance(last_error, BackendAPIError):
            raise last_error
        raise BackendAPIError(
            message="تعذر إكمال الاتصال بالخدمة الداخلية حالياً. يرجى إعادة المحاولة.",
            status_code=503,
            details={"original_error": str(last_error)},
        ) from last_error

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
        self,
        company_id: str,
        limit: int = 25,
        status: str | None = None,
        period: str | None = None,
        date: str | None = None,
    ) -> list[dict[str, Any]]:
        params: dict[str, Any] = {"limit": limit, "companyId": company_id}
        if status:
            params["status"] = status
        if period:
            params["period"] = period
        if date:
            params["date"] = date
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

    async def confirm_order(
        self, company_id: str, order_number: str, notes: str | None = None
    ) -> dict[str, Any]:
        """Confirm an existing order (status -> CONFIRMED) through the backend.

        Reuses the merchant order-status route so all side effects run:
        confirmedAt/confirmedBy, ORDER_CONFIRMED WhatsApp notification, and
        Turbo auto-shipment (passing the order to the shipping company).
        """
        body: dict[str, Any] = {"status": "CONFIRMED", "companyId": company_id}
        if notes:
            body["notes"] = notes
        return await self._request(
            "PATCH", f"/api/v1/orders-v2/{order_number}/status",
            json_body=body,
        )

    async def update_order_details(
        self,
        company_id: str,
        order_number: str,
        data: dict[str, Any],
    ) -> dict[str, Any]:
        """Update order address/contact details via orderDetailsUpdateService."""
        payload = {**data, "companyId": company_id}
        return await self._request(
            "PUT", f"/api/v1/orders-v2/simple/{order_number}",
            json_body=payload,
        )

    async def get_shipping_company_governorates(
        self, company_id: str
    ) -> dict[str, Any]:
        """Fetch the shipping company's governorate map (Turbo governments)."""
        return await self._request(
            "GET", "/api/v1/turbo/governments",
            params={"companyId": company_id},
        )

    async def get_shipping_company_areas(
        self, company_id: str, government_id: str
    ) -> dict[str, Any]:
        """Fetch the shipping company's areas for a governorate (Turbo areas)."""
        return await self._request(
            "GET", f"/api/v1/turbo/areas/{government_id}",
            params={"companyId": company_id},
        )

    async def search_area_by_text(
        self, company_id: str, query: str, limit: int = 10
    ) -> dict[str, Any]:
        """Search the shipping company's area map by free text (Turbo search-area)."""
        return await self._request(
            "GET", "/api/v1/turbo/search-area",
            params={"q": query, "limit": limit, "companyId": company_id},
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
                "GET", f"/api/v1/shipping-zones/public/{company_id}/calculate",
                params={"governorate": governorate, "city": city or "", "weight": weight or 0},
            )
        except RuntimeError:
            return None

    async def update_order_payment_status(
        self,
        company_id: str,
        order_number: str,
        payment_status: str,
        notes: str | None = None,
    ) -> dict[str, Any]:
        """Update an order's payment status (e.g. REFUNDED) via orders-v2.

        The backend route records the change (with reason notes) in the
        order's status history — the real audit trail for refunds.
        """
        body: dict[str, Any] = {
            "paymentStatus": payment_status.upper(),
            "companyId": company_id,
        }
        if notes:
            body["notes"] = notes
        return await self._request(
            "POST", f"/api/v1/orders-v2/simple/{order_number}/payment-status",
            json_body=body,
        )

    async def create_coupon(
        self, company_id: str, data: dict[str, Any]
    ) -> dict[str, Any]:
        """Create a coupon via the coupons-pro app route (POST /coupons)."""
        return await self._request(
            "POST", "/api/v1/coupons",
            json_body={**data, "companyId": company_id},
        )

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
        self, company_id: str, phone: str, message: str, media_url: str | None = None
    ) -> dict[str, Any]:
        body = {"phone": phone, "message": message, "companyId": company_id}
        if media_url:
            body["mediaUrl"] = media_url
        return await self._request(
            "POST", "/api/v1/whatsapp/whatsapp",
            json_body=body,
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

    async def get_shipping_ticket_categories(
        self, company_id: str
    ) -> dict[str, Any]:
        """Fetch ticket categories/inquiry types from the shipping carrier (Turbo)."""
        return await self._request(
            "GET", "/api/v1/turbo/tickets/categories",
            params={"companyId": company_id},
            headers={"x-company-id": company_id},
        )

    async def get_shipping_tickets(
        self, company_id: str, page: int = 1, per_page: int = 15, status: str = "all"
    ) -> dict[str, Any]:
        """Fetch support tickets from the shipping carrier (Turbo)."""
        return await self._request(
            "GET", "/api/v1/turbo/tickets",
            params={"companyId": company_id, "page": page, "per_page": per_page, "status": status},
            headers={"x-company-id": company_id},
        )

    async def get_shipping_ticket(
        self, company_id: str, ticket_id: str | int
    ) -> dict[str, Any]:
        """Fetch details and messages for a specific shipping ticket."""
        return await self._request(
            "GET", f"/api/v1/turbo/tickets/{ticket_id}",
            params={"companyId": company_id},
            headers={"x-company-id": company_id},
        )

    async def create_shipping_ticket(
        self,
        company_id: str,
        content: str,
        category_id: int | str | None = None,
        code: str | None = None,
        priority: str = "medium",
        related_to: str = "shipments",
    ) -> dict[str, Any]:
        """Open a new support ticket with the shipping carrier (Turbo)."""
        payload: dict[str, Any] = {
            "content": content,
            "priority": priority,
            "relatedTo": related_to,
            "targetCompanyId": company_id,
        }
        if category_id is not None:
            payload["categoryId"] = category_id
        if code:
            payload["code"] = code
        return await self._request(
            "POST", "/api/v1/turbo/tickets",
            json_body=payload,
            params={"companyId": company_id},
            headers={"x-company-id": company_id},
        )

    async def reply_shipping_ticket(
        self, company_id: str, ticket_id: str | int, message: str
    ) -> dict[str, Any]:
        """Send a reply to an existing shipping ticket."""
        return await self._request(
            "POST", f"/api/v1/turbo/tickets/{ticket_id}/reply",
            json_body={"message": message, "companyId": company_id},
            params={"companyId": company_id},
            headers={"x-company-id": company_id},
        )

    async def track_shipment_by_code(
        self, company_id: str, order_or_tracking_code: str
    ) -> dict[str, Any]:
        """Track a shipment in real-time by order number or tracking code."""
        return await self._request(
            "GET", f"/api/v1/turbo/orders/{order_or_tracking_code}/track",
            params={"companyId": company_id},
            headers={"x-company-id": company_id},
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

    # ── Education APIs ──

    async def get_education_subjects(self, company_id: str) -> list[dict[str, Any]]:
        result = await self._request("GET", "/api/v1/education/subjects", params={"companyId": company_id})
        return result.get("data", [])

    async def get_education_packages(self, company_id: str, subject_id: str | None = None) -> list[dict[str, Any]]:
        params: dict[str, Any] = {"companyId": company_id}
        if subject_id:
            params["subjectId"] = subject_id
        result = await self._request("GET", "/api/v1/education/packages", params=params)
        return result.get("data", [])

    async def get_education_package(self, company_id: str, package_id: str) -> dict[str, Any] | None:
        try:
            result = await self._request("GET", f"/api/v1/education/packages/{package_id}", params={"companyId": company_id})
            return result.get("data")
        except RuntimeError:
            return None

    async def get_education_teachers(self, company_id: str) -> list[dict[str, Any]]:
        result = await self._request("GET", "/api/v1/education/teachers", params={"companyId": company_id})
        return result.get("data", [])

    async def get_education_students(self, company_id: str, customer_id: str | None = None) -> list[dict[str, Any]]:
        params: dict[str, Any] = {"companyId": company_id}
        if customer_id:
            params["customerId"] = customer_id
        result = await self._request("GET", "/api/v1/education/students", params=params)
        return result.get("data", [])

    async def create_education_student(self, company_id: str, data: dict[str, Any]) -> dict[str, Any]:
        return await self._request("POST", "/api/v1/education/students", json_body={**data, "companyId": company_id})

    async def create_education_enrollment(self, company_id: str, data: dict[str, Any]) -> dict[str, Any]:
        return await self._request("POST", "/api/v1/education/enrollments", json_body={**data, "companyId": company_id})

    async def get_education_enrollment(self, company_id: str, enrollment_id: str) -> dict[str, Any]:
        try:
            result = await self._request("GET", f"/api/v1/education/enrollments/{enrollment_id}", params={"companyId": company_id})
            return result.get("data", {})
        except RuntimeError:
            return {}

    async def create_education_session(self, company_id: str, data: dict[str, Any]) -> dict[str, Any]:
        return await self._request("POST", "/api/v1/education/sessions", json_body={**data, "companyId": company_id})

    async def get_education_sessions(self, company_id: str, student_id: str, status: str = "") -> list[dict[str, Any]]:
        params: dict[str, Any] = {"companyId": company_id, "studentId": student_id}
        if status:
            params["status"] = status
        result = await self._request("GET", "/api/v1/education/sessions", params=params)
        return result.get("data", [])

    async def cancel_education_session(self, company_id: str, session_id: str) -> dict[str, Any]:
        return await self._request("PUT", f"/api/v1/education/sessions/{session_id}/cancel", json_body={"companyId": company_id})

    async def create_customer(self, company_id: str, data: dict[str, Any]) -> dict[str, Any]:
        return await self._request("POST", "/api/v1/customers", json_body={**data, "companyId": company_id})

    async def create_booking_appointment(
        self, company_id: str, data: dict[str, Any], agent_name: str | None = None
    ) -> dict[str, Any]:
        body = {**data, "companyId": company_id}
        if agent_name:
            body["createdByName"] = agent_name
        return await self._request("POST", "/api/v1/booking/appointments", json_body=body)

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

    # ── Coupon / Promotion APIs ──

    async def get_coupons(
        self, company_id: str, is_active: bool = True
    ) -> list[dict[str, Any]]:
        result = await self._request("GET", "/api/v1/coupons", params={
            "isActive": str(is_active).lower(), "companyId": company_id,
        })
        data = result.get("data", result.get("coupons", []))
        return data if isinstance(data, list) else []

    async def get_store_promotion(
        self, company_id: str
    ) -> dict[str, Any] | None:
        try:
            result = await self._request("GET", "/api/v1/store-promotions", params={"companyId": company_id})
            data = result.get("data", {})
            return data if isinstance(data, dict) else None
        except RuntimeError:
            return None

    async def get_promotion_settings(
        self, company_id: str
    ) -> dict[str, Any] | None:
        try:
            result = await self._request("GET", "/api/v1/promotion-settings", params={"companyId": company_id})
            data = result.get("data", {})
            return data if isinstance(data, dict) else None
        except RuntimeError:
            return None

    async def validate_coupon(
        self, company_id: str, code: str, order_amount: str = "0", customer_id: str | None = None
    ) -> dict[str, Any]:
        body: dict[str, Any] = {"code": code, "orderAmount": order_amount, "companyId": company_id}
        if customer_id:
            body["customerId"] = customer_id
        return await self._request("POST", "/api/v1/coupons/validate", json_body=body)

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

    # ── Booking Admin APIs (branches CRUD) ──

    async def create_booking_branch(self, company_id: str, data: dict[str, Any]) -> dict[str, Any]:
        return await self._request("POST", "/api/v1/booking/branches", json_body={**data, "companyId": company_id})

    async def update_booking_branch(self, company_id: str, branch_id: str, data: dict[str, Any]) -> dict[str, Any]:
        return await self._request("PUT", f"/api/v1/booking/branches/{branch_id}", json_body={**data, "companyId": company_id})

    async def delete_booking_branch(self, company_id: str, branch_id: str) -> dict[str, Any]:
        return await self._request("DELETE", f"/api/v1/booking/branches/{branch_id}", json_body={"companyId": company_id})

    # ── Booking Admin APIs (doctors CRUD) ──

    async def create_booking_doctor(self, company_id: str, data: dict[str, Any]) -> dict[str, Any]:
        return await self._request("POST", "/api/v1/booking/doctors", json_body={**data, "companyId": company_id})

    async def update_booking_doctor(self, company_id: str, doctor_id: str, data: dict[str, Any]) -> dict[str, Any]:
        return await self._request("PUT", f"/api/v1/booking/doctors/{doctor_id}", json_body={**data, "companyId": company_id})

    async def delete_booking_doctor(self, company_id: str, doctor_id: str) -> dict[str, Any]:
        return await self._request("DELETE", f"/api/v1/booking/doctors/{doctor_id}", json_body={"companyId": company_id})

    # ── Booking Admin APIs (services CRUD + toggle) ──

    async def create_booking_service(self, company_id: str, data: dict[str, Any]) -> dict[str, Any]:
        return await self._request("POST", "/api/v1/booking/services", json_body={**data, "companyId": company_id})

    async def update_booking_service(self, company_id: str, service_id: str, data: dict[str, Any]) -> dict[str, Any]:
        return await self._request("PUT", f"/api/v1/booking/services/{service_id}", json_body={**data, "companyId": company_id})

    async def delete_booking_service(self, company_id: str, service_id: str) -> dict[str, Any]:
        return await self._request("DELETE", f"/api/v1/booking/services/{service_id}", json_body={"companyId": company_id})

    async def toggle_booking_service(self, company_id: str, service_id: str) -> dict[str, Any]:
        return await self._request("PATCH", f"/api/v1/booking/services/{service_id}/toggle", json_body={"companyId": company_id})

    # ── Booking Admin APIs (appointments management) ──

    async def get_booking_appointments(
        self, company_id: str, filters: dict[str, Any] | None = None,
    ) -> list[dict[str, Any]]:
        params: dict[str, Any] = {"companyId": company_id}
        if filters:
            params.update({k: v for k, v in filters.items() if v is not None})
        result = await self._request("GET", "/api/v1/booking/appointments", params=params)
        return result.get("data", [])

    async def update_booking_appointment_status(
        self, company_id: str, appointment_id: str, status: str, notes: str | None = None,
    ) -> dict[str, Any]:
        body: dict[str, Any] = {"companyId": company_id, "status": status}
        if notes:
            body["notes"] = notes
        return await self._request("PUT", f"/api/v1/booking/appointments/{appointment_id}/status", json_body=body)

    async def bulk_delete_booking_appointments(self, company_id: str, ids: list[str]) -> dict[str, Any]:
        return await self._request("POST", "/api/v1/booking/appointments/bulk-delete", json_body={"companyId": company_id, "ids": ids})

    # ── Facebook Ads APIs ──

    async def publish_facebook_ad_draft(
        self,
        company_id: str,
        draft_id: str,
        overrides: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Publish an approved Facebook ad draft to Meta Marketing API via Node.js backend."""
        return await self._request(
            "POST",
            f"/api/v1/facebook-ads/ai/drafts/{draft_id}/publish",
            json_body=overrides or {},
            headers={"X-Company-Id": company_id},
        )

    async def update_facebook_campaign_status(
        self,
        company_id: str,
        campaign_id: str,
        status: str,
    ) -> dict[str, Any]:
        """Pause or Activate an active Facebook campaign directly on Meta."""
        return await self._request(
            "POST",
            f"/api/v1/facebook-ads/ai/campaigns/{campaign_id}/status",
            json_body={"status": status},
            headers={"X-Company-Id": company_id},
        )

    async def update_facebook_campaign_budget(
        self,
        company_id: str,
        campaign_id: str,
        daily_budget: float,
    ) -> dict[str, Any]:
        """Update daily budget of an active Facebook campaign directly on Meta."""
        return await self._request(
            "POST",
            f"/api/v1/facebook-ads/ai/campaigns/{campaign_id}/budget",
            json_body={"daily_budget": daily_budget},
            headers={"X-Company-Id": company_id},
        )

    async def search_facebook_targeting(
        self,
        company_id: str,
        query: str,
        search_type: str = "adgeolocation",
        country_code: str | None = "EG",
        limit: int = 10,
    ) -> dict[str, Any]:
        """Dynamically search Meta geolocations (regions/cities/zip) or interests via Node.js backend."""
        return await self._request(
            "GET",
            "/api/v1/facebook-ads/ai/targeting/search",
            params={
                "q": query,
                "type": search_type,
                "countryCode": country_code or "EG",
                "limit": limit,
            },
            headers={"X-Company-Id": company_id},
        )

    async def inspect_facebook_targeting(
        self,
        company_id: str,
        campaign_id: str | None = None,
        adset_id: str | None = None,
    ) -> dict[str, Any]:
        """Inspect live Meta targeting parameters (regions, ages, genders, custom locations) for an AdSet or Campaign."""
        params: dict[str, Any] = {}
        if campaign_id:
            params["campaignId"] = campaign_id
        if adset_id:
            params["adSetId"] = adset_id
        return await self._request(
            "GET",
            "/api/v1/facebook-ads/ai/targeting/inspect",
            params=params,
            headers={"X-Company-Id": company_id},
        )

    async def get_storefront_settings(self, company_id: str) -> dict[str, Any]:
        """Fetch tenant storefront settings (payment methods, gateway status masked server-side, COD deposit)."""
        return await self._request(
            "GET",
            "/api/v1/storefront-settings",
            params={"companyId": company_id},
        )

    async def update_storefront_settings(self, company_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        """Partially update tenant storefront settings; only provided keys are changed."""
        return await self._request(
            "PUT",
            "/api/v1/storefront-settings",
            params={"companyId": company_id},
            json_body=payload,
        )

    async def list_company_apps(self, company_id: str) -> list[dict[str, Any]]:
        """List installed marketplace apps (TRIAL/ACTIVE) with their settings JSON."""
        result = await self._request(
            "GET",
            "/api/v1/my-apps",
            params={"companyId": company_id},
        )
        data = result.get("data", [])
        return data if isinstance(data, list) else []

    async def update_company_app_settings(
        self, company_id: str, app_id: str, settings: dict[str, Any]
    ) -> dict[str, Any]:
        """Replace a CompanyApp settings JSON. Callers must read-merge-write; backend replaces wholesale."""
        return await self._request(
            "PUT",
            f"/api/v1/my-apps/{app_id}/settings",
            params={"companyId": company_id},
            json_body={"settings": settings},
        )



_backend_client: BackendClient | None = None


def get_backend_client() -> BackendClient:
    global _backend_client
    if _backend_client is None:
        _backend_client = BackendClient()
    return _backend_client


async def api_get(path: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
    client = get_backend_client()
    return await client._request("GET", path, params=params)


async def api_post(path: str, json_body: dict[str, Any] | None = None) -> dict[str, Any]:
    client = get_backend_client()
    return await client._request("POST", path, json_body=json_body)
