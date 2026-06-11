from __future__ import annotations

import pytest

from src.intent.schema import ToolPlan
from src.pipeline.context import DISABLE_EXTERNAL_EMBEDDING_RETRIEVAL, PipelineContext
from src.pipeline.stages import route_to_tools as route_module
from src.pipeline.stages.route_to_tools import route_to_tools


@pytest.mark.asyncio
async def test_merchant_route_to_tools_uses_model_classified_plan():
    assert not hasattr(route_module, "get_deterministic_read_tool_execution")
    assert not hasattr(route_module, "get_deterministic_action_tool_execution")

    ctx = PipelineContext(
        message="refund request",
        thread_id="thread-1",
        company_id="comp1",
        customer_id="merchant_admin",
        channel="merchant",
    )
    ctx.relevance_plan = ToolPlan(
        intent="support.refund",
        requiresTool=True,
        primaryTool="agent_handoff_to",
        allowedTools=["agent_handoff_to"],
        reason="classified by model",
    )
    ctx.native_tools = [{"name": "agent_handoff_to"}]

    result = await route_to_tools(ctx)

    assert result.execution_plan["deterministicActionExecution"]["nativeName"] == "agent_handoff_to"


@pytest.mark.asyncio
async def test_route_to_tools_accepts_dotted_allowed_tool_alias():
    ctx = PipelineContext(
        message="do you have black shoes?",
        thread_id="thread-1",
        company_id="comp1",
        customer_id="cust1",
        channel="facebook",
    )
    ctx.system_prompt = "base"
    ctx.relevance_plan = ToolPlan(
        intent="products",
        requiresTool=True,
        primaryTool="product_search",
        allowedTools=["product.search"],
        reason="classified by model",
    )
    ctx.native_tools = [{"name": "product_search"}]

    result = await route_to_tools(ctx)

    assert result.native_tools == [{"name": "product_search"}]
    assert result.execution_plan["deterministicReadExecution"]["nativeName"] == "product_search"
    assert result.execution_plan["deterministicReadExecution"]["params"]["query"] == "do you have black shoes?"


@pytest.mark.asyncio
async def test_route_to_tools_disables_product_search_vector_when_external_embeddings_disabled():
    ctx = PipelineContext(
        message="show me running shoes",
        thread_id="thread-1",
        company_id="comp1",
        customer_id="cust1",
        channel="facebook",
        external_memory_context={DISABLE_EXTERNAL_EMBEDDING_RETRIEVAL: True},
    )
    ctx.relevance_plan = ToolPlan(
        intent="products",
        requiresTool=True,
        primaryTool="product.search",
        allowedTools=["product.search"],
        reason="classified by model",
    )
    ctx.native_tools = [{"name": "product_search"}]

    result = await route_to_tools(ctx)

    params = result.execution_plan["deterministicReadExecution"]["params"]
    assert params["query"] == "show me running shoes"
    assert params["use_vector"] is False


@pytest.mark.asyncio
async def test_route_to_tools_passes_customer_image_to_product_search():
    ctx = PipelineContext(
        message="do you have this?",
        thread_id="thread-1",
        company_id="comp1",
        customer_id="cust1",
        channel="facebook",
        attachments=[{
            "type": "image",
            "base64_data": "aGVsbG8=",
            "mime_type": "image/png",
        }],
    )
    ctx.relevance_plan = ToolPlan(
        intent="products",
        requiresTool=True,
        primaryTool="product.search",
        allowedTools=["product.search"],
        reason="classified by model",
    )
    ctx.native_tools = [{"name": "product_search"}]

    result = await route_to_tools(ctx)

    params = result.execution_plan["deterministicReadExecution"]["params"]
    assert params["query"] == "do you have this?"
    assert params["image_bytes"] == "aGVsbG8="
    assert params["mime_type"] == "image/png"


@pytest.mark.asyncio
async def test_route_to_tools_passes_customer_image_url_to_product_search():
    ctx = PipelineContext(
        message="do you have this?",
        thread_id="thread-1",
        company_id="comp1",
        customer_id="cust1",
        channel="facebook",
        attachments=[{
            "type": "image",
            "url": "https://cdn.example.com/photo.jpg",
        }],
    )
    ctx.relevance_plan = ToolPlan(
        intent="products",
        requiresTool=True,
        primaryTool="product.search",
        allowedTools=["product.search"],
        reason="classified by model",
    )
    ctx.native_tools = [{"name": "product_search"}]

    result = await route_to_tools(ctx)

    params = result.execution_plan["deterministicReadExecution"]["params"]
    assert params["query"] == "do you have this?"
    assert params["image_url"] == "https://cdn.example.com/photo.jpg"
    assert params["mime_type"] == "image/jpeg"


