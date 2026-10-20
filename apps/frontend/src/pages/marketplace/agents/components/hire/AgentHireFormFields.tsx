import React from "react";
import { ShieldCheck, Sparkles } from "lucide-react";

interface AgentHireFormFieldsProps {
  customName: string;
  department: string;
  safetyMode: "draft" | "autonomous";
  onCustomNameChange: (val: string) => void;
  onDepartmentChange: (val: string) => void;
  onSafetyModeChange: (val: "draft" | "autonomous") => void;
}

export const AgentHireFormFields: React.FC<AgentHireFormFieldsProps> = ({
  customName,
  department,
  safetyMode,
  onCustomNameChange,
  onDepartmentChange,
  onSafetyModeChange,
}) => {
  return (
    <div className="space-y-4 text-xs">
      {/* Custom Display Name */}
      <div className="space-y-1.5">
        <label htmlFor="agent-custom-name" className="font-semibold text-foreground">
          اسم الإيجنت المعتمد في الشركة
        </label>
        <input
          id="agent-custom-name"
          type="text"
          value={customName}
          onChange={(e) => onCustomNameChange(e.target.value)}
          placeholder="مثال: كريم ميديا باير"
          className="w-full h-9 rounded-lg border border-border bg-background px-3 text-xs text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
        />
      </div>

      {/* Department Selection */}
      <div className="space-y-1.5">
        <label htmlFor="agent-department" className="font-semibold text-foreground">
          القسم التابع له في المنشأة
        </label>
        <select
          id="agent-department"
          value={department}
          onChange={(e) => onDepartmentChange(e.target.value)}
          className="w-full h-9 rounded-lg border border-border bg-background px-3 text-xs text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
        >
          <option value="marketing">التسويق والحملات الإعلانية</option>
          <option value="sales">المبيعات وخدمة العملاء</option>
          <option value="operations">العمليات والشحن والمخازن</option>
          <option value="medical">القطاع الطبي والعيادات</option>
          <option value="executive">الإدارة العامة والرادار التنافسي</option>
        </select>
      </div>

      {/* Safety Governance Mode */}
      <div className="space-y-2">
        <span className="font-semibold text-foreground block">
          بروتوكول الأمان والصلاحيات (Governance Mode)
        </span>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onSafetyModeChange("draft")}
            className={`flex flex-col text-start p-3 rounded-xl border transition-all ${
              safetyMode === "draft"
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "border-border bg-card/50 hover:bg-muted/50"
            }`}
          >
            <div className="flex items-center gap-1.5 font-semibold text-foreground mb-1">
              <ShieldCheck className="size-3.5 text-primary stroke-[1.5]" />
              <span>مسودات فقط (آمن)</span>
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              يعد الإجراءات كمسودات تتطلب موافقتك اليدوية قبل الإنفاق أو الإرسال.
            </p>
          </button>

          <button
            type="button"
            onClick={() => onSafetyModeChange("autonomous")}
            className={`flex flex-col text-start p-3 rounded-xl border transition-all ${
              safetyMode === "autonomous"
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "border-border bg-card/50 hover:bg-muted/50"
            }`}
          >
            <div className="flex items-center gap-1.5 font-semibold text-foreground mb-1">
              <Sparkles className="size-3.5 text-amber-500 stroke-[1.5]" />
              <span>تنفيذ ذاتي فوري</span>
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              تنفيذ تلقائي فوري 24/7 دون انتظار الموافقة اليدوية لكل خطوة.
            </p>
          </button>
        </div>
      </div>
    </div>
  );
};
