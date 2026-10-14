import React from "react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Separator } from "../../components/ui/separator";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { Settings, Info, Save } from "lucide-react";

interface SettingsFormState {
  level1Rate: number;
  level2Rate: number;
  level3Rate: number;
  level4Rate: number;
  minimumPayoutAmount: number;
  termsAndConditions: string;
}

interface PartnerSettingsTabProps {
  settingsForm: SettingsFormState;
  setSettingsForm: React.Dispatch<React.SetStateAction<SettingsFormState>>;
  savingSettings: boolean;
  onSave: () => void;
}

export function PlatformPartnerSettingsTab({
  settingsForm,
  setSettingsForm,
  savingSettings,
  onSave,
}: PartnerSettingsTabProps) {
  return (
    <div className="p-4 sm:p-5 space-y-4">
      <div className="flex items-center gap-2 border-b border-border/60 pb-2.5">
        <Settings className="size-4 text-primary" />
        <h2 className="text-sm font-bold text-foreground">إعدادات برنامج ونِسَب الشركاء</h2>
      </div>

      <div className="rounded-lg border border-border/60 bg-muted/20 p-3 flex items-start gap-2.5 text-xs text-muted-foreground">
        <Info className="size-4 text-primary shrink-0 mt-0.5" />
        <div>
          تحديد نِسَب العمولات يؤثر مباشرة على جميع عمليات الاشتراك والتجديد الجديدة فور الحفظ.
          المدفوعات والعمولات المحسوبة مسبقاً لن تتأثر.
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-foreground mb-2">نِسَب العمولات لمستويات الإحالة (Tier System)</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {[
            { key: "level1Rate", label: "المستوى الأول (L1)", desc: "الشريك المباشر" },
            { key: "level2Rate", label: "المستوى الثاني (L2)", desc: "رتبة Senior Partner" },
            { key: "level3Rate", label: "المستوى الثالث (L3)", desc: "رتبة Master Partner" },
            { key: "level4Rate", label: "المستوى الرابع (L4)", desc: "رتبة Executive" },
          ].map((level) => (
            <div key={level.key} className="rounded-lg border border-border/60 bg-muted/10 p-3">
              <p className="text-xs font-semibold text-foreground">{level.label}</p>
              <p className="text-[10px] text-muted-foreground mb-2">{level.desc}</p>
              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  value={settingsForm[level.key as keyof SettingsFormState]}
                  onChange={(e) =>
                    setSettingsForm((p) => ({ ...p, [level.key]: Number(e.target.value) }))
                  }
                  min={0}
                  max={100}
                  step={0.5}
                  className="h-8 text-xs font-mono bg-background"
                />
                <span className="text-xs font-mono text-muted-foreground">%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Separator className="border-border/60" />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div>
          <Label className="text-xs font-semibold text-foreground mb-1 block">الحد الأدنى لطلب السحب</Label>
          <div className="flex items-center gap-1.5 max-w-xs">
            <Input
              type="number"
              value={settingsForm.minimumPayoutAmount}
              onChange={(e) =>
                setSettingsForm((p) => ({
                  ...p,
                  minimumPayoutAmount: Number(e.target.value),
                }))
              }
              min={0}
              step={10}
              className="h-8 text-xs font-mono bg-background"
            />
            <span className="text-xs text-muted-foreground font-mono">ج.م</span>
          </div>
        </div>

        <div>
          <Label className="text-xs font-semibold text-foreground mb-1 block">الشروط والأحكام</Label>
          <Textarea
            value={settingsForm.termsAndConditions}
            onChange={(e) =>
              setSettingsForm((p) => ({ ...p, termsAndConditions: e.target.value }))
            }
            rows={2}
            className="text-xs bg-background"
            placeholder="أدخل شروط وأحكام برنامج الشركاء هنا..."
          />
        </div>
      </div>

      <Button
        className="h-8 text-xs font-medium bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 active:scale-[0.98] transition-transform"
        disabled={savingSettings}
        onClick={onSave}
      >
        {savingSettings ? <LoadingSpinner size="sm" /> : <Save className="size-3.5" />}
        <span>حفظ الإعدادات</span>
      </Button>
    </div>
  );
}
