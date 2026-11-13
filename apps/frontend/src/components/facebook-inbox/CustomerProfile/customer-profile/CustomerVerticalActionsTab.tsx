import React, { useState } from "react";
import {
  CalendarPlus,
  ShoppingBag,
  Stethoscope,
  Wrench,
  ListTodo,
  ExternalLink,
  RefreshCw,
  Sparkles,
  Copy,
  Check,
  Megaphone,
} from "lucide-react";
import { InboxConversation } from "../../../../types/inbox.types";
import type { CustomerProfileVerticalCapabilities } from "./types";
import { getInboxExternalImageUrl } from "../../../../utils/imageUrl";

export interface CustomerVerticalActionsTabProps {
  conversation: InboxConversation;
  verticalCapabilities?: CustomerProfileVerticalCapabilities;
  onPrimaryAction?: () => void;
  onCreateOrder?: () => void;
  onOpenServiceOrder?: () => void;
  onOpenTasks?: () => void;
  onInsertSnippet?: (text: string) => void;
  syncMessage: string | null;
  syncingMessages: boolean;
  onSyncMessages: () => void;
}

interface QuickPreset {
  id: string;
  label: string;
  snippet: string;
}

const VERTICAL_PRESETS: Record<string, QuickPreset[]> = {
  education: [
    {
      id: "distance_objection",
      label: "📍 اعتراض المسافة (عرض كورس أونلاين تفاعلي)",
      snippet:
        "ولا يهمك يا فندم، متاح عندنا نظام الأونلاين التفاعلي لايف مع المدرب بنفس جودة ونظام الحضور بالفرع، تحب نحدد معاد ديمو أونلاين مجاناً؟",
    },
    {
      id: "pricing_objection",
      label: "💰 استفسار المصاريف والتقسيط",
      snippet:
        "مصاريف المستوى بتبدأ من 800ج حتى 1000ج شهرياً حسب المرحلة العمرية للطالب، وكمان متاح خصم عند الاشتراك في الباقة التراكمية.",
    },
    {
      id: "demo_schedule",
      label: "📅 مواعيد الديمو داي بالفرع",
      snippet:
        "الديمو داي بيكون يوم الجمعة الساعة 4 العصر أسبوعياً بالفرع مجاناً، تشرفونا.",
    },
    {
      id: "age_groups",
      label: "👶 الفئات العمرية المتاحة",
      snippet:
        "الكورسات مقسمة حسب السن: من 6-9 سنوات (Junior)، ومن 10-13 سنة (Intermediate)، ومن 14-17 سنة (Advanced). سن البطل كام سنة؟",
    },
  ],
  commerce: [
    {
      id: "shipping_time",
      label: "🚚 مصاريف الشحن وموعد التوصيل",
      snippet:
        "التوصيل متاح لجميع محافظات مصر خلال 2-4 أيام عمل، والدفع عند الاستلام مع إمكانية المعاينة قبل الاستلام.",
    },
    {
      id: "return_policy",
      label: "🔄 سياسة الاستبدال والاسترجاع",
      snippet:
        "متاح استبدال واسترجاع خلال 14 يوم من تاريخ الاستلام في حالة وجود أي عيب صناعة أو عدم تطابق المقاس.",
    },
    {
      id: "payment_methods",
      label: "💳 طرق الدفع المتاحة",
      snippet:
        "متاح الدفع نقداً عند الاستلام، أو تحويل فوري عبر إنستاباي / محفظة فودافون كاش، أو بالفيزا أونلاين.",
    },
  ],
  medical: [
    {
      id: "clinic_schedule",
      label: "🏥 مواعيد العيادة والحجز",
      snippet:
        "مواعيد العيادة يومياً من 4 مساءً حتى 10 مساءً، ويفضل الحجز المسبق لتجنب الانتظار.",
    },
    {
      id: "pre_visit_prep",
      label: "📋 تحضيرات ما قبل الكشف",
      snippet:
        "يرجى إحضار أي تحاليل أو أشعات سابقة خاصة بالحالة لمراجعتها مع الطبيب أثناء الكشف.",
    },
  ],
  dental: [
    {
      id: "case_duration",
      label: "⏱️ مدة تسليم الحالة",
      snippet:
        "مدة تصنيع التركيبة من 3 إلى 5 أيام عمل، ومتاح تسليم سريع (Urgent) خلال 48 ساعة حسب الاتفاق.",
    },
    {
      id: "shade_guide",
      label: "🦷 تحديد اللون والمقاس",
      snippet:
        "يرجى توضيح درجة اللون المطلوبة (Shade) ورقم الأسنان وملاحظات التحضير لضمان مطابقة التركيبة بدقة.",
    },
  ],
  services: [
    {
      id: "inspection_visit",
      label: "🔧 موعد المعاينة وتكلفة الكشف",
      snippet:
        "المعاينة بتتم خلال 24 ساعة من تسجيل الطلب، وقيمة الكشف الفني تُخصم من إجمالي الفاتورة في حالة إتمام الإصلاح.",
    },
  ],
  agency: [
    {
      id: "discovery_meeting",
      label: "📅 حجز جلسة استشارية أولى",
      snippet:
        "يسعدنا تحديد جلسة استكشافية سريعة عبر زووم لمراجعة أهداف الحملة ووضع خطة العمل المقترحة.",
    },
  ],
};

