import React, { useState } from "react";
import {
  ChevronLeft,
  ChevronDown,
  ExternalLink,
  Copy,
  CheckCircle2,
  Check,
} from "lucide-react";
import { buildWebhookUrl } from "../../utils/urlHelper";

interface GuideStep {
  id: number;
  title: string;
  description: string;
  details: string[];
  links?: { text: string; url: string }[];
  code?: string;
}

const FacebookSetupGuide: React.FC = () => {
  const [expandedStep, setExpandedStep] = useState<number | null>(1);
  const [copiedCode, setCopiedCode] = useState(false);

  const webhookUrl = buildWebhookUrl();

  const steps: GuideStep[] = [
    {
      id: 1,
      title: "إنشاء تطبيق Facebook App",
      description: "إنشاء تطبيق Facebook جديد في منصة Facebook Developers",
      details: [
        "اذهب إلى Facebook for Developers",
        'انقر على "My Apps" ثم "Create App"',
        'اختر "Business" كنوع التطبيق',
        "أدخل اسم التطبيق ومعلومات الاتصال",
        'انقر على "Create App ID"',
      ],
      links: [
        {
          text: "Facebook for Developers",
          url: "https://developers.facebook.com/",
        },
      ],
    },
    {
      id: 2,
      title: "إضافة Messenger Platform",
      description: "إضافة منتج Messenger إلى التطبيق",
      details: [
        'في لوحة تحكم التطبيق، انقر على "Add Product"',
        'ابحث عن "Messenger" وانقر على "Set Up"',
        "ستظهر إعدادات Messenger في القائمة الجانبية",
      ],
    },
    {
      id: 3,
      title: "إعداد Webhook",
      description: "ربط التطبيق بخادم المنصة",
      details: [
        'في إعدادات Messenger، اذهب إلى "Webhooks"',
        'انقر على "Add Callback URL"',
        "أدخل Webhook URL من إعدادات المنصة",
        "أدخل Verify Token من إعدادات المنصة",
        "اختر الأحداث المطلوبة (messages, messaging_postbacks, etc.)",
        'انقر على "Verify and Save"',
      ],
      code: webhookUrl,
    },
    {
      id: 4,
      title: "الحصول على Page Access Token",
      description: "الحصول على رمز الوصول للصفحة",
      details: [
        'في إعدادات Messenger، اذهب إلى "Access Tokens"',
        'انقر على "Add or Remove Pages"',
        "اختر الصفحة التي تريد ربطها",
        'انقر على "Generate Token"',
        "انسخ Page Access Token واحفظه بأمان",
      ],
    },
    {
      id: 5,
      title: "ربط الصفحة في المنصة",
      description: "إدخال معلومات الصفحة في إعدادات المنصة",
      details: [
        "اذهب إلى إعدادات Facebook Messenger في المنصة",
        'انقر على "ربط صفحة جديدة"',
        "أدخل اسم الصفحة",
        "أدخل Page ID (يمكن العثور عليه في About الصفحة)",
        "أدخل Page Access Token الذي حصلت عليه",
        'انقر على "ربط الصفحة"',
      ],
    },
    {
      id: 6,
      title: "اختبار التكامل",
      description: "التأكد من عمل التكامل بشكل صحيح",
      details: [
        "أرسل رسالة إلى صفحة Facebook من حساب شخصي",
        "تحقق من وصول الرسالة إلى المنصة",
        "جرب الرد من المنصة",
        "تأكد من وصول الرد إلى Facebook Messenger",
      ],
    },
  ];

  const toggleStep = (stepId: number) => {
    setExpandedStep(expandedStep === stepId ? null : stepId);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="w-full space-y-4" dir="rtl">
      <div className="bg-card rounded-2xl border border-border/70 p-5 shadow-2xs">
        <div className="pb-4 border-b border-border/60">
          <h2 className="text-base sm:text-lg font-bold text-foreground">
            دليل إعداد Facebook Messenger
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            خطوات مفصلة خطوة بخطوة لربط صفحة فيسبوك بالمنصة وتفعيل الرد التلقائي
          </p>
        </div>

        <div className="pt-4 space-y-3">
          {steps.map((step) => {
            const isExpanded = expandedStep === step.id;
            return (
              <div
                key={step.id}
                className="border border-border/70 rounded-xl bg-card transition-all overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => toggleStep(step.id)}
                  className="w-full p-3.5 text-right flex items-center justify-between hover:bg-muted/40 transition-colors cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="shrink-0 w-6 h-6 bg-primary/10 text-primary border border-primary/20 rounded-full flex items-center justify-center text-xs font-mono font-bold">
                      {step.id}
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-xs font-bold text-foreground truncate">
                        {step.title}
                      </h3>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {step.description}
                      </p>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronLeft className="h-4 w-4 text-muted-foreground shrink-0 rtl:rotate-0 ltr:rotate-180" />
                  )}
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 pt-2 border-t border-border/60 space-y-3 text-xs bg-muted/20">
                    <ol className="space-y-1.5 text-muted-foreground list-decimal list-inside leading-relaxed">
                      {step.details.map((detail, detailIndex) => (
                        <li key={detailIndex}>
                          <span className="text-foreground">{detail}</span>
                        </li>
                      ))}
                    </ol>

                    {step.code && (
                      <div className="pt-2">
                        <span className="font-semibold text-foreground block mb-1">
                          رابط الويب هوك (Callback URL):
                        </span>
                        <div className="bg-muted/60 border border-border/60 p-2.5 rounded-xl flex items-center justify-between gap-2">
                          <code className="text-xs font-mono text-foreground truncate">
                            {step.code}
                          </code>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(step.code!)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-border/70 bg-card hover:bg-muted text-muted-foreground hover:text-foreground active:scale-95 transition-all text-xs shrink-0"
                            title="نسخ الرابط"
                          >
                            {copiedCode ? (
                              <>
                                <Check className="h-3.5 w-3.5 text-emerald-500" />
                                <span className="text-emerald-600 dark:text-emerald-400">تم النسخ</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3.5 w-3.5" />
                                <span>نسخ</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {step.links && (
                      <div className="pt-1 flex flex-wrap gap-2">
                        {step.links.map((link, linkIndex) => (
                          <a
                            key={linkIndex}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-primary hover:underline font-semibold text-xs"
                          >
                            <span>{link.text}</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Tips footer */}
        <div className="mt-4 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-start gap-2.5 text-xs text-emerald-800 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5 leading-relaxed">
            <h4 className="font-bold text-emerald-700 dark:text-emerald-300">إرشادات هامة:</h4>
            <p>تأكد من أن صفحة فيسبوك منشورة وليست في وضع المسودة، واحتفظ برمز الوصول (Token) في مكان آمن.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FacebookSetupGuide;
