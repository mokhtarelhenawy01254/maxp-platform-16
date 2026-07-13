# 10 Swan Store Agent Tests — Scripts for نور (SALES_REP)

## Test 1: Catalog Discovery
**Tools:** product_search, category_list, inventory_check
**Script:**
```
1. السلام عليكم، عايزة أشوف منتجات متجر سوان
2. طيب عرفني على المنتجات اللي عندك
3. هل فيه أحذية حريمي؟
4. عايزة أعرف مقاسات وألوان منتج Flat& High Skotch
5. طيب فيه مقاس 39 وأسود من الكوتشي الاسكوتش؟
6. شكراً
```

## Test 2: Full Purchase Flow
**Tools:** product_search, customer_info, inventory_check, shipping_rates, discount_create_draft, order_create_confirmed, coupon_validate
**Script:**
```
1. مرحباً، عايزة أطلب حذاء
2. عايزة كوتشي اسكوتش أسود مقاس 39
3. أنا اسمي أحمد محمد ورقمي 01123456789 وعنواني القاهرة
4. كام السعر ولو سمحت عايز أعرف تكلفة الشحن للقاهرة
5. فيه عروض أو كود خصم؟
6. تمام أوكد الطلب من فضلك
```

## Test 3: Offers & Coupons Deep Dive
**Tools:** offers_list_active, coupon_validate, product_search
**Script:**
```
1. مرحبا، عايز أعرف العروض المتاحة عندكم
2. عندي كود خصم SAVE10. هل شغال؟
3. طيب فيه عروض شحن مجاني؟
4. عايزة أشتري حاجة من العروض دي
5. ممكن تفاصيل أكتر عن العرض الأول؟
```

## Test 4: Product Performance Analysis
**Tools:** product_top_selling, product_performance, product_search
**Script:**
```
1. صباح الخير، عايزة أعرف أحسن المنتجات مبيعاً عندكم
2. طيب عايزة أداء مبيعات منتج Flat& High Skotch
3. مقارنة بالشهر اللي فات أحسن ولا أسوأ؟
4. طيب عايزة أداء مبيعات Line Up
5. شكراً للتوضيح
```

## Test 5: Customer Deep Dive
**Tools:** customer_info, customer_top_buyers, order_lookup
**Script:**
```
1. مرحباً، عايزة معلومات عن عميل اسمه مختار
2. مين هم أفضل العملاء عندك الفترة دي؟
3. طيب عايزة تفاصيل طلب لرقم 1000
4. وصله من القاهرة ولا لا؟
5. شكراً
```

## Test 6: Order Lifecycle
**Tools:** order_lookup, order_create_confirmed, knowledge_ask_merchant, whatsapp_send
**Script:**
```
1. السلام عليكم، عايزة أستفسر عن طلب
2. عايزة طلب رقم 2000
3. عايزة أعمل طلب جديد: سارة علي، 01098765432، منتج Platform Sneakers، مقاس 38، القاهرة
4. هل ينفع أتواصل مع العميل ع الواتساب عشان أأكد الطلب؟
5. شكراً
```

## Test 7: Knowledge Base QA
**Tools:** knowledge_search, knowledge_create_faq, knowledge_ask_merchant
**Script:**
```
1. مرحبا، عندي استفسار عن سياسة الاستبدال والاسترجاع
2. طيب فيه سياسة للشحن؟
3. هل تقدر تسجل سؤال للبيعات؟ أنا عايز أعرف لو في تخفيضات قريب
4. عايز أضيف سؤال جديد للأسئلة الشائعة: كم مدة التوصيل؟
5. شكراً
```

## Test 8: Abandoned Cart Recovery
**Tools:** abandoned_carts, customer_info, product_search, whatsapp_send (optional)
**Script:**
```
1. مرحباً، عايزة أعرف مين العملاء اللي سابوا عربيات التسوق
2. طيب عايزة معلومات عن أول عميل فيهم
3. ممكن تشوف المنتج اللي كان عايزه؟
4. كويس، شكراً
```

## Test 9: Multi-Skill Complex Sale
**Tools:** product_search, offers_list_active, coupon_validate, customer_info, order_create_confirmed, shipping_rates, discount_create_draft
**Script:**
```
1. السلام عليكم، عايزة هدية لأختي
2. عايزة حذاء مناسب، وليكن Platform Sneakers.
3. هل فيه منه لون روز مقاس 37؟ ولو عرفت السعر
4. عندي كود هدية WELCOME لو اشتريت اتنين
5. كام تكلفة الشحن للاسكندرية؟
6. طيب عايزة أعمل طلب: نورهان محمود، 01234567890، Platform Sneakers روز مقاس 37، اسكندرية، كود WELCOME
7. أوكد الطلب من فضلك
```

## Test 10: Edge Cases & Error Handling
**Tools:** all 19 tools
**Script:**
```
1. مرحبا
2. !@#$%^&*() (special chars test)
3. عايزة منتج مش موجود خالص (handling not found)
4. عايزة عميل برقم تلفون غلط (handling invalid input)
5. عايزة طلب برقم سالب -1 (edge case)
6. عايزة أطلب 1000 حذاء (unreasonable quantity)
7. شكراً
```
