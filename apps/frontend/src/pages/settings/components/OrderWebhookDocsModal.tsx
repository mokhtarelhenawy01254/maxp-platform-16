import React, { useState } from "react";
import { toast } from "sonner";
import {
  Code2,
  Copy,
  Check,
  FileJson,
  ShieldCheck,
  Lightbulb,
  ExternalLink,
  Share2,
} from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

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

export const OrderWebhookDocsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<"payload" | "verification" | "practices">("payload");
  const [codeLang, setCodeLang] = useState<"node" | "python" | "php">("node");
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, id: string, msg: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(id);
    toast.success(msg);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-card border border-border rounded-xl w-full max-w-3xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden text-xs">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Code2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                التوثيق التقني للـ Webhook ونموذج الـ Payload
              </h3>
              <p className="text-[11px] text-muted-foreground">
                الدليل الشامل للربط مع أي نظام خارجي (CRM, Zapier, Make, ERP, Google Sheets)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                handleCopy(
                  FULL_MARKDOWN_DOCS,
                  "all_docs",
                  "تم نسخ التوثيق كاملاً بصيغة Markdown لإرساله للمطور!"
                )
              }
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition shadow-sm"
              title="نسخ التوثيق كاملاً بصيغة Markdown لترسله لمطورك"
            >
              {copiedSection === "all_docs" ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <Share2 className="w-3.5 h-3.5" />
              )}
              <span>نسخ التوثيق للمطور</span>
            </button>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground text-lg leading-none p-1.5"
            >
              ×
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-border bg-muted/10 px-4 pt-2 gap-2">
          <button
            onClick={() => setActiveTab("payload")}
            className={`flex items-center gap-1.5 px-3 py-2 border-b-2 font-medium transition ${
              activeTab === "payload"
                ? "border-primary text-primary font-bold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileJson className="w-3.5 h-3.5" />
            <span>نموذج الـ Payload الكامل</span>
          </button>
          <button
            onClick={() => setActiveTab("verification")}
            className={`flex items-center gap-1.5 px-3 py-2 border-b-2 font-medium transition ${
              activeTab === "verification"
                ? "border-primary text-primary font-bold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>الرؤوس وفحص التوقيع (HMAC)</span>
          </button>
          <button
            onClick={() => setActiveTab("practices")}
            className={`flex items-center gap-1.5 px-3 py-2 border-b-2 font-medium transition ${
              activeTab === "practices"
                ? "border-primary text-primary font-bold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Lightbulb className="w-3.5 h-3.5" />
            <span>أفضل الممارسات والأمان</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* TAB 1: Payload */}
          {activeTab === "payload" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-muted-foreground text-[11px]">
                  يحتوي الـ Payload على كافة تفاصيل الطلب: العميل، الهواتف المتعددة (<code>allPhones</code>)، العنوان المفصل، المنتجات والمتغيرات، الحسابات المالية، ومعايير UTM والـ IP.
                </p>
                <button
                  onClick={() =>
                    handleCopy(
                      JSON.stringify(SAMPLE_WEBHOOK_PAYLOAD, null, 2),
                      "payload_json",
                      "تم نسخ كود الـ JSON إلى الحافظة"
                    )
                  }
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-muted hover:bg-muted/80 text-foreground transition"
                >
                  {copiedSection === "payload_json" ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>نسخ JSON</span>
                </button>
              </div>

              <pre className="p-3.5 rounded-lg bg-zinc-950 text-zinc-100 font-mono text-[11px] overflow-x-auto max-h-[55vh] select-all leading-relaxed border border-border/40">
                {JSON.stringify(SAMPLE_WEBHOOK_PAYLOAD, null, 2)}
              </pre>
            </div>
          )}

          {/* TAB 2: Verification */}
          {activeTab === "verification" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-bold text-foreground">ترويسات الطلب (Request Headers)</h4>
                <div className="border border-border rounded-lg overflow-hidden">
                  <table className="w-full text-left font-mono text-[11px]">
                    <thead className="bg-muted/60 text-muted-foreground border-b border-border">
                      <tr>
                        <th className="p-2 text-right">Header</th>
                        <th className="p-2 text-right">الوصف</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      <tr>
                        <td className="p-2 text-primary font-bold">X-Webhook-Signature</td>
                        <td className="p-2 text-muted-foreground font-sans">
                          توقيع HMAC-SHA256 المشفر بصيغة <code>sha256=HEX_SIGNATURE</code>
                        </td>
                      </tr>
                      <tr>
                        <td className="p-2 text-primary font-bold">X-MaxP-Signature</td>
                        <td className="p-2 text-muted-foreground font-sans">
                          قيمة الـ Hex المباشرة للتوقيع بدون بادئة
                        </td>
                      </tr>
                      <tr>
                        <td className="p-2 text-primary font-bold">X-Webhook-Delivery</td>
                        <td className="p-2 text-muted-foreground font-sans">
                          معرّف فريد للعملية لمنع تكرار معالجة نفس الطلب (Idempotency)
                        </td>
                      </tr>
                      <tr>
                        <td className="p-2 text-primary font-bold">X-Webhook-Timestamp</td>
                        <td className="p-2 text-muted-foreground font-sans">
                          الطابع الزمني للإرسال (Unix Timestamp بالثواني)
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-foreground">كود التحقق من التوقيع (Code Snippet)</h4>
                  <div className="flex gap-1.5 bg-muted p-0.5 rounded">
                    {(["node", "python", "php"] as const).map((lang) => (
                      <button
                        key={lang}
                        onClick={() => setCodeLang(lang)}
                        className={`px-2.5 py-0.5 rounded font-mono font-bold transition ${
                          codeLang === lang
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {lang.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                {codeLang === "node" && (
                  <pre className="p-3 rounded-lg bg-zinc-950 text-zinc-100 font-mono text-[11px] overflow-x-auto select-all leading-relaxed">
{`const crypto = require('crypto');

function verifyMaxPWebhook(rawBody, signatureHeader, secret) {
  const cleanSecret = secret.startsWith('whsec_') ? secret.slice(6) : secret;
  const signature = signatureHeader.replace('sha256=', '');
  const expected = crypto.createHmac('sha256', cleanSecret).update(rawBody, 'utf8').digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}`}
                  </pre>
                )}

                {codeLang === "python" && (
                  <pre className="p-3 rounded-lg bg-zinc-950 text-zinc-100 font-mono text-[11px] overflow-x-auto select-all leading-relaxed">
{`import hmac
import hashlib

def verify_maxp_webhook(raw_body_bytes: bytes, signature_header: str, secret: str) -> bool:
    clean_secret = secret.replace("whsec_", "")
    signature = signature_header.replace("sha256=", "")
    expected = hmac.new(clean_secret.encode('utf-8'), raw_body_bytes, hashlib.sha256).hexdigest()
    return hmac.compare_digest(signature, expected)`}
                  </pre>
                )}

                {codeLang === "php" && (
                  <pre className="p-3 rounded-lg bg-zinc-950 text-zinc-100 font-mono text-[11px] overflow-x-auto select-all leading-relaxed">
{`function verifyMaxPWebhook($rawBody, $signatureHeader, $secret) {
    $cleanSecret = str_replace('whsec_', '', $secret);
    $signature = str_replace('sha256=', '', $signatureHeader);
    $expected = hash_hmac('sha256', $rawBody, $cleanSecret);
    return hash_equals($signature, $expected);
}`}
                  </pre>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Practices */}
          {activeTab === "practices" && (
            <div className="space-y-3 text-muted-foreground leading-relaxed">
              <div className="p-3 rounded-lg border border-border bg-muted/30 space-y-1">
                <h5 className="font-bold text-foreground">1. الرد الفوري بـ HTTP 200 OK</h5>
                <p>
                  يجب أن يرد السيرفر الخاص بك بكود <code>200 OK</code> خلال أقل من 10 ثوانٍ بمجرد استلام الطلب والتحقق من التوقيع، ثم إتمام أي معالجة ثقيلة (كإدخال بيانات في شيتات ضخمة أو إرسال رسائل) في عملية منفصلة في الخلفية (Background Task / Queue).
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/30 space-y-1">
                <h5 className="font-bold text-foreground">2. منع تكرار الطلبات (Idempotency)</h5>
                <p>
                  اعتمد على حقل <code>order.id</code> أو <code>order.orderNumber</code> أو رأس <code>X-Webhook-Delivery</code> كمفتاح فريد لمنع تكرار تسجيل الطلب في حال أعادت الشبكة إرسال الحدث.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/30 space-y-1">
                <h5 className="font-bold text-foreground">3. استغلال مصفوفة الهواتف (allPhones)</h5>
                <p>
                  يتم توفير كل هواتف العميل (الأساسي، الثانوي، الرقم المسجل في تفاصيل الشحن، وأي رقم مكتوب في الملاحظات) مجمعة في <code>order.customer.allPhones</code> لتسهيل الربط مع أنظمة الـ Call Center أو الواتساب.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
