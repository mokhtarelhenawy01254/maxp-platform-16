import { UserCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type DentalPoliciesData } from "../types/dentalPoliciesTypes";

interface PolicyAssignmentCardProps {
  policies: DentalPoliciesData;
  setPolicies: React.Dispatch<React.SetStateAction<DentalPoliciesData>>;
}

export function PolicyAssignmentCard({
  policies,
  setPolicies,
}: PolicyAssignmentCardProps) {
  const getModeBadge = () => {
    if (policies.assignment.mode === "AUTO") {
      return (
        <Badge className="bg-emerald-600 text-white text-[10px]">
          إسناد تلقائي فوري
        </Badge>
      );
    }
    if (policies.assignment.mode === "SUGGEST") {
      return (
        <Badge variant="secondary" className="text-[10px]">
          اقتراح ذكي (يدوي)
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-[10px] text-muted-foreground">
        معطّل
      </Badge>
    );
  };

  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <UserCheck className="size-4 text-primary" />
          سياسة إسناد الفنيين
        </h3>
        {getModeBadge()}
      </div>

      <div className="space-y-3 text-sm">
        <div>
          <Label className="text-xs">وضع الإسناد (Assignment Mode)</Label>
          <select
            className="w-full mt-1 text-sm rounded-md border border-input bg-background px-3 py-1.5"
            value={policies.assignment.mode}
            onChange={(e) =>
              setPolicies((p) => ({
                ...p,
                assignment: {
                  ...p.assignment,
                  mode: e.target.value as DentalPoliciesData["assignment"]["mode"],
                },
              }))
            }
          >
            <option value="SUGGEST">
              اقتراح ذكي (ترشيح الفني الأنسب مع اعتماد المستخدم)
            </option>
            <option value="AUTO">
              إسناد تلقائي فوري (حسب جدول وقدرة الفنيين)
            </option>
            <option value="OFF">معطّل (إدخال يدوي دون اقتراح آلي)</option>
          </select>
        </div>

        <div>
          <Label className="text-xs">
            استراتيجية توزيع الحالات (Distribution Strategy)
          </Label>
          <select
            className="w-full mt-1 text-sm rounded-md border border-input bg-background px-3 py-1.5"
            value={policies.assignment.strategy}
            onChange={(e) =>
              setPolicies((p) => ({
                ...p,
                assignment: {
                  ...p.assignment,
                  strategy: e.target.value as DentalPoliciesData["assignment"]["strategy"],
                },
              }))
            }
          >
            <option value="LEAST_LOADED">
              الأقل عبئاً (أقل عدد مراحل نشطة حالياً)
            </option>
            <option value="ROUND_ROBIN">
              توزيع دوري عادل (Round Robin - من لم يُسند له عمل لأطول فترة)
            </option>
            <option value="BY_ROLE_MATCH">
              أولوية مطابقة الدور التخصصي أولاً (Specialty Match)
            </option>
            <option value="OLDEST_WAITING">
              الأقدم انتظاراً (الأطول تفرغاً)
            </option>
          </select>
        </div>

        <div>
          <Label className="text-xs">
            سقف الحالات اليومي الافتراضي لكل فني (Daily Cap)
          </Label>
          <Input
            type="number"
            min="0"
            max="50"
            value={policies.assignment.dailyCapPerTechnician}
            onChange={(e) =>
              setPolicies((p) => ({
                ...p,
                assignment: {
                  ...p.assignment,
                  dailyCapPerTechnician: Math.max(
                    0,
                    parseInt(e.target.value, 10) || 0
                  ),
                },
              }))
            }
            className="mt-1 font-mono tabular-nums"
          />
          <span className="text-[11px] text-muted-foreground">
            0 تعني غير محدود (ويمكن تخصيص سقف منفصل لكل فني من صفحة الفنيين)
          </span>
        </div>

        <div className="space-y-2 pt-2 border-t border-border/30">
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={policies.assignment.respectSchedule}
              onChange={(e) =>
                setPolicies((p) => ({
                  ...p,
                  assignment: {
                    ...p.assignment,
                    respectSchedule: e.target.checked,
                  },
                }))
              }
              className="rounded border-input text-primary"
            />
            <span className="font-medium">
              مراعاة جدول عمل الفنيين (عدم إسناد الحالات في أيام العطلات والإجازات)
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}

export default PolicyAssignmentCard;
