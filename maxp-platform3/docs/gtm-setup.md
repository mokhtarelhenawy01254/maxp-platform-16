# Google Tag Manager Setup (Storefront)

هذا الدليل يوضح كيفية ربط GTM بالأحداث التي يرسلها المتجر عبر `dataLayer`.

## 1) Data Layer Variables
أنشئ المتغيرات التالية من نوع Data Layer Variable:

- `DLV - event_id` → `event_id`
- `DLV - ecommerce` → `ecommerce`
- `DLV - ecommerce.items` → `ecommerce.items`
- `DLV - ecommerce.value` → `ecommerce.value`
- `DLV - ecommerce.currency` → `ecommerce.currency`
- `DLV - ecommerce.transaction_id` → `ecommerce.transaction_id`
- `DLV - search_term` → `search_term`

## 2) Custom Event Triggers
أنشئ Triggers من نوع Custom Event بالأسماء:

- `page_view`
- `view_item`
- `add_to_cart`
- `begin_checkout`
- `purchase`
- `search`
- `add_to_wishlist`

## 3) ربط البكسلات
### Facebook Pixel (عبر GTM)
اربط الأحداث بـ:
- `ViewContent` ← `view_item`
- `AddToCart` ← `add_to_cart`
- `InitiateCheckout` ← `begin_checkout`
- `Purchase` ← `purchase`
- `Search` ← `search`
- `AddToWishlist` ← `add_to_wishlist`

**Parameters المقترحة:**
- `content_ids` ← `{{DLV - ecommerce.items}}[].item_id`
- `value` ← `{{DLV - ecommerce.value}}`
- `currency` ← `{{DLV - ecommerce.currency}}`
- `eventID` ← `{{DLV - event_id}}`

### TikTok Pixel (عبر GTM)
اربط الأحداث بـ:
- `ViewContent` ← `view_item`
- `AddToCart` ← `add_to_cart`
- `InitiateCheckout` ← `begin_checkout`
- `Purchase` ← `purchase`
- `Search` ← `search`
- `AddToWishlist` ← `add_to_wishlist`

**Parameters المقترحة:**
- `content_id` ← `{{DLV - ecommerce.items}}[0].item_id`
- `content_name` ← `{{DLV - ecommerce.items}}[0].item_name`
- `value` ← `{{DLV - ecommerce.value}}`
- `currency` ← `{{DLV - ecommerce.currency}}`
- `event_id` ← `{{DLV - event_id}}`

## 4) GA4 (اختياري)
اربط الأحداث بـ GA4 Event مع نفس اسم الحدث، وأرسل:
- `items` ← `{{DLV - ecommerce.items}}`
- `value` ← `{{DLV - ecommerce.value}}`
- `currency` ← `{{DLV - ecommerce.currency}}`
- `transaction_id` ← `{{DLV - ecommerce.transaction_id}}`

## 5) إعدادات النظام
من لوحة النظام:

- فعّل `gtmEnabled`
- ضع `gtmContainerId`
- فعّل `gtmDataLayerEnabled`
- فعّل `gtmTrackPageView` لو عايز PageView للـ SPA
- فعّل `gtmSuppressPixels` إذا كنت ستطلق البكسلات من GTM
