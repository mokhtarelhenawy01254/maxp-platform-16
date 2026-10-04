import React from 'react';
import { useTranslation } from 'react-i18next';
import { CheckIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { WorkspaceOrder } from './types';
import { parseCleanAddress } from './WorkspaceCustomerEditor';

export interface MetaTemplate {
  id: string;
  name: string;
  status: string;
  category?: string;
  language?: string;
  components?: Array<{
    type: string;
    text?: string;
  }>;
}

interface WorkspaceWhatsAppTemplatesProps {
  order: WorkspaceOrder;
  templates: MetaTemplate[];
  /** نص فقط = قالب سريع يُعبأ في المحادثة؛ metaTemplate موجودة = قالب ميتا يُرسل عبر send-template بمتغيراته */
  onSelectTemplate: (text: string, metaTemplate?: MetaTemplate) => void;
}

export const WorkspaceWhatsAppTemplates: React.FC<WorkspaceWhatsAppTemplatesProps> = ({
  order,
  templates,
  onSelectTemplate,
}) => {
  const { i18n } = useTranslation();
  const isArabic = i18n.language.toLowerCase().startsWith('ar');

  const itemsList =
    order.items
      ?.map((i) => `${i.productName || i.name} × ${i.quantity}`)
      .join('، ') || '';
  const cleanAddr =
    parseCleanAddress(order.shippingAddress) ||
    [order.governorate, order.city].filter(Boolean).join('، ');

  const quickTemplates = [
    {
      id: 'confirm_order',
      title: isArabic ? 'تأكيد الطلب والشحن' : 'Confirm Order & Ship',
      category: isArabic ? 'تأكيد' : 'Confirmation',
      text: isArabic
        ? `أهلاً بحضرتك أ/ ${order.customerName}، يسعدنا تأكيد طلبك رقم #${order.orderNumber} بإجمالي ${order.total} ج.م.\nتفاصيل الطلب: ${itemsList}\nعنوان التوصيل: ${cleanAddr}\nهل نعتمد الشحن اليوم؟`
        : `Hello ${order.customerName}, We are confirming your order #${order.orderNumber} (Total: ${order.total} EGP).\nItems: ${itemsList}\nAddress: ${cleanAddr}\nShould we ship today?`,
    },
    {
      id: 'address_verification',
      title: isArabic ? 'تأكيد العنوان والتوصيل' : 'Address Verification',
      category: isArabic ? 'بيانات' : 'Data',
      text: isArabic
        ? `أهلاً بحضرتك أ/ ${order.customerName}، بخصوص طلبك رقم #${order.orderNumber}:\nنرجو تأكيد العنوان بالتفصيل (المحافظة، المدينة، الشارع، رقم العقار والشقة) لضمان سرعة التسليم لمندوب الشحن.`
        : `Hello ${order.customerName}, for order #${order.orderNumber}, please verify your detailed delivery address to avoid shipping delays.`,
    },
    {
      id: 'no_answer',
      title: isArabic ? 'محاولة اتصال لم يتم الرد' : 'Missed Call Follow-up',
      category: isArabic ? 'متابعة' : 'Follow-up',
      text: isArabic
        ? `أهلاً بحضرتك أ/ ${order.customerName}، حاولنا الاتصال بك هاتفياً لتأكيد شحنتك رقم #${order.orderNumber} ولم نتمكن من الوصول إليك. يسعدنا تأكيد رغبتك بالاستلام أو تحديد موعد مناسب للتواصل.`
        : `Hello ${order.customerName}, we called regarding your order #${order.orderNumber} but missed you. Please let us know a suitable time to reach you.`,
    },
    ...(order.isIncomplete
      ? [
          {
            id: 'cart_recovery',
            title: isArabic ? 'تذكير بالسلة المتروكة' : 'Cart Recovery',
            category: isArabic ? 'سلة' : 'Cart',
            text: isArabic
              ? `أهلاً بك أ/ ${order.customerName}، لاحظنا اهتمامك بطلب ${itemsList} ولم يكتمل الطلب. هل واجهت أي صعوبة؟ يسعدنا مساعدتك وتأكيد الطلب لك فوراً!`
              : `Hello ${order.customerName}, we noticed you left your cart. Can we help you complete your purchase?`,
          },
        ]
      : []),
  ];

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {/* Quick Instant Templates */}
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <SparklesIcon className="h-3.5 w-3.5 text-emerald-600" />
          <h4 className="text-xs font-black uppercase text-muted-foreground">
            {isArabic ? 'قوالب سريعة مجهزة لبيانات الطلب' : 'Quick Ready Templates'}
          </h4>
        </div>
        <div className="space-y-2">
          {quickTemplates.map((tmpl) => (
            <div
              key={tmpl.id}
              className="group flex flex-col justify-between gap-2 rounded-lg border border-border/50 bg-card p-3 transition-colors hover:border-emerald-500/40 hover:bg-emerald-500/5"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">{tmpl.title}</span>
                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                  {tmpl.category}
                </span>
              </div>
              <p className="line-clamp-2 text-xs text-muted-foreground whitespace-pre-wrap">
                {tmpl.text}
              </p>
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => onSelectTemplate(tmpl.text)}
                  className="inline-flex items-center gap-1 rounded bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-emerald-700 active:scale-[0.98] transition-transform"
                >
                  <CheckIcon className="h-3.5 w-3.5" />
                  <span>{isArabic ? 'استخدام في المحادثة' : 'Use in Chat'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Approved Meta Cloud Templates */}
      {templates.length > 0 && (
        <div>
          <div className="mb-2 flex items-center gap-1.5">
            <h4 className="text-xs font-black uppercase text-muted-foreground">
              {isArabic ? 'قوالب Meta Cloud المعتمدة' : 'Approved Meta Templates'}
            </h4>
          </div>
          <div className="space-y-2">
            {templates.map((metaTmpl) => {
              const bodyComp = metaTmpl.components?.find((c) => c.type === 'BODY');
              const bodyText = bodyComp?.text || metaTmpl.name;
              const varCount = (bodyText.match(/\{\{\s*\d+\s*\}\}/g) || []).length;
              return (
                <div
                  key={metaTmpl.id}
                  className="flex flex-col justify-between gap-2 rounded-lg border border-border/50 bg-card p-3 hover:border-primary/40"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-foreground">
                      {metaTmpl.name}
                    </span>
                    <span className="flex items-center gap-1">
                      {varCount > 0 && (
                        <span className="rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                          {varCount} {isArabic ? 'متغير' : 'vars'}
                        </span>
                      )}
                      <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600">
                        APPROVED
                      </span>
                    </span>
                  </div>
                  <p className="line-clamp-2 text-xs text-muted-foreground text-pretty">{bodyText}</p>
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => onSelectTemplate(bodyText, metaTmpl)}
                      className="inline-flex items-center gap-1 rounded border border-border px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-muted"
                    >
                      <span>{isArabic ? 'إرسال كقالب معتمد' : 'Send as Template'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