export const CustomerVerticalActionsTab: React.FC<CustomerVerticalActionsTabProps> = ({
  conversation,
  verticalCapabilities,
  onPrimaryAction,
  onCreateOrder,
  onOpenServiceOrder,
  onOpenTasks,
  onInsertSnippet,
  syncMessage,
  syncingMessages,
  onSyncMessages,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const vertical = verticalCapabilities?.vertical || "commerce";
  const primaryAction = verticalCapabilities?.primaryAction;
  const specialtyLabel = verticalCapabilities?.specialtyLabel || "نشاط تجاري";

  const presets = VERTICAL_PRESETS[vertical] || VERTICAL_PRESETS.commerce;

  const handleCopyOrInsert = (preset: QuickPreset) => {
    if (onInsertSnippet) {
      onInsertSnippet(preset.snippet);
      setCopiedId(preset.id);
      setTimeout(() => setCopiedId(null), 1500);
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(preset.snippet);
      setCopiedId(preset.id);
      setTimeout(() => setCopiedId(null), 1500);
    }
  };

  const renderActionIcon = () => {
    switch (primaryAction?.id) {
      case "dental_case":
        return <Stethoscope className="w-4 h-4 shrink-0" />;
      case "appointment":
        return <CalendarPlus className="w-4 h-4 shrink-0" />;
      case "service_order":
        return <Wrench className="w-4 h-4 shrink-0" />;
      case "task":
        return <ListTodo className="w-4 h-4 shrink-0" />;
      default:
        return <ShoppingBag className="w-4 h-4 shrink-0" />;
    }
  };

  return (
    <div className="space-y-4 text-foreground">
      {/* 1. Primary Vertical Operational Action */}
      <div className="rounded-xl border border-border/60 bg-card p-3 shadow-2xs">
        <div className="flex items-center justify-between mb-2 pb-2 border-b border-border/40">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-primary" />
            <span className="text-xs font-semibold text-foreground">
              {specialtyLabel}
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md">
            إجراءات فورية
          </span>
        </div>

        {primaryAction && onPrimaryAction && (
          <button
            type="button"
            onClick={onPrimaryAction}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 active:scale-[0.98] transition-all cursor-pointer"
          >
            {renderActionIcon()}
            <span>{primaryAction.label}</span>
          </button>
        )}

        {/* Education Specific Fast Actions */}
        {vertical === "education" && onPrimaryAction && (
          <div className="mt-2.5 pt-2 border-t border-border/40 grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={onPrimaryAction}
              className="px-2 py-1.5 rounded-md text-[11px] font-medium bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200 border border-amber-200/60 hover:bg-amber-100 transition-colors text-center"
              title="تسجيل حجز ديمو داي الجمعة 4:00م"
            >
              ديمو الجمعة (4:00م)
            </button>
            <button
              type="button"
              onClick={onPrimaryAction}
              className="px-2 py-1.5 rounded-md text-[11px] font-medium bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200 border border-amber-200/60 hover:bg-amber-100 transition-colors text-center"
              title="تسجيل حجز ديمو داي السبت 11:00ص"
            >
              ديمو السبت (11:00ص)
            </button>
          </div>
        )}

        {/* Commerce Specific Secondary Action */}
        {vertical === "commerce" && onCreateOrder && (
          <button
            type="button"
            onClick={onCreateOrder}
            className="w-full mt-2 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-border/60 bg-muted/30 hover:bg-muted/60 transition-colors"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-muted-foreground" />
            <span>إنشاء طلب سريع مع الشحن</span>
          </button>
        )}
      </div>

      {/* 2. Smart Objection & Quick Reply Presets */}
      <div className="rounded-xl border border-border/60 bg-card p-3 shadow-2xs">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span className="text-xs font-semibold text-foreground">
              معالجة الاعتراضات والردود الذكية
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground">
            {onInsertSnippet ? "إدراج فوري بالشات" : "نسخ"}
          </span>
        </div>

        <div className="space-y-1.5">
          {presets.map((preset) => {
            const isJustCopied = copiedId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleCopyOrInsert(preset)}
                className={`w-full text-right p-2 rounded-lg border text-xs transition-all flex items-start justify-between gap-2 active:scale-[0.99] cursor-pointer ${
                  isJustCopied
                    ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 text-emerald-800 dark:text-emerald-200"
                    : "bg-muted/20 hover:bg-muted/50 border-border/50 text-foreground"
                }`}
                title="اضغط لإدراج الرد في مربع الكتابة"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-[11px] mb-0.5">
                    {preset.label}
                  </div>
                  <div className="text-[10px] text-muted-foreground line-clamp-1">
                    {preset.snippet}
                  </div>
                </div>
                <div className="shrink-0 mt-0.5">
                  {isJustCopied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-muted-foreground opacity-60" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Attribution / Ad Campaign Card (if conversation has postId) */}
      {conversation.postId && (
        <div className="rounded-xl border border-border/60 bg-card p-3 shadow-2xs">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <Megaphone className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span className="text-xs font-semibold text-foreground">
                مصدر الإعلان / المنشور
              </span>
            </div>
            {conversation.postPermalink && (
              <a
                href={conversation.postPermalink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 text-[10px] text-blue-600 dark:text-blue-400 hover:underline"
              >
                <span>عرض على فيسبوك</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            )}
          </div>

          <div className="p-2 rounded-lg bg-muted/30 border border-border/40 text-xs text-muted-foreground leading-relaxed">
            {conversation.postMessage ? (
              <p className="line-clamp-3 text-[11px]">
                {conversation.postMessage}
              </p>
            ) : (
              <p className="text-[11px]">
                تفاعل العميل مع إعلان منشور فيسبوك للمؤسسة.
              </p>
            )}
            {conversation.postPicture && (
              <div className="mt-2 w-16 h-16 rounded-md overflow-hidden border border-border/40">
                <img
                  src={getInboxExternalImageUrl(conversation.postPicture)}
                  alt="منشور فيسبوك"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. Technical Facebook Sync (Subtle at the bottom) */}
      {conversation.platform === "facebook" && (
        <div className="pt-2 border-t border-border/40">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[11px] text-muted-foreground">
              مزامنة رسائل المحادثة مع فيسبوك
            </div>
            <button
              type="button"
              onClick={onSyncMessages}
              disabled={syncingMessages}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium border border-border/60 bg-background hover:bg-muted/50 disabled:opacity-50 transition-colors cursor-pointer"
            >
              <RefreshCw
                className={`w-3 h-3 ${syncingMessages ? "animate-spin" : ""}`}
              />
              <span>{syncingMessages ? "جاري المزامنة..." : "مزامنة"}</span>
            </button>
          </div>
          {syncMessage && (
            <p
              className={`text-[10px] mt-1 ${
                syncMessage.startsWith("تم:")
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {syncMessage}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default CustomerVerticalActionsTab;
