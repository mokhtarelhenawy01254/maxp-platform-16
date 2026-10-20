import { ShieldCheck } from "lucide-react";
import { type DentalPoliciesData } from "../types/dentalPoliciesTypes";

interface PolicyFieldsValidationCardProps {
  policies: DentalPoliciesData;
  setPolicies: React.Dispatch<React.SetStateAction<DentalPoliciesData>>;
}

export function PolicyFieldsValidationCard({
  policies,
  setPolicies,
}: PolicyFieldsValidationCardProps) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 space-y-4">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <ShieldCheck className="size-4 text-emerald-500" />
        سياسات حقول الإدخال الإلزامية
      </h3>

      <div className="space-y-3 text-sm">
        <label className="flex items-center gap-2 text-xs cursor-pointer">
          <input
            type="checkbox"
            checked={policies.fields.patientPhoneRequired}
            onChange={(e) =>
              setPolicies((p) => ({
                ...p,
                fields: {
                  ...p.fields,
                  patientPhoneRequired: e.target.checked,
                },
              }))
            }
            className="rounded border-input text-primary"
          />
          <span className="font-medium">
            إلزامية رقم هاتف المريض في كل طلب جديد (P7)
          </span>
        </label>
        <p className="text-[11px] text-muted-foreground mr-6">
          يمنع إنشاء الطلب بدون إدخال رقم هاتف محمول صحيح للمريض لإرسال تنبيهات
          المتابعة والبحث السريع.
        </p>

        <label className="flex items-center gap-2 text-xs cursor-pointer pt-2 border-t border-border/30">
          <input
            type="checkbox"
            checked={policies.fields.requireToothAndShade}
            onChange={(e) =>
              setPolicies((p) => ({
                ...p,
                fields: {
                  ...p.fields,
                  requireToothAndShade: e.target.checked,
                },
              }))
            }
            className="rounded border-input text-primary"
          />
          <span className="font-medium">
            إلزامية تحديد موضع السن واللون في ويزارد الطلب
          </span>
        </label>
        <p className="text-[11px] text-muted-foreground mr-6">
          يضمن عدم تسجيل أي حالة تركيبات بدون رقم السن أو لون الـ VITA المطابق.
        </p>
      </div>
    </div>
  );
}

export default PolicyFieldsValidationCard;