@pytest.mark.asyncio
async def test_route_to_tools_keeps_image_search_when_external_embeddings_are_disabled():
    ctx = PipelineContext(
        message="do you have this?",
        thread_id="thread-1",
        company_id="comp1",
        customer_id="cust1",
        channel="facebook",
        external_memory_context={DISABLE_EXTERNAL_EMBEDDING_RETRIEVAL: True},
        attachments=[{
            "type": "image",
            "url": "https://cdn.example.com/photo.jpg",
        }],
    )
    ctx.relevance_plan = ToolPlan(
        intent="products",
        requiresTool=True,
        primaryTool="product.search",
        allowedTools=["product.search"],
        reason="classified by model",
    )
    ctx.native_tools = [{"name": "product_search"}]

    result = await route_to_tools(ctx)

    params = result.execution_plan["deterministicReadExecution"]["params"]
    assert params["query"] == "do you have this?"
    assert params["image_url"] == "https://cdn.example.com/photo.jpg"
    assert "use_vector" not in params


@pytest.mark.asyncio
async def test_route_to_tools_prefers_product_search_for_customer_image_when_inventory_is_primary():
    ctx = PipelineContext(
        message="do you have the product in this photo?",
        thread_id="thread-1",
        company_id="comp1",
        customer_id="cust1",
        channel="facebook",
        external_memory_context={DISABLE_EXTERNAL_EMBEDDING_RETRIEVAL: True},
        attachments=[{
            "type": "image",
            "url": "https://cdn.example.com/photo.jpg",
        }],
    )
    ctx.relevance_plan = ToolPlan(
        intent="inventory",
        requiresTool=True,
        primaryTool="inventory.check",
        allowedTools=["inventory.check", "product.search"],
        slots={"productName": "vision model guess"},
        reason="classified by model",
    )
    ctx.native_tools = [{"name": "inventory_check"}, {"name": "product_search"}]

    result = await route_to_tools(ctx)

    execution = result.execution_plan["deterministicReadExecution"]
    assert execution["nativeName"] == "product.search"
    params = execution["params"]
    assert params["query"] == "do you have the product in this photo?"
    assert params["image_url"] == "https://cdn.example.com/photo.jpg"
    assert params["mime_type"] == "image/jpeg"
    assert "use_vector" not in params


@pytest.mark.asyncio
async def test_route_to_tools_disables_inventory_vector_when_external_embeddings_disabled():
    ctx = PipelineContext(
        message="Sprint X size 42 black",
        thread_id="thread-1",
        company_id="comp1",
        customer_id="cust1",
        channel="facebook",
        external_memory_context={DISABLE_EXTERNAL_EMBEDDING_RETRIEVAL: True},
    )
    ctx.relevance_plan = ToolPlan(
        intent="inventory",
        requiresTool=True,
        primaryTool="inventory.check",
        allowedTools=["inventory.check"],
        slots={"productName": "Sprint X", "productSize": "42", "productColor": "black"},
        reason="classified by model",
    )
    ctx.native_tools = [{"name": "inventory_check"}]

    result = await route_to_tools(ctx)

    params = result.execution_plan["deterministicReadExecution"]["params"]
    assert params["product_name_or_sku"] == "Sprint X"
    assert params["product_size"] == "42"
    assert params["product_color"] == "black"
    assert params["conversation_id"] == "thread-1"
    assert params["use_vector"] is False


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("primary_tool", "slots", "expected_params"),
    [
        (
            "inventory.check",
            {"productName": "black shoes", "size": "42", "color": "black"},
            {
                "product_name_or_sku": "black shoes",
                "product_size": "42",
                "product_color": "black",
                "conversation_id": "thread-1",
            },
        ),
        (
            "shipping.rates",
            {"governorate": "Cairo"},
            {"governorate": "Cairo"},
        ),
        (
            "order.lookup",
            {"orderNumber": "ORD-123"},
            {"order_number": "ORD-123"},
        ),
        (
            "customer.info",
            {"phone": "01001111111"},
            {"query": "01001111111"},
        ),
    ],
)
async def test_route_to_tools_populates_read_tool_params_from_model_slots(primary_tool, slots, expected_params):
    ctx = PipelineContext(
        message="customer message",
        thread_id="thread-1",
        company_id="comp1",
        customer_id="cust1",
        channel="facebook",
    )
    ctx.relevance_plan = ToolPlan(
        intent=primary_tool,
        requiresTool=True,
        primaryTool=primary_tool,
        allowedTools=[primary_tool],
        slots=slots,
        reason="classified by model",
    )
    ctx.native_tools = [{"name": primary_tool.replace(".", "_")}]

    result = await route_to_tools(ctx)

    execution = result.execution_plan["deterministicReadExecution"]
    assert execution["nativeName"] == primary_tool
    assert execution["params"] == expected_params


