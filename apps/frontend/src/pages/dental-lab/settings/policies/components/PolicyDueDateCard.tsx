import { Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type DentalPoliciesData } from "../types/dentalPoliciesTypes";

interface PolicyDueDateCardProps {
  policies: DentalPoliciesData;
  setPolicies: React.Dispatch<React.SetStateAction<DentalPoliciesData>>;
}

export function PolicyDueDateCard({
  policies,
  setPolicies,
}: PolicyDueDateCardProps) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 space-y-4">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <Clock className="size-4 text-blue-500" />
        قواعد حساب موعد التسليم (Lead Time & Due Date)
      </h3>

      <div className="space-y-3 text-sm">
        <div>
          <Label className="text-xs">
            مدة التنفيذ القياسية الافتراضية (أيام عمل)
          </Label>
          <Input
            type="number"
            min="1"
            max="30"
            value={policies.dueDate.defaultLeadDays}
            onChange={(e) =>
              setPolicies((p) => ({
                ...p,
                dueDate: {
                  ...p.dueDate,
                  defaultLeadDays: Math.max(1, parseInt(e.target.value, 10) || 1),
                },
              }))
            }
            className="mt-1 font-mono tabular-nums"
          />
          <span className="text-[11px] text-muted-foreground">
            تُطبق كمهلة افتراضية عند عدم تحديد مدة خاصة لنوع العمل
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">قاعدة الحالات المستعجلة (Urgent Rule)</Label>
            <select
              className="w-full mt-1 text-sm rounded-md border border-input bg-background px-3 py-1.5"
              value={policies.dueDate.urgentRule}
              onChange={(e) =>
                setPolicies((p) => ({
                  ...p,
                  dueDate: {
                    ...p.dueDate,
                    urgentRule: e.target.value as DentalPoliciesData["dueDate"]["urgentRule"],
                  },
                }))
              }
            >
              <option value="PERCENT">نسبة مئوية (%)</option>
              <option value="FIXED_DAYS">عدد أيام ثابت</option>
            </select>
          </div>

          <div>
            <Label className="text-xs">
              {policies.dueDate.urgentRule === "PERCENT"
                ? "النسبة المئوية (%)"
                : "عدد الأيام"}
            </Label>
            <Input
              type="number"
              min="1"
              max={policies.dueDate.urgentRule === "PERCENT" ? 90 : 10}
              value={policies.dueDate.urgentValue}
              onChange={(e) =>
                setPolicies((p) => ({
                  ...p,
                  dueDate: {
                    ...p.dueDate,
                    urgentValue: Math.max(1, parseInt(e.target.value, 10) || 1),
                  },
                }))
              }
              className="mt-1 font-mono tabular-nums"
            />
          </div>
        </div>

        <div>
          <Label className="text-xs">الحد الأدنى لأيام التسليم (Min Days)</Label>
          <Input
            type="number"
            min="1"
            max="5"
            value={policies.dueDate.minDays}
            onChange={(e) =>
              setPolicies((p) => ({
                ...p,
                dueDate: {
                  ...p.dueDate,
                  minDays: Math.max(1, parseInt(e.target.value, 10) || 1),
                },
              }))
            }
            className="mt-1 font-mono tabular-nums"
          />
          <span className="text-[11px] text-muted-foreground">
            يمنع النظام احتساب مدة أقل من هذا الحد مهما كانت نسبة الاستعجال
          </span>
        </div>
      </div>
    </div>
  );
}

export default PolicyDueDateCard;
