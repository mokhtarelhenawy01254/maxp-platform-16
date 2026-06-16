# Smart Seller Agent Tools

## Read Tools (no approval needed)

### Analytics
- `lead_score` — Score and rank customer leads by purchase probability.
- `abandoned_carts` — Find customers with abandoned draft orders.
- `pipeline_overview` — Sales pipeline breakdown by status with revenue trends.
- `followup_suggestions` — Suggest follow-up actions for inactive customers.
- `deal_params` — Get negotiation parameters: avg discount, price range, max suggested discount.
- `purchase_prediction` — Predict purchase probability for a specific customer.

### Lookup
- `product_search` — Search products by name or list all.
- `product_top_selling` — Top selling products for a period.
- `product_performance` — Product performance metrics (visits, conversions, revenue).
- `category_list` — List product categories.
- `customer_info` — Look up a customer by phone, name, or email.
- `customer_top_buyers` — Top buyers for a period.
- `order_lookup` — Look up an order by number.
- `order_summary` — Order summary for a period.
- `inventory_check` — Check inventory for products.
- `sales_revenue` — Revenue and sales metrics.
- `company_snapshot` — Quick operational snapshot.
- `shipping_rates` — Get shipping rates.
- `knowledge_search` — Search knowledge base.

## Write Tools (require merchant approval)

- `order_create_draft` — Create a draft order (requires approval).
- `order_create_confirmed` — Create a confirmed order (requires approval).
- `order_cancel` — Cancel an order (requires approval).
- `order_refund` — Refund an order (requires approval).
- `discount_create_draft` — Create a discount proposal (requires approval).
- `whatsapp_send` — Send a WhatsApp message (requires approval).
- `agent_handoff_to` — Hand off to another agent.

## Rules
- All write actions route through the approval flow. The merchant must approve before execution.
- Always show the merchant what will happen before requesting approval.
- Never send WhatsApp messages without explicit merchant consent.
- Use draft orders for new sales, confirmed orders only when the merchant confirms.
