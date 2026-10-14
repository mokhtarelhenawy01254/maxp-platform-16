import React from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save } from "lucide-react";

interface AgentOption {
  id: string;
  name: string;
  template_slug: string | null;
}

interface SettingsTabProps {
  selfReviewEnabled: boolean;
  toggleSaving: boolean;
  handleToggleService: (enabled: boolean) => void;
  ctrlAgent: string;
  setCtrlAgent: (v: string) => void;
  ctrlModel: string;
  setCtrlModel: (v: string) => void;
  ctrlSaving: boolean;
  ctrlSaved: boolean;
  handleSaveModel: () => void;
  agentsList: AgentOption[] | undefined;
  globalModel: string;
  setGlobalModel: (v: string) => void;
  globalSaving: boolean;
  handleSaveGlobal: () => void;
  availableModels: string[] | undefined;
}

export function SuperAdminSelfReviewSettingsTab({
  selfReviewEnabled,
  toggleSaving,
  handleToggleService,
  ctrlAgent,
  setCtrlAgent,
  ctrlModel,
  setCtrlModel,
  ctrlSaving,
  ctrlSaved,
  handleSaveModel,
  agentsList,
  globalModel,
  setGlobalModel,
  globalSaving,
  handleSaveGlobal,
  availableModels,
}: SettingsTabProps) {
  return (
    <div className="space-y-4 mt-0">
      <div className="rounded-lg border border-border/70 bg-card p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
          <div>
            <h3 className="text-xs font-semibold text-foreground">
              تفعيل / تعطيل خدمة المراجعة الذاتية
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              عند التعطيل، ستمر جميع ردود الوكلاء مباشرة دون تدقيق
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="self-review-toggle"
              checked={selfReviewEnabled}
              onCheckedChange={handleToggleService}
              disabled={toggleSaving}
            />
            <Label htmlFor="self-review-toggle" className="text-xs font-mono cursor-pointer">
              {selfReviewEnabled ? "مفعل" : "معطل"}
            </Label>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Agent Specific Model */}
        <div className="rounded-lg border border-border/70 bg-card p-4 space-y-3">
          <div className="border-b border-border/60 pb-2">
            <h3 className="text-xs font-semibold text-foreground">
              تخصيص نموذج تدقيق لوكيل محدد
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">اختر وكيلاً وحدد النموذج المطلوب لمراجعته</p>
          </div>

          <div className="space-y-2.5">
            <div>
              <label className="text-[11px] font-mono text-muted-foreground mb-1 block">الوكيل المستهدف</label>
              <Select value={ctrlAgent} onValueChange={(v) => { setCtrlAgent(v || ""); setCtrlModel(""); }}>
                <SelectTrigger className="h-8 text-xs bg-muted/20 border-border/70"><SelectValue placeholder="اختر وكيلاً..." /></SelectTrigger>
                <SelectContent>
                  {(agentsList || []).map((a) => (
                    <SelectItem key={a.id} value={a.id} className="text-xs">{a.name || a.template_slug || a.id}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-[11px] font-mono text-muted-foreground mb-1 block">نموذج التدقيق</label>
              <Select value={ctrlModel} onValueChange={(v) => setCtrlModel(v || "")} disabled={!ctrlAgent}>
                <SelectTrigger className="h-8 text-xs bg-muted/20 border-border/70"><SelectValue placeholder="الافتراضي" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__default__" className="text-xs">الافتراضي العام</SelectItem>
                  {(availableModels || []).map((m) => (
                    <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleSaveModel}
              disabled={!ctrlAgent || ctrlSaving}
              className="w-full h-8 text-xs font-mono mt-1 active:scale-[0.98]"
            >
              <Save className="size-3.5 ml-1.5" />
              {ctrlSaved ? "تم الحفظ" : "حفظ إعدادات الوكيل"}
            </Button>
          </div>
        </div>

        {/* Global Review Model */}
        <div className="rounded-lg border border-border/70 bg-card p-4 space-y-3">
          <div className="border-b border-border/60 pb-2">
            <h3 className="text-xs font-semibold text-foreground">
              نموذج التدقيق الافتراضي العام
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              النموذج الذي يعتمد عليه النظام في مراجعة كافة الوكلاء
            </p>
          </div>

          <div className="space-y-2.5">
            <div>
              <label className="text-[11px] font-mono text-muted-foreground mb-1 block">النموذج العام</label>
              <Select value={globalModel} onValueChange={(v) => setGlobalModel(v || "")}>
                <SelectTrigger className="h-8 text-xs bg-muted/20 border-border/70"><SelectValue placeholder="اختر النموذج..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="" className="text-xs">الافتراضي السحابي</SelectItem>
                  {(availableModels || []).map((m) => (
                    <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="pt-7">
              <Button
                onClick={handleSaveGlobal}
                disabled={globalSaving}
                className="w-full h-8 text-xs font-mono active:scale-[0.98]"
              >
                <Save className="size-3.5 ml-1.5" />
                حفظ النموذج العام
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
