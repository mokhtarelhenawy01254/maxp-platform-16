# Product Offers (عروض المنتجات) — WhatsApp auto-send + notifications

Feature shipped 2026-08-27. WhatsApp-only product announcement/offer campaigns for customers.

## What it does

1. **Offers page** `/customers/product-offers` (customers section): create an offer for a product,
   pick the audience (all / with-orders / new customers / active customers), write a message with
   variables `{اسم العميل}` `{customerName}` `{productName}` `{price}`, pick a WhatsApp session,
   optionally schedule, and send. Product image (first image) is sent automatically.
2. **Auto-send per new product**: when `WhatsAppNotificationSettings.newProductAutoSend` is enabled,
   any newly created product (`POST /products`) triggers `services/whatsapp/productOfferService.js`
   → sends the product image + personalized message to the configured audience, fire-and-forget
   (non-blocking) after product creation.
3. **Messages appear in notification logs**: every message from a campaign writes a row in
   `whatsAppNotificationLog` (category `MARKETING`, eventType `NEW_PRODUCT`/`PROMOTIONAL`), so they
   show up in the customer-notifications "تقارير الرسائل" tab.
4. **Products templates tab** in `/customers/customer-notifications`: new tab "قوالب المنتجات والعروض"
   lists/edits WhatsApp templates with category `PRODUCTS` (NEW_PRODUCT, PROMOTIONAL, BACK_IN_STOCK,
   PRICE_DROP, LOW_STOCK_ALERT).

## Files

- `apps/backend/services/whatsapp/productOfferService.js` — `autoSendNewProduct()` core loop.
- `apps/backend/controller/productController.js` — hook after product create (fire-and-forget).
- `apps/backend/controller/customerWhatsAppController.js` — `sendSmartBulkNotification` now accepts
  `customMessage` alias + `eventType` (`NEW_PRODUCT`/`PROMOTIONAL`), audience aliases `new`→`newCustomers`
  and `active`→`activeCustomers`, and writes per-recipient `whatsAppNotificationLog` rows.
  Added `getProductAutoSendSettings` / `saveProductAutoSendSettings`.
- `apps/backend/prisma/schema/marketing.prisma` — `WhatsAppNotificationSettings`: `newProductAutoSend`,
  `newProductAudience`, `newProductNewDays`, `newProductMessage` (applied via `prisma db push` on deploy).
- `apps/backend/routes/customerRoutes.js` — `GET/PUT /customers/whatsapp-notify/auto-send-settings`.
- `apps/frontend/src/pages/customers/ProductOffers.tsx` — the offers management page.
- `apps/frontend/src/pages/templates/scopes/customerScope.ts` — products templates tab + variables.
- `apps/frontend/src/pages/products/...` — WhatsappTab fixes: correct audience values and message payload.
- Tests: `apps/backend/tests/services/productOfferService.test.js`.

## Notes

- Meta-approved templates are content-locked after approval (body/image frozen). The product smart-send
  path sends dynamic text + the product's actual first image via a normal WhatsApp session instead, so
  image and message change per product automatically.
- `newProductEnabled` (legacy field) is unused; the new auto-send uses `newProductAutoSend`.