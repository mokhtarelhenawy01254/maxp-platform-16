# Affiliate Order Tickets - 2026-05-03

## Summary

Affiliates can now open a support ticket directly from an affiliate-owned order detail page. The ticket is linked to `SupportTicket.orderId` and mirrored into `OrderNote`, so company staff can see the affiliate request on the order record.

## Flow

- Affiliate opens `/affiliates/orders/:orderId`.
- The details API includes `supportTickets` for the order.
- Affiliate submits a ticket reason and message to `POST /api/v1/affiliates/orders/:id/tickets`.
- Backend verifies the order belongs to the authenticated affiliate before creating anything.
- Backend creates:
  - `SupportTicket` with `orderId`.
  - Initial `SupportMessage`.
  - `OrderNote` containing the ticket reference and affiliate message.

## Ticket Reasons

- `CANCEL_ORDER`: customer cancellation request, high priority.
- `CHANGE_ADDRESS`: shipping/customer data change.
- `SHIPPING_DELAY`: shipping or delay follow-up.
- `CUSTOMER_NOTE`: customer note.
- `OTHER`: general order follow-up.

## Verification

- `node --check routes/affiliateRoutes.js`
- `node --check services/affiliateService.js`
- Focused backend/frontend tests should cover scoped order details and ticket creation.
