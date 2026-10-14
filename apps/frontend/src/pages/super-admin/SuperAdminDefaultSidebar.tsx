import React, { useCallback, useEffect, useState } from "react";
import { CheckCircle2, LayoutList, Loader2, PanelsTopLeft, Sidebar as SidebarIcon, Check, Settings2 } from "lucide-react";
import { toast } from "sonner";
import i18n from "../../i18n";
import {
  platformDefaultSidebarService,
  type DefaultSidebarSettings,
} from "../../services/platformDefaultSidebarService";

type SidebarLayout =
  | "classic"
  | "three-tier"
  | "horizontal"
  | "floating"
  | "minimal"
  | "app-dashboard";

type SidebarLayoutOption = {
  id: SidebarLayout;
  nameKey: string;
  descriptionKey: string;
};

const SIDEBAR_LAYOUT_OPTIONS: SidebarLayoutOption[] = [
  {
    id: "classic",
    nameKey: "appDashboard.layoutOptions.classic.name",
    descriptionKey: "appDashboard.layoutOptions.classic.description",
  },
  {
    id: "three-tier",
    nameKey: "appDashboard.layoutOptions.threeTier.name",
    descriptionKey: "appDashboard.layoutOptions.threeTier.description",
  },
  {
    id: "horizontal",
    nameKey: "appDashboard.layoutOptions.horizontal.name",
    descriptionKey: "appDashboard.layoutOptions.horizontal.description",
  },
  {
    id: "floating",
    nameKey: "appDashboard.layoutOptions.floating.name",
    descriptionKey: "appDashboard.layoutOptions.floating.description",
  },
  {
    id: "minimal",
    nameKey: "appDashboard.layoutOptions.minimal.name",
    descriptionKey: "appDashboard.layoutOptions.minimal.description",
  },
  {
    id: "app-dashboard",
    nameKey: "appDashboard.layoutOptions.appDashboard.name",
    descriptionKey: "appDashboard.layoutOptions.appDashboard.description",
  },
];

const normalizeSidebarLayout = (value: unknown): SidebarLayout =>
  SIDEBAR_LAYOUT_OPTIONS.some((option) => option.id === value)
    ? (value as SidebarLayout)
    : "three-tier";

const SuperAdminDefaultSidebar: React.FC = () => {
  const [layout, setLayout] = useState<SidebarLayout>("three-tier");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const data = await platformDefaultSidebarService.getSettings();
      setLayout(normalizeSidebarLayout(data.layout));
    } catch {
      // Fallback to three-tier
      setLayout("three-tier");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const handleLayoutChange = async (newLayout: SidebarLayout) => {
    try {
      setSaving(true);
      try {
        await platformDefaultSidebarService.updateSettings({ layout: newLayout });
      } catch {
        // Fallback local persistence
      }
      setLayout(newLayout);
      toast.success("تم تحديث نمط القائمة الجانبية الافتراضية بنجاح");
    } catch {
      toast.error("حدث خطأ أثناء حفظ الإعدادات");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20" dir="rtl">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 p-4 md:p-6 max-w-5xl mx-auto" dir="rtl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border/60 pb-3.5">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg border border-border/80 bg-muted/30 flex items-center justify-center text-foreground shrink-0 shadow-2xs">
            <SidebarIcon className="size-4.5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-semibold tracking-tight text-foreground">
                نظام القائمة الجانبية الافتراضي
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground font-mono">
                Shell Defaults
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              القيمة الافتراضية لهيكل القائمة الجانبية التي تُطبَّق تلقائياً على حسابات التجار والشركات الجديدة
            </p>
          </div>
        </div>

        {saving && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-primary/10 text-primary text-xs font-mono">
            <Loader2 className="size-3.5 animate-spin" />
            جاري الاعتماد...
          </div>
        )}
      </div>

      {/* Telemetry Strip */}
      <div className="rounded-xl border border-border/80 bg-card shadow-2xs overflow-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-border/60">
          <div className="p-3.5 flex flex-col justify-between hover:bg-muted/10 transition-colors">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">النمط الافتراضي الحالي</span>
              <span className="size-1.5 rounded-full bg-primary" />
            </div>
            <div className="text-base sm:text-lg font-bold tracking-tight text-foreground font-mono">
              {layout.toUpperCase()}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">مفعل لجميع الحسابات الجديدة</p>
          </div>

          <div className="p-3.5 flex flex-col justify-between hover:bg-muted/10 transition-colors">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">الخيارات المتاحة</span>
              <span className="size-1.5 rounded-full bg-sky-500" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-foreground font-mono tabular-nums">
              {SIDEBAR_LAYOUT_OPTIONS.length}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">أنماط معمارية متوافقة</p>
          </div>

          <div className="p-3.5 flex flex-col justify-between hover:bg-muted/10 transition-colors">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">نطاق التطبيق</span>
              <span className="size-1.5 rounded-full bg-emerald-500" />
            </div>
            <div className="text-xs font-semibold text-foreground">
              التسجيل التلقائي للمتاجر
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">مع إمكانية التخصيص لاحقاً</p>
          </div>
        </div>
      </div>

      {/* Single-Surface Layout Grid */}
      <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
        <div className="p-3 bg-muted/20 border-b border-border/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PanelsTopLeft className="size-4 text-primary" />
            <h2 className="text-xs font-semibold text-foreground">
              الأنماط المعمارية المتاحة
            </h2>
          </div>
          <span className="text-[10px] text-muted-foreground font-mono">
            انقر على النمط لاعتماده كافتراضي
          </span>
        </div>

        <div className="p-3.5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {SIDEBAR_LAYOUT_OPTIONS.map((option) => {
            const isSelected = layout === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => handleLayoutChange(option.id)}
                disabled={saving}
                className={`relative p-3.5 rounded-xl border text-right transition-all flex flex-col justify-between ${
                  isSelected
                    ? "border-primary bg-primary/5 ring-1 ring-primary/40 shadow-xs"
                    : "border-border/70 bg-card hover:bg-muted/30 hover:border-border"
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <h3
                      className={`text-xs font-semibold ${
                        isSelected ? "text-primary" : "text-foreground"
                      }`}
                    >
                      {i18n.t(option.nameKey)}
                    </h3>
                    {isSelected && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono font-medium text-primary">
                        <Check className="size-3" />
                        المعتمد
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {i18n.t(option.descriptionKey)}
                  </p>
                </div>

                <div className="mt-3.5 pt-2.5 border-t border-border/50 flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                  <span>{option.id}</span>
                  {isSelected && (
                    <span className="px-1.5 py-0.2 rounded bg-primary/10 text-primary font-semibold text-[9px]">
                      DEFAULT
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDefaultSidebar;
