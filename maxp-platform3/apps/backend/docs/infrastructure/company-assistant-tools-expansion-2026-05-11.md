# Company Assistant Tools Expansion - 2026-05-11

## Summary

Company Assistant now has broader company-platform coverage instead of only the original order/product/task subset. The expansion adds read tools for partners, merchants, procurement, returns, billing, POS, HR, support, notifications, and sales analytics, plus guarded write tools for order status, product visibility, support tickets, and assistant notification preferences.

## Added Tools

- `get_affiliate_performance`
- `get_merchant_balance`
- `get_procurement_summary`
- `list_returns`
- `get_billing_summary`
- `get_pos_sales_summary`
- `get_hr_attendance_summary`
- `list_support_tickets`
- `get_notification_summary`
- `get_sales_analytics`
- `update_order_status`
- `update_product_visibility`
- `create_support_ticket`
- `create_assistant_notification_rule`

## Safety Model

Write tools require explicit confirmation through the existing pending-action flow. The operator must reply with the generated `نفذ <code>` confirmation key before the action is executed. The new write tools use the existing `assistant:write` scope, while task creation still requires `tasks:write`.

`create_assistant_notification_rule` records an assistant preference and creates an immediate in-app notification when a channel owner exists. It is not a full scheduled delivery engine yet, so the Telegram site scenario catalog marks scheduled notifications as partial.

## HR Attendance Data Robustness

`get_hr_attendance_summary` now tolerates attendance rows where `employeeRelId` is empty or points to a missing HR employee. The tool falls back to the linked `user` relation for display names and returns `null` names rather than throwing, which keeps live company checks such as Swan attendance summaries executable even when historic attendance data is partially linked.

## Conversation Guardrails

Control-style replies such as source metadata explanations and new conversation acknowledgements are now validated after AI phrasing. If the generated reply is empty, JSON-only, tool-call-like, or omits required source/context wording, the assistant returns the deterministic fallback reply and records the fallback reason in response-source metadata.

Tool-result replies also reject JSON-only output and enforce a small domain-word check for warehouse and WhatsApp summaries, so live scenario runs do not pass raw tool payloads or omit the channel/tool name from user-facing answers.

## Skills And Scenarios

The default skill catalog now includes:

- `partner_network` for affiliates and merchants.
- `people_ops` for HR attendance.
- `finance_admin` for billing, POS, and sales analytics.

The Swan scenario runner now covers the new read tools and confirmation previews for the four write tools. The Telegram site scenario catalog was updated so newly covered areas are no longer reported as gaps.