@pytest.mark.asyncio
async def test_route_to_tools_uses_previous_product_context_for_inventory_followup():
    ctx = PipelineContext(
        message="is size 42 available?",
        thread_id="thread-1",
        company_id="comp1",
        customer_id="cust1",
        channel="facebook",
        external_memory_context={"lastShownProductIds": ["prod_1"]},
    )
    ctx.relevance_plan = ToolPlan(
        intent="inventory",
        requiresTool=True,
        primaryTool="inventory.check",
        allowedTools=["inventory.check"],
        slots={"productSize": "42"},
        reason="classified by model",
    )
    ctx.native_tools = [{"name": "inventory_check"}]

    result = await route_to_tools(ctx)

    execution = result.execution_plan["deterministicReadExecution"]
    assert execution["nativeName"] == "inventory.check"
    assert execution["params"] == {
        "product_name_or_sku": "",
        "product_size": "42",
        "conversation_id": "thread-1",
        "references_previous_product": True,
    }


@pytest.mark.asyncio
async def test_route_to_tools_uses_previous_product_context_for_image_followup():
    ctx = PipelineContext(
        message="send me a product photo",
        thread_id="thread-1",
        company_id="comp1",
        customer_id="cust1",
        channel="facebook",
        external_memory_context={"lastShownProductIds": ["prod_1"]},
    )
    ctx.relevance_plan = ToolPlan(
        intent="inventory",
        requiresTool=True,
        primaryTool="inventory.check",
        allowedTools=["inventory.check"],
        slots={"requestedProductImage": True, "referencesPreviousProduct": True},
        reason="classified by model",
    )
    ctx.native_tools = [{"name": "inventory_check"}]

    result = await route_to_tools(ctx)

    execution = result.execution_plan["deterministicReadExecution"]
    assert execution["nativeName"] == "inventory.check"
    assert execution["params"] == {
        "product_name_or_sku": "",
        "conversation_id": "thread-1",
        "references_previous_product": True,
    }


@pytest.mark.asyncio
async def test_route_to_tools_populates_write_tool_params_from_model_slots():
    from src.tools.registry import get_tool

    ctx = PipelineContext(
        message="create draft order",
        thread_id="thread-1",
        company_id="comp1",
        customer_id="cust1",
        channel="facebook",
    )
    ctx.relevance_plan = ToolPlan(
        intent="orders.create_draft",
        requiresTool=True,
        primaryTool="order.create_draft",
        allowedTools=["order.create_draft"],
        slots={
            "customerName": "Ahmed",
            "customerPhone": "01001111111",
            "productName": "black shoes",
            "productPrice": 1200,
            "productSize": "42",
            "productColor": "black",
            "quantity": 2,
            "address": "Nasr City",
            "city": "Cairo",
        },
        reason="classified by model",
    )
    ctx.native_tools = [get_tool("order_create_draft")]

    result = await route_to_tools(ctx)

    execution = result.execution_plan["deterministicActionExecution"]
    assert execution["nativeName"] == "order.create_draft"
    assert execution["params"] == {
        "customer_name": "Ahmed",
        "customer_phone": "01001111111",
        "product_name": "black shoes",
        "product_price": "1200",
        "product_size": "42",
        "product_color": "black",
        "quantity": "2",
        "address": "Nasr City",
        "city": "Cairo",
        "total": "1200",
    }


