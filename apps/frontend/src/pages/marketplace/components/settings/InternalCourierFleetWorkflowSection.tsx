import React from "react";
import { ShieldCheck, BellRing, BadgePercent } from "lucide-react";
import { JsonRecord } from "../../types/appSettingsTypes";

interface InternalCourierFleetWorkflowSectionProps {
  courierWorkflow: JsonRecord;
  courierNotifications: JsonRecord;
  courierCommission: JsonRecord;
  updateAtPath: (path: string, value: unknown) => void;
}

export const InternalCourierFleetWorkflowSection: React.FC<InternalCourierFleetWorkflowSectionProps> = ({
  courierWorkflow,
  courierNotifications,
  courierCommission,
  updateAtPath,
}) => {
  return (
    <>
      {/* Field Workflow & Courier Mobile Security */}
      <div className="rounded-2xl border border-border/60 bg-card p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex items-center gap-2.5 pb-3 border-b border-border/40">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">أمان رابط المندوب وإجراءات الميدان</h3>
            <p className="text-xs text-muted-foreground">حماية روابط الهواتف وضوابط التسليم والتحصيل الفعلي</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex items-start gap-3 p-3.5 rounded-xl border border-border/40 bg-muted/20 hover:bg-muted/40 cursor-pointer transition">
            <input
              type="checkbox"
              checked={Boolean(courierWorkflow["requireCourierPin"] ?? false)}
              onChange={(e) => updateAtPath("fieldWorkflow.requireCourierPin", e.target.checked)}
              className="mt-0.5 rounded border-border text-primary focus:ring-primary"
            />
            <div>
              <span className="text-xs font-medium text-foreground block">طلب كود تأكيد سري (PIN) في الميدان</span>
              <span className="text-[11px] text-muted-foreground block mt-0.5">
                طلب إدخال رقم سري مكوّن من 4 أرقام يخص المندوب قبل تسجيل أي تسليم لمنع أي ضغط عشوائي أو تلاعب.
              </span>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3.5 rounded-xl border border-border/40 bg-muted/20 hover:bg-muted/40 cursor-pointer transition">
            <input
              type="checkbox"
              checked={Boolean(courierWorkflow["requireDeliveryOtp"] ?? false)}
              onChange={(e) => updateAtPath("fieldWorkflow.requireDeliveryOtp", e.target.checked)}
              className="mt-0.5 rounded border-border text-primary focus:ring-primary"
            />
            <div>
              <span className="text-xs font-medium text-foreground block">إثبات التسليم بكود OTP من العميل</span>
              <span className="text-[11px] text-muted-foreground block mt-0.5">
                كود من 4 أرقام يوصله العميل في رسالة خروج الطلب للتوصيل — المندوب لا يستطيع تسجيل التسليم بدون إدخاله.
              </span>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3.5 rounded-xl border border-border/40 bg-muted/20 hover:bg-muted/40 cursor-pointer transition">
            <input
              type="checkbox"
              checked={Boolean(courierWorkflow["autoUpdateOrderStatusOnDelivery"] ?? true)}
              onChange={(e) => updateAtPath("fieldWorkflow.autoUpdateOrderStatusOnDelivery", e.target.checked)}
              className="mt-0.5 rounded border-border text-primary focus:ring-primary"
            />
            <div>
              <span className="text-xs font-medium text-foreground block">تحديث حالة الطلب إلى «تم التسليم» فوراً</span>
              <span className="text-[11px] text-muted-foreground block mt-0.5">
                مزامنة حالة الطلب في المتجر مباشرة فور ضغط المندوب على «تم التسليم وتحصيل الكاش».
              </span>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3.5 rounded-xl border border-border/40 bg-muted/20 hover:bg-muted/40 cursor-pointer transition">
            <input
              type="checkbox"
              checked={Boolean(courierWorkflow["allowPartialDelivery"] ?? true)}
              onChange={(e) => updateAtPath("fieldWorkflow.allowPartialDelivery", e.target.checked)}
              className="mt-0.5 rounded border-border text-primary focus:ring-primary"
            />
            <div>
              <span className="text-xs font-medium text-foreground block">السماح بالتسليم والتحصيل الجزئي</span>
              <span className="text-[11px] text-muted-foreground block mt-0.5">
                تمكين المندوب من تحصيل قيمة القطع المقبولة فقط وتعديل إجمالي الطلب في الشارع.
              </span>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3.5 rounded-xl border border-border/40 bg-muted/20 hover:bg-muted/40 cursor-pointer transition">
            <input
              type="checkbox"
              checked={Boolean(courierWorkflow["requirePhotoProofOnReturn"] ?? false)}
              onChange={(e) => updateAtPath("fieldWorkflow.requirePhotoProofOnReturn", e.target.checked)}
              className="mt-0.5 rounded border-border text-primary focus:ring-primary"
            />
            <div>
              <span className="text-xs font-medium text-foreground block">إلزام صورة إثبات عند تعذر التسليم</span>
              <span className="text-[11px] text-muted-foreground block mt-0.5">
                مطالبة المندوب بالتقاط صورة للمكان أو إشعار الرفض عند تأجيل أو إلغاء الشحنة.
              </span>
            </div>
          </label>
        </div>
      </div>

      {/* Customer WhatsApp Notifications */}
      <div className="rounded-2xl border border-border/60 bg-card p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex items-center gap-2.5 pb-3 border-b border-border/40">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <BellRing className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">إشعارات العملاء على واتساب</h3>
            <p className="text-xs text-muted-foreground">
              رسائل تلقائية للعميل من مسار أسطول المناديب — بتعمل طبقة إضافية فوق إعدادات الإشعارات العامة للشركة
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex items-start gap-3 p-3.5 rounded-xl border border-border/40 bg-muted/20 hover:bg-muted/40 cursor-pointer transition">
            <input
              type="checkbox"
              checked={Boolean(courierNotifications["notifyCustomerOnDispatch"] ?? true)}
              onChange={(e) => updateAtPath("notifications.notifyCustomerOnDispatch", e.target.checked)}
              className="mt-0.5 rounded border-border text-primary focus:ring-primary"
            />
            <div>
              <span className="text-xs font-medium text-foreground block">إشعار خروج الطلب للتوصيل</span>
              <span className="text-[11px] text-muted-foreground block mt-0.5">
                اسم الكابتن ورقم هاتفه والمبلغ المطلوب — وكود الاستلام لو إثبات OTP مفعّل.
              </span>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3.5 rounded-xl border border-border/40 bg-muted/20 hover:bg-muted/40 cursor-pointer transition">
            <input
              type="checkbox"
              checked={Boolean(courierNotifications["notifyCustomerOnDelivery"] ?? true)}
              onChange={(e) => updateAtPath("notifications.notifyCustomerOnDelivery", e.target.checked)}
              className="mt-0.5 rounded border-border text-primary focus:ring-primary"
            />
            <div>
              <span className="text-xs font-medium text-foreground block">إشعار نجاح التسليم</span>
              <span className="text-[11px] text-muted-foreground block mt-0.5">
                تأكيد وصول الطلب للعميل مع المبلغ المحصّل فعليًا.
              </span>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3.5 rounded-xl border border-border/40 bg-muted/20 hover:bg-muted/40 cursor-pointer transition">
            <input
              type="checkbox"
              checked={Boolean(courierNotifications["notifyCustomerOnReturn"] ?? true)}
              onChange={(e) => updateAtPath("notifications.notifyCustomerOnReturn", e.target.checked)}
              className="mt-0.5 rounded border-border text-primary focus:ring-primary"
            />
            <div>
              <span className="text-xs font-medium text-foreground block">إشعار تعذر التسليم</span>
              <span className="text-[11px] text-muted-foreground block mt-0.5">
                إبلاغ العميل بفشل محاولة التسليم وسببه والوعد بإعادة الترتيب.
              </span>
            </div>
          </label>
        </div>
      </div>

      {/* Default Commission Configuration */}
      <div className="rounded-2xl border border-border/60 bg-card p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex items-center gap-2.5 pb-3 border-b border-border/40">
          <div className="p-2 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
            <BadgePercent className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">نظام العمولات الافتراضي للمناديب الجدد</h3>
            <p className="text-xs text-muted-foreground">القيم الافتراضية المقترحة تلقائياً عند إضافة مندوب جديد للأسطول</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              نوع العمولة الافتراضي
            </label>
            <select
              value={String(courierCommission["defaultType"] || "PER_ORDER")}
              onChange={(e) => updateAtPath("commission.defaultType", e.target.value)}
              className="w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
            >
              <option value="PER_ORDER">مبلغ ثابت لكل طرد مسلّم (ج.م)</option>
              <option value="PERCENTAGE">نسبة مئوية من مصاريف التوصيل (%)</option>
              <option value="FIXED_SALARY">راتب شهري ثابت (بدون عمولة طرود إضافية)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              قيمة العمولة الافتراضية
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                value={Number(courierCommission["defaultValue"] ?? 30)}
                onChange={(e) => updateAtPath("commission.defaultValue", Number(e.target.value))}
                className="w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none tabular-nums font-mono"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                {courierCommission["defaultType"] === "PERCENTAGE" ? "%" : "ج.م"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
