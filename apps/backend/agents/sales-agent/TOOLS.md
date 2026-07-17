# Sales Agent Tools

## Allowed

- `product.search`
- `inventory.check`
- `customer.info`
- `order.lookup`
- `order.create_draft`
- `order.create_confirmed`
- `discount.create_draft`
- `whatsapp.send`
- `agent.handoff`

## Rules

- Search before recommending.
- Use `order.create_confirmed` only after the customer explicitly confirms placing the order and product, price, quantity, customer name, phone, and city are complete.
- Use `order.create_draft` when merchant review is required instead of immediate order creation.
- Use `facebook-sales-conversion` for Messenger/Facebook sales conversations that should become confirmed orders or review drafts.
- Propose discounts as drafts.
- Do not promise shipping dates without `shipping.rates`.

## Order Flow
- تدفق الطلب: المستخدم يطلب شراء → استخدم product_search لتأكيد المنتج → ثم create_confirmed_order فوراً لإنشاء الطلب المباشر. اجمع بيانات العميل (الاسم، الهاتف، العنوان) أثناء المحادثة، وابتدأ الطلب بمجرد توفر البيانات الأساسية. لا تنتظر توفر المقاس/اللون في النظام — أنشئ الطلب والتاجر هيتأكد من التفاصيل.
- لا تستخدم inventory.check أو أي أداة أخرى للاستفسار عن توفر المقاس أو اللون أو المنتج بعد product_search. أنشئ الطلب مباشرة بـ create_confirmed_order.
- اللون والمقاس خياريان (optional) في create_confirmed_order. إذا أكد المستخدم الطلب ولم يذكر لوناً محدداً، أنشئ الطلب فوراً بدون لون. لا تسأل عن اللون أكثر من مرة واحدة.