@pytest.mark.asyncio
async def test_route_to_tools_populates_confirmed_order_params_from_model_slots():
    from src.tools.registry import get_tool

    ctx = PipelineContext(
        message="confirm order",
        thread_id="thread-1",
        company_id="comp1",
        customer_id="cust1",
        channel="facebook",
    )
    ctx.relevance_plan = ToolPlan(
        intent="orders.create_confirmed",
        requiresTool=True,
        primaryTool="order.create_confirmed",
        allowedTools=["order.create_confirmed"],
        slots={
            "customerName": "Ahmed",
            "customerPhone": "01001111111",
            "productName": "Sprint X Running Shoes",
            "productPrice": 1499,
            "productSize": "42",
            "productColor": "black",
            "quantity": 1,
            "address": "Nasr City",
            "city": "Cairo",
            "confirmedByCustomer": True,
        },
        reason="classified by model",
    )
    ctx.native_tools = [get_tool("order_create_confirmed")]

    result = await route_to_tools(ctx)

    execution = result.execution_plan["deterministicActionExecution"]
    assert execution["nativeName"] == "order.create_confirmed"
    assert execution["params"] == {
        "customer_name": "Ahmed",
        "customer_phone": "01001111111",
        "product_name": "Sprint X Running Shoes",
        "product_price": "1499",
        "product_size": "42",
        "product_color": "black",
        "quantity": "1",
        "address": "Nasr City",
        "city": "Cairo",
        "confirmed_by_customer": True,
        "total": "1499",
    }


@pytest.mark.asyncio
async def test_route_to_tools_populates_confirmed_order_params_from_structured_memory():
    from src.tools.registry import get_tool

    ctx = PipelineContext(
        message="confirm order",
        thread_id="thread-1",
        company_id="comp1",
        customer_id="cust1",
        channel="facebook",
        external_memory_context={
            "lastInventoryParams": {
                "product_name_or_sku": "Sprint X",
            },
            "lastInventoryResult": {
                "productId": "prod_1",
                "price": {"amount": 1499, "currency": "EGP"},
                "requestedSize": "42",
                "requestedColor": "black",
            },
            "lastShippingResult": {
                "city": "Nasr City",
                "governorate": "Cairo",
                "data": {"price": 35, "currency": "EGP"},
            },
        },
    )
    ctx.relevance_plan = ToolPlan(
        intent="orders.create_confirmed",
        requiresTool=True,
        primaryTool="order.create_confirmed",
        allowedTools=["order.create_confirmed"],
        slots={
            "customerName": "Ahmed",
            "customerPhone": "01001111111",
            "quantity": 1,
            "address": "10 Test Street Nasr City Cairo",
            "confirmedByCustomer": True,
        },
        reason="classified by model",
    )
    ctx.native_tools = [get_tool("order_create_confirmed")]

    result = await route_to_tools(ctx)

    execution = result.execution_plan["deterministicActionExecution"]
    assert execution["nativeName"] == "order.create_confirmed"
    assert execution["params"] == {
        "customer_name": "Ahmed",
        "customer_phone": "01001111111",
        "product_name": "Sprint X",
        "product_price": 1499,
        "product_size": "42",
        "product_color": "black",
        "quantity": "1",
        "address": "10 Test Street Nasr City Cairo",
        "city": "Nasr City",
        "shipping_amount": 35,
        "confirmed_by_customer": True,
    }


@pytest.mark.asyncio
async def test_route_to_tools_does_not_execute_clarification_plan():
    ctx = PipelineContext(
        message="create a draft order",
        thread_id="thread-1",
        company_id="comp1",
        customer_id="cust1",
        channel="facebook",
    )
    ctx.relevance_plan = ToolPlan(
        intent="orders.create_draft",
        requiresTool=False,
        primaryTool="order.create_draft",
        allowedTools=["order.create_draft"],
        slots={"productName": "black shoes"},
        missingSlots=["customerPhone"],
        reason="NEEDS_CLARIFICATION",
        blockedReason="NEEDS_CLARIFICATION",
    )
    ctx.native_tools = [{"name": "order_create_draft"}]

    result = await route_to_tools(ctx)

    assert result.execution_plan["deterministicReadExecution"] is None
    assert result.execution_plan["deterministicActionExecution"] is None
