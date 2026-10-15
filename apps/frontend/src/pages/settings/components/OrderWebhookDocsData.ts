export const SAMPLE_WEBHOOK_PAYLOAD = {
  event: "order.created",
  eventId: "a918f432-8df2-4217-bc1a-4298150c1de4",
  timestamp: "2026-09-23T20:30:00.000Z",
  company: {
    id: "cm7890abcdef123456",
    name: "متجر سوان",
    slug: "swan",
  },
  order: {
    id: "ord_9876543210fedcba",
    orderNumber: "ORD-10025",
    status: "PENDING",
    customStatusCode: null,
    sourceType: "storefront",
    orderSource: "REGULAR",
    externalId: null,
    createdAt: "2026-09-23T20:29:55.000Z",
    updatedAt: "2026-09-23T20:29:55.000Z",
    confirmedAt: null,
    scheduledDeliveryDate: null,

    customer: {
      id: "cust_1122334455",
      name: "أحمد محمود علي",
      firstName: "أحمد",
      lastName: "محمود علي",
      phone: "01012345678",
      phoneNormalized: "+201012345678",
      secondaryPhone: "01198765432",
      allPhones: ["01012345678", "01198765432"],
      email: "ahmed.customer@gmail.com",
      notes: "عميل متكرر",
    },

    shipping: {
      recipientName: "أحمد محمود علي",
      recipientPhone: "01012345678",
      secondaryPhone: "01198765432",
      address: "15 شارع الثورة، الدور 4، شقة 10، مصر الجديدة، القاهرة",
      street: "شارع الثورة",
      building: "عمارة 15",
      floor: "4",
      apartment: "10",
      landmark: "بجوار محطة المترو",
      city: "مصر الجديدة",
      governorate: "القاهرة",
      country: "EG",
      postalCode: null,
      shippingCost: 50.0,
    },

    billing: {
      address: "15 شارع الثورة، الدور 4، شقة 10، مصر الجديدة، القاهرة",
      city: "مصر الجديدة",
      governorate: "القاهرة",
      country: "EG",
    },

    financials: {
      subtotal: 750.0,
      shippingCost: 50.0,
      discountAmount: 50.0,
      taxAmount: 0.0,
      total: 750.0,
      currency: "EGP",
      paymentMethod: "CASH",
      paymentStatus: "PENDING",
      codDepositAmount: 0.0,
      codDepositPaid: false,
      couponCode: "WELCOME2026",
      discountReason: "كوبون ترويجي 50 جنيه",
    },

    items: [
      {
        id: "item_12345",
        productId: "prod_67890",
        productName: "تيشيرت كاجوال قطني أوفر سايز",
        productSku: "TSH-OVR-BLK-L",
        productImage: "https://cdn.maxp.online/products/tshirt-black.jpg",
        quantity: 2,
        unitPrice: 375.0,
        totalPrice: 750.0,
        basePrice: 220.0,
        merchantPrice: 260.0,
        variant: {
          variantId: "var_998877",
          color: "أسود",
          size: "L",
          sku: "TSH-OVR-BLK-L",
          image: "https://cdn.maxp.online/products/tshirt-black-l.jpg",
          attributes: {
            color: "أسود",
            size: "L",
          },
        },
        details: null,
      },
    ],

    notes: {
      customerNotes: "يرجى الاتصال قبل الوصول بنصف ساعة",
      orderNotes: "طلب من الموقع - ORD-10025",
      confirmationNotes: null,
    },

    attribution: {
      utm_source: "facebook",
      utm_medium: "cpc",
      utm_campaign: "summer_sale_2026",
      utm_term: "fashion_egypt",
      utm_content: "video_creative_v1",
      platform: "facebook",
      referrer: "https://l.facebook.com/",
      landingPath: "/product/casual-tshirt",
      fbclid: "IwAR0a1b2c3d4e5f6g7h8i9j",
      gclid: null,
      ttclid: null,
      adId: "12020987654321",
      adSetId: "12020987654320",
      campaignId: "12020987654319",
    },

    telemetry: {
      clientIp: "197.38.120.45",
      ipCity: "Cairo",
      ipGovernorate: "Cairo",
      ipCountry: "EG",
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
      durationSeconds: 165,
      pagesVisitedCount: 4,
      firstSeenAt: "2026-09-23T20:27:10.000Z",
      sessionStartedAt: "2026-09-23T20:27:10.000Z",
    },

    metadata: {
      couponCode: "WELCOME2026",
      discountReason: "كوبون ترويجي 50 جنيه",
    },
  },
};

export const FULL_MARKDOWN_DOCS = `# توثيق الويب هوك للطلبات (MaxP Order Webhook API)

## 1. تفاصيل الاتصال
- **Method:** POST
- **Content-Type:** application/json
- **User-Agent:** MaxP-Webhook/1.0
- **Timeout:** 10 ثوانٍ (يُرجى الرد بكود 200 OK فور الاستلام والمعالجة في الخلفية).

### ترويسات الأمان (Headers)
- \`X-Webhook-Event\`: نوع الحدث (order.created أو test.ping)
- \`X-Webhook-Delivery\`: معرّف فريد لكل عملية إرسال (UUID) لمنع التكرار
- \`X-Webhook-Timestamp\`: وقت الإرسال بالثواني (Unix Timestamp)
- \`X-Webhook-Signature\`: توقيع HMAC-SHA256 بصيغة sha256=HEX_SIGNATURE
- \`X-MaxP-Signature\`: التوقيع المشفر المباشر (HEX فقط)

## 2. التحقق من التوقيع (HMAC-SHA256)
قم بحساب HMAC-SHA256 لـ Raw Request Body باستخدام الـ Secret Key الخاص بك:

### Node.js:
\`\`\`javascript
const crypto = require('crypto');
function verifyWebhook(rawBody, signatureHeader, secret) {
  const cleanSecret = secret.startsWith('whsec_') ? secret.slice(6) : secret;
  const signature = signatureHeader.replace('sha256=', '');
  const expected = crypto.createHmac('sha256', cleanSecret).update(rawBody, 'utf8').digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
\`\`\`

### Python:
\`\`\`python
import hmac, hashlib
def verify_webhook(raw_body_bytes, signature_header, secret):
    clean_secret = secret.replace("whsec_", "")
    signature = signature_header.replace("sha256=", "")
    expected = hmac.new(clean_secret.encode('utf-8'), raw_body_bytes, hashlib.sha256).hexdigest()
    return hmac.compare_digest(signature, expected)
\`\`\`

### PHP:
\`\`\`php
function verifyWebhook($rawBody, $signatureHeader, $secret) {
    $cleanSecret = str_replace('whsec_', '', $secret);
    $signature = str_replace('sha256=', '', $signatureHeader);
    $expected = hash_hmac('sha256', $rawBody, $cleanSecret);
    return hash_equals($signature, $expected);
}
\`\`\`

## 3. نموذج الـ Payload الكامل (JSON)
\`\`\`json
${JSON.stringify(SAMPLE_WEBHOOK_PAYLOAD, null, 2)}
\`\`\`
`;
