# Exchange Support Policy (سياسة وقواعد الاستبدال)

Use this skill to validate and process customer requests for order exchanges.

## Exchange Eligibility Rules (شروط استحقاق الاستبدال)

You MUST verify the following conditions before approving or facilitating any product exchange:
1. **Previous Order Required (وجود طلب سابق)**: The customer must have an existing order in the system. Use `order.lookup` or `customer.info` to retrieve order history.
2. **Delivered Status (حالة الطلب تم التسليم)**: The order status must be explicitly set to "delivered" (تم التسليم). Do not exchange orders that are pending, shipped but not delivered, or cancelled.
3. **Under 14 Days (ألا يمر أكثر من 14 يوماً)**: The delivery date of the order must not be more than 14 days ago. Calculate this by comparing the current date/time with the order/delivery timestamp. If the time elapsed is more than 14 days, politely reject the exchange request explaining the policy.
4. **Determine the Issue (معرفة سبب الاستبدال والمشكلة)**: You must explicitly ask and know what the issue is with the product (e.g. wrong size, color, damaged item, etc.). Do not proceed without clarifying the specific problem.

## Operational Flow (خطوات العمل)

1. Ask the customer for their order number or look up their orders using `customer.info` / `order.lookup`.
2. Inspect the retrieved order:
   - Check if status is "delivered".
   - Check if the creation/delivery date is within 14 days.
3. Ask the customer to state the reason/issue with the item if they haven't already.
4. If eligible, proceed with routing details or handoff to support (`agent.handoff`) to complete the swap.
5. If ineligible (no previous order, not delivered, or > 14 days), explain the specific reason to the customer politely in Arabic and refuse the exchange.
