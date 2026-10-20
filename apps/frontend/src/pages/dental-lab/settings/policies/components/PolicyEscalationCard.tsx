import { Bell, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type DentalPoliciesData } from "../types/dentalPoliciesTypes";

interface PolicyEscalationCardProps {
  policies: DentalPoliciesData;
  setPolicies: React.Dispatch<React.SetStateAction<DentalPoliciesData>>;
  runningEscalation: boolean;
  onRunEscalation: () => void;
}

export function PolicyEscalationCard({
  policies,
  setPolicies,
  runningEscalation,
  onRunEscalation,
}: PolicyEscalationCardProps) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Bell className="size-4 text-rose-500" />
          تصعيد التأخير التلقائي (Automated Escalation)
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={onRunEscalation}
          disabled={runningEscalation}
          className="text-xs gap-1.5 text-rose-600 border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950/40"
        >
          {runningEscalation ? (
            <RefreshCw className="size-3 animate-spin" />
          ) : (
            <Bell className="size-3" />
          )}
          فحص التصعيد الآن
        </Button>
      </div>

      <div className="space-y-3 text-sm">
        <label className="flex items-center gap-2 text-xs cursor-pointer">
          <input
            type="checkbox"
            checked={policies.escalation.enabled}
            onChange={(e) =>
              setPolicies((p) => ({
                ...p,
                escalation: { ...p.escalation, enabled: e.target.checked },
              }))
            }
            className="rounded border-input text-primary"
          />
          <span className="font-medium">
            تفعيل نظام التصعيد التلقائي للمراحل المتأخرة
          </span>
        </label>

        <div>
          <Label className="text-xs">
            ساعات السماح بالمرحلة قبل تصعيدها (SLA Hours)
          </Label>
          <Input
            type="number"
            min="1"
            max="168"
            value={policies.escalation.afterHoursInStage}
            onChange={(e) =>
              setPolicies((p) => ({
                ...p,
                escalation: {
                  ...p.escalation,
                  afterHoursInStage: Math.max(
                    1,
                    parseInt(e.target.value, 10) || 24
                  ),
                },
              }))
            }
            className="mt-1 font-mono tabular-nums"
          />
          <span className="text-[11px] text-muted-foreground">
            عند تجاوز المرحلة لهذه المهلة، يُعاد إسنادها تلقائيًا للبديل المفضل أو
            فني زميل
          </span>
        </div>

        <div>
          <Label className="text-xs">
            جهة التصعيد المستهدفة (Escalation Target)
          </Label>
          <select
            className="w-full mt-1 text-sm rounded-md border border-input bg-background px-3 py-1.5"
            value={policies.escalation.target}
            onChange={(e) =>
              setPolicies((p) => ({
                ...p,
                escalation: {
                  ...p.escalation,
                  target: e.target.value as DentalPoliciesData["escalation"]["target"],
                },
              }))
            }
          >
            <option value="BACKUP_ROLE">
              الفني الاحتياطي المفضل ثم زميل مطابق للدور
            </option>
            <option value="SUPERVISOR">إشعار المشرف المباشر وتوزيعها يدوياً</option>
          </select>
        </div>

        <div className="space-y-2 pt-1 border-t border-border/30">
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={policies.escalation.notify}
              onChange={(e) =>
                setPolicies((p) => ({
                  ...p,
                  escalation: { ...p.escalation, notify: e.target.checked },
                }))
              }
              className="rounded border-input text-primary"
            />
            <span>
              تنبيه مالك المعمل والمشرف فور تصعيد أو تعثر أي مرحلة متأخرة
            </span>
          </label>

          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={policies.notify.patientEnabled}
              onChange={(e) =>
                setPolicies((p) => ({
                  ...p,
                  notify: { ...p.notify, patientEnabled: e.target.checked },
                }))
              }
              className="rounded border-input text-primary"
            />
            <span>إرسال رسائل WhatsApp للمريض عند استلام وتجهيز الحالة</span>
          </label>
        </div>
      </div>
    </div>
  );
}

export default PolicyEscalationCard;
